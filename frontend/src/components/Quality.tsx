import { Fragment, useEffect, useState } from 'react'
import { getEvals, type EvalResults } from '../api'
import { DEPTS, deptById, fmtCents, fmtPct, modelLabel } from '../depts'
import { Ring } from './Ring'
import { useToast } from './Toast'

const VARIANT_COLOR = ['#71717a', 'var(--accent)', '#f87171']

export function Quality() {
  const [data, setData] = useState<EvalResults | null>(null)
  const [openTask, setOpenTask] = useState<string | null>(null)
  const toast = useToast()

  useEffect(() => {
    getEvals().then(setData).catch((e: Error) => toast(e.message))
  }, [toast])

  if (!data) return <div className="max-w-6xl mx-auto p-8 grid gap-4 animate-pulse">{[0, 1, 2].map((i) => <div key={i} className="card h-40" />)}</div>

  // Best value = highest pass rate per dollar (the team rule in CLAUDE.md).
  const best = [...data.model_comparison].sort((a, b) => b.pass_rate / b.avg_cost_usd - a.pass_rate / a.avg_cost_usd)[0]
  const maxCost = Math.max(...data.model_comparison.map((m) => m.avg_cost_usd))
  const totalTasks = data.by_department.reduce((s, d) => s + d.total, 0)

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Quality</h1>
          <p className="text-zinc-400 text-sm mt-1 tabular">
            {totalTasks} tasks · {data.runs} run{data.runs === 1 ? '' : 's'} each · judged on {modelLabel(data.model)} ·{' '}
            {new Date(data.generated_at).toLocaleString()}
          </p>
        </div>
        {data._fixture && (
          <span className="ml-auto text-xs font-semibold uppercase tracking-wider rounded-full px-3 py-1 bg-amber-400/15 text-amber-300 border border-amber-400/30">
            Sample data · not a real run
          </span>
        )}
      </header>

      <section className="grid sm:grid-cols-3 gap-4">
        {data.variants.map((v, i) => (
          <div key={v.label} className="card p-5 flex items-center gap-5">
            <Ring value={v.pass_rate} size={88} stroke={9} color={VARIANT_COLOR[i] ?? 'var(--accent)'}>
              <span className="text-xl font-semibold tabular">{fmtPct(v.pass_rate)}</span>
            </Ring>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Prompt</div>
              <div className="font-medium capitalize">{v.label}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-4">Model comparison <span className="text-zinc-500 font-normal text-sm">· same tasks, same prompt · pass rate · avg cost per answer · p50 latency</span></h2>
        <div className="flex flex-col gap-3">
          {data.model_comparison.map((m) => {
            const isBest = m === best
            return (
              <div key={m.model} className={`grid grid-cols-[130px_1fr_90px_80px] items-center gap-4 rounded-xl px-3 py-2.5 ${isBest ? 'bg-accent-soft ring-1 ring-accent/40' : ''}`}>
                <div className="font-medium text-sm">
                  {modelLabel(m.model)}
                  {isBest && <div className="text-[10px] uppercase tracking-wider text-accent font-semibold">Best pass rate per $</div>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-accent" style={{ width: fmtPct(m.pass_rate) }} />
                  </div>
                  <span className="text-sm tabular w-10 text-right">{fmtPct(m.pass_rate)}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm tabular font-mono">{fmtCents(m.avg_cost_usd)}</div>
                  <div className="h-1 mt-1 rounded bg-white/[0.06]"><div className="h-full rounded bg-zinc-400" style={{ width: `${(m.avg_cost_usd / maxCost) * 100}%` }} /></div>
                </div>
                <div className="text-right text-sm tabular text-zinc-400">{(m.p50_latency_ms / 1000).toFixed(1)}s p50</div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <section className="card p-5">
          <h2 className="font-semibold mb-4">By department</h2>
          <div className="flex flex-col gap-4">
            {data.by_department.map((d) => {
              const info = DEPTS.find((x) => x.id === d.dept)
              return (
                <div key={d.dept} className="flex items-center gap-3">
                  <Ring value={d.total ? d.passed / d.total : 0} size={44} stroke={5} color={info?.accent}>
                    <span className="text-[10px] tabular">{d.total ? fmtPct(d.passed / d.total) : '—'}</span>
                  </Ring>
                  <div className="text-sm">
                    <div>{info?.name ?? d.dept}</div>
                    <div className="text-zinc-500 text-xs tabular">{d.passed}/{d.total} passed</div>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-zinc-500 mt-5 pt-4 border-t border-white/10 tabular">
            LLM judge agreed with {data.judge_validation.agreement}/{data.judge_validation.labelled} hand labels
          </p>
        </section>

        <section className="card p-5 overflow-x-auto">
          <h2 className="font-semibold mb-3">Tasks</h2>
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-zinc-500 text-left">
              <tr><th className="py-2 font-medium">Task</th><th className="font-medium">Dept</th><th className="font-medium text-right">Pass rate</th><th /></tr>
            </thead>
            <tbody>
              {data.tasks.map((t) => (
                <Fragment key={t.id}>
                  <tr onClick={() => setOpenTask(openTask === t.id ? null : t.id)}
                    className="border-t border-white/[0.06] cursor-pointer hover:bg-white/[0.03]">
                    <td className="py-2.5 font-mono text-xs">{t.id}</td>
                    <td><span className="text-xs" style={{ color: DEPTS.find((d) => d.id === t.dept)?.accent }}>{deptById(t.dept)?.short ?? t.dept}</span></td>
                    <td className={`text-right tabular ${t.pass_rate === 1 ? 'text-emerald-300' : t.pass_rate === 0 ? 'text-red-300' : 'text-amber-300'}`}>{fmtPct(t.pass_rate)}</td>
                    <td className="text-right pl-3 w-24">
                      {t.flaky && <span className="text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 bg-amber-400/15 text-amber-300">flaky</span>}
                      <span className="text-zinc-500 ml-2">{openTask === t.id ? '▾' : '▸'}</span>
                    </td>
                  </tr>
                  {openTask === t.id && (
                    <tr><td colSpan={4} className="pb-3">
                      <ul className="flex flex-col gap-1 animate-rise">
                        {t.checks.map((c, i) => (
                          <li key={i} className="flex gap-2 text-xs rounded-lg bg-white/[0.03] px-3 py-1.5">
                            <span className={c.pass ? 'text-emerald-400' : 'text-red-400'}>{c.pass ? '✓' : '✕'}</span>
                            <span className="font-mono text-zinc-400">{c.type}</span>
                            <span className="text-zinc-300">{c.reason}</span>
                          </li>
                        ))}
                      </ul>
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}
