import type { Usage } from '../api'
import { MODELS, fmtCents, modelLabel } from '../depts'

interface Props {
  open: boolean
  onClose: () => void
  history: Usage[]
  model: string | null
  defaultModel: string
  onModel: (m: string | null) => void
}

export function UnderTheHood({ open, onClose, history, model, defaultModel, onModel }: Props) {
  const last = history.at(-1)
  const total = history.reduce((s, u) => s + u.cost_usd, 0)
  const prompt = last ? last.input_tokens + last.cache_read_tokens + last.cache_write_tokens : 0
  const cacheShare = last && prompt ? last.cache_read_tokens / prompt : 0
  const maxCost = Math.max(...history.map((u) => u.cost_usd), 1e-9)
  const maxLat = Math.max(...history.map((u) => u.latency_ms), 1)

  return (
    <>
      <div onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
      <aside aria-label="Under the hood" aria-hidden={!open}
        className={`fixed top-0 right-0 z-40 h-full w-[380px] max-w-full bg-zinc-900 border-l border-white/10 shadow-2xl
          transition-transform duration-300 ease-out overflow-y-auto ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Under the hood</h2>
            <button onClick={onClose} className="text-zinc-400 hover:text-white" aria-label="Close">✕</button>
          </div>

          <section>
            <Label>Model</Label>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-zinc-950 border border-white/10">
              {[{ id: null, label: 'Default' }, ...MODELS].map((m) => (
                <button key={m.id ?? 'default'} onClick={() => onModel(m.id)}
                  className={`rounded-lg py-1.5 text-xs font-medium transition ${
                    model === m.id ? 'bg-accent text-zinc-950' : 'text-zinc-400 hover:text-white'
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              {model ? `Next answers use ${modelLabel(model)}.` : `Backend default: ${modelLabel(defaultModel)}.`}
            </p>
          </section>

          {!last ? (
            <p className="text-sm text-zinc-500">Ask a question to see tokens, cache hits, cost and latency.</p>
          ) : (
            <>
              <section className="grid grid-cols-2 gap-3">
                <Stat label="Cost this answer" value={fmtCents(last.cost_usd)} />
                <Stat label="Latency" value={`${(last.latency_ms / 1000).toFixed(2)}s`} />
                <Stat label="Session total" value={fmtCents(total)} sub={`${history.length} answers`} />
                <Stat label="Model" value={modelLabel(last.model)} small />
              </section>

              <section>
                <div className="flex justify-between items-baseline">
                  <Label>Prompt cache</Label>
                  <span className="text-sm font-semibold tabular text-accent">{Math.round(cacheShare * 100)}% cached</span>
                </div>
                <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden flex">
                  <div className="bg-accent transition-all duration-700" style={{ width: `${cacheShare * 100}%` }} />
                  <div className="bg-white/25 transition-all duration-700"
                    style={{ width: `${prompt ? (last.cache_write_tokens / prompt) * 100 : 0}%` }} />
                </div>
                <div className="flex gap-4 mt-2 text-[11px] text-zinc-400 tabular">
                  <Legend c="bg-accent" t={`read ${last.cache_read_tokens.toLocaleString()}`} />
                  <Legend c="bg-white/25" t={`write ${last.cache_write_tokens.toLocaleString()}`} />
                  <Legend c="bg-white/[0.06]" t={`fresh ${last.input_tokens.toLocaleString()}`} />
                </div>
              </section>

              <section>
                <Label>Tokens</Label>
                <dl className="grid grid-cols-2 gap-y-1 text-sm tabular">
                  <dt className="text-zinc-400">Input</dt><dd className="text-right font-mono">{last.input_tokens.toLocaleString()}</dd>
                  <dt className="text-zinc-400">Output</dt><dd className="text-right font-mono">{last.output_tokens.toLocaleString()}</dd>
                  <dt className="text-zinc-400">Cache read</dt><dd className="text-right font-mono">{last.cache_read_tokens.toLocaleString()}</dd>
                  <dt className="text-zinc-400">Cache write</dt><dd className="text-right font-mono">{last.cache_write_tokens.toLocaleString()}</dd>
                </dl>
              </section>

              <section>
                <Label>Per answer · cost (bar) and latency (dot)</Label>
                <div className="flex items-end gap-1.5 h-24 border-b border-white/10">
                  {history.slice(-14).map((u, i) => (
                    <div key={i} className="w-5 relative h-full flex items-end" title={`${modelLabel(u.model)} · ${fmtCents(u.cost_usd)} · ${u.latency_ms}ms`}>
                      <div className="w-full rounded-t bg-accent/70 transition-all" style={{ height: `${(u.cost_usd / maxCost) * 100}%` }} />
                      <div className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white"
                        style={{ bottom: `calc(${(u.latency_ms / maxLat) * 100}% - 3px)` }} />
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-semibold mb-2">{children}</h3>
)
const Legend = ({ c, t }: { c: string; t: string }) => (
  <span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-sm ${c}`} />{t}</span>
)
function Stat({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <div className="rounded-xl bg-white/[0.035] border border-white/[0.06] p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`${small ? 'text-sm mt-1.5' : 'text-2xl'} font-semibold tabular tracking-tight`}>{value}</div>
      {sub && <div className="text-[11px] text-zinc-500">{sub}</div>}
    </div>
  )
}
