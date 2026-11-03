import { ChevronDown, ChevronRight } from 'lucide-react'
import { Fragment, useEffect, useState } from 'react'
import { getEvals, type EvalResults } from '../api'
import { DEPTS, fmtCents, fmtPct, modelLabel } from '../depts'
import { useToast } from './Toast'

export function Quality() {
  const [data, setData] = useState<EvalResults | null>(null)
  const [openTask, setOpenTask] = useState<string | null>(null)
  const toast = useToast()

  useEffect(() => { getEvals().then(setData).catch((e: Error) => toast(e.message)) }, [toast])

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto px-6 sm:px-12 py-12 flex flex-col gap-6">
        <div className="skeleton h-40 w-2/3" />
        <div className="skeleton h-64" />
      </div>
    )
  }

  const v = (label: string) => data.variants.find((x) => x.label.toLowerCase().includes(label))
  const naive = v('naive'), final = v('final'), bad = v('bad')
  const best = [...data.model_comparison].sort((a, b) => b.pass_rate / b.avg_cost_usd - a.pass_rate / a.avg_cost_usd)[0]
  const totalTasks = data.by_department.reduce((s, d) => s + d.total, 0)

  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-12 py-10 animate-rise">
      <header className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b-[1.5px] border-ink pb-3">
        <p className="eyebrow">Quality report · Plate II</p>
        <p className="font-mono text-[11px] text-ink-3 tabular">
          {totalTasks} tasks · {data.runs} run{data.runs === 1 ? '' : 's'} each · {modelLabel(data.model)} · {new Date(data.generated_at).toLocaleDateString()}
        </p>
        {data._fixture && (
          <span className="ml-auto -rotate-2 border-2 border-[#B42318] text-[#B42318] px-2.5 py-0.5 font-mono text-xs uppercase tracking-[0.18em]">
            Sample data · not a real run
          </span>
        )}
      </header>

      {/* Hero: the final prompt's pass rate, and how far it came */}
      <section className="grid lg:grid-cols-[1.1fr_1fr] gap-10 py-10 border-b rule">
        <div>
          <p className="text-ink-2 text-lg">With the final prompt, Compass passes</p>
          <p className="display text-[clamp(7rem,16vw,13rem)] tabular leading-[0.85] mt-2">{final ? fmtPct(final.pass_rate) : '–'}</p>
          <p className="text-ink-2 text-lg mt-3 max-w-md">
            of graded checks{naive && <>, up from <strong className="text-ink">{fmtPct(naive.pass_rate)}</strong> with a naive prompt</>}.
            {bad && <> A deliberately bad prompt scores <strong className="text-[#B42318]">{fmtPct(bad.pass_rate)}</strong>, so the eval can fail.</>}
          </p>
        </div>
        <Slope variants={data.variants} />
      </section>

      {/* Model comparison */}
      <section className="py-10 border-b rule">
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
          <h2 className="display text-5xl">Which model?</h2>
          <p className="text-ink-2 max-w-md">Same tasks, same prompt. The pick is the best pass rate per dollar: <strong className="text-ink">{modelLabel(best.model)}</strong>.</p>
        </div>
        <ModelPlot rows={data.model_comparison} best={best.model} />
        <table className="w-full mt-6 text-sm tabular">
          <thead>
            <tr className="eyebrow text-left border-b rule">
              <th className="py-2 font-normal">Model</th><th className="font-normal text-right">Pass rate</th>
              <th className="font-normal text-right">Avg cost / answer</th><th className="font-normal text-right">p50 latency</th>
            </tr>
          </thead>
          <tbody>
            {data.model_comparison.map((m) => (
              <tr key={m.model} className={`border-b rule ${m.model === best.model ? 'bg-accent-wash' : ''}`}>
                <td className="py-2.5 font-medium">{modelLabel(m.model)}{m.model === best.model && <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">Best value</span>}</td>
                <td className="text-right">{fmtPct(m.pass_rate)}</td>
                <td className="text-right font-mono">{fmtCents(m.avg_cost_usd)}</td>
                <td className="text-right font-mono">{(m.p50_latency_ms / 1000).toFixed(1)}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid lg:grid-cols-[300px_1fr] gap-12 py-10">
        <section>
          <h2 className="display text-4xl mb-5">By territory</h2>
          <ul className="flex flex-col gap-4">
            {data.by_department.map((d) => {
              const info = DEPTS.find((x) => x.id === d.dept)
              const r = d.total ? d.passed / d.total : 0
              return (
                <li key={d.dept}>
                  <div className="flex items-baseline justify-between">
                    <span>{info?.short ?? d.dept}</span>
                    <span className="font-mono text-xs tabular text-ink-2">{d.passed}/{d.total}</span>
                  </div>
                  <div className="h-[5px] bg-ink/10 mt-1.5"><div className="h-full" style={{ width: `${r * 100}%`, background: info?.accent ?? '#14120F' }} /></div>
                </li>
              )
            })}
          </ul>
          <p className="mt-8 pt-4 border-t rule text-sm text-ink-2">
            The LLM judge agreed with <strong className="text-ink tabular">{data.judge_validation.agreement} of {data.judge_validation.labelled}</strong> hand-labelled answers before we trusted it.
          </p>
        </section>

        <section>
          <h2 className="display text-4xl mb-5">Every task</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="eyebrow text-left border-b-[1.5px] border-ink">
                <th className="py-2 font-normal">Task</th><th className="font-normal">Territory</th><th className="font-normal text-right">Pass rate</th><th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {data.tasks.map((t) => {
                const info = DEPTS.find((d) => d.id === t.dept)
                const isOpen = openTask === t.id
                return (
                  <Fragment key={t.id}>
                    <tr onClick={() => setOpenTask(isOpen ? null : t.id)} className="border-b rule cursor-pointer hover:bg-paper-2/60">
                      <td className="py-2.5 font-mono text-xs">{t.id}{t.flaky && <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-[#B45309]">flaky</span>}</td>
                      <td style={{ color: info?.accent }}>{info?.short ?? t.dept}</td>
                      <td className={`text-right tabular font-mono ${t.pass_rate === 1 ? '' : t.pass_rate === 0 ? 'text-[#B42318]' : 'text-[#B45309]'}`}>{fmtPct(t.pass_rate)}</td>
                      <td className="text-right text-ink-3">{isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b rule"><td colSpan={4} className="py-3">
                        <ul className="flex flex-col gap-1.5 animate-rise">
                          {t.checks.map((c, i) => (
                            <li key={i} className="flex gap-3 text-xs">
                              <span className={`font-mono w-10 ${c.pass ? 'text-ink' : 'text-[#B42318]'}`}>{c.pass ? 'PASS' : 'FAIL'}</span>
                              <span className="font-mono text-ink-3 w-44 shrink-0">{c.type}</span>
                              <span className="text-ink-2">{c.reason}</span>
                            </li>
                          ))}
                        </ul>
                      </td></tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}

/** Slope-style bars: each prompt variant's pass rate on one shared scale. */
function Slope({ variants }: { variants: EvalResults['variants'] }) {
  return (
    <div className="flex items-end gap-6 h-72 border-b-[1.5px] border-ink pl-2">
      {variants.map((v) => {
        const isBad = /bad/i.test(v.label), isFinal = /final/i.test(v.label)
        return (
          <div key={v.label} className="flex-1 flex flex-col justify-end h-full">
            <span className={`display text-4xl tabular mb-2 ${isBad ? 'text-[#B42318]' : ''}`}>{fmtPct(v.pass_rate)}</span>
            <div className="w-full transition-all duration-700"
              style={{ height: `${v.pass_rate * 100}%`, background: isFinal ? 'var(--accent)' : isBad ? 'repeating-linear-gradient(135deg,#B42318 0 2px,transparent 2px 7px)' : 'rgba(20,18,15,0.18)' }} />
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2 mt-2 h-8">{v.label}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Cost (log scale) against pass rate: up and to the left is better. */
function ModelPlot({ rows, best }: { rows: EvalResults['model_comparison']; best: string }) {
  const W = 1000, H = 260, P = { l: 56, r: 24, t: 20, b: 40 }
  const costs = rows.map((r) => r.avg_cost_usd)
  const lo = Math.log10(Math.min(...costs) / 1.6), hi = Math.log10(Math.max(...costs) * 1.6)
  const rates = rows.map((r) => r.pass_rate)
  const ylo = Math.max(0, Math.floor((Math.min(...rates) - 0.05) * 20) / 20), yhi = Math.min(1, Math.max(...rates) + 0.03)
  const x = (c: number) => P.l + ((Math.log10(c) - lo) / (hi - lo)) * (W - P.l - P.r)
  const y = (r: number) => P.t + (1 - (r - ylo) / (yhi - ylo || 1)) * (H - P.t - P.b)
  const yTicks = [ylo, (ylo + yhi) / 2, yhi]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Pass rate against average cost per answer, per model">
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="rgba(20,18,15,0.12)" />
          <text x={P.l - 10} y={y(t) + 4} textAnchor="end" className="fill-ink-3 font-mono" fontSize="12">{fmtPct(t)}</text>
        </g>
      ))}
      <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} stroke="#14120F" strokeWidth="1.5" />
      <text x={P.l} y={H - 12} className="fill-ink-3 font-mono" fontSize="12">cheaper ←  avg cost per answer (log)  → pricier</text>
      {rows.map((r) => {
        const isBest = r.model === best
        return (
          <g key={r.model}>
            <circle cx={x(r.avg_cost_usd)} cy={y(r.pass_rate)} r={isBest ? 9 : 6} fill={isBest ? 'var(--accent)' : '#F3EFE6'} stroke="#14120F" strokeWidth="1.5" />
            <text x={x(r.avg_cost_usd) + 14} y={y(r.pass_rate) + 5} fontSize="15" className={isBest ? 'fill-ink font-semibold' : 'fill-ink-2'}>
              {modelLabel(r.model)} <tspan className="font-mono" fontSize="12" fill="#8A8377">{fmtCents(r.avg_cost_usd)}</tspan>
            </text>
          </g>
        )
      })}
    </svg>
  )
}
