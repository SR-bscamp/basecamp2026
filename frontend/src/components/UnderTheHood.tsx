import { X } from 'lucide-react'
import type { ToolCall, Usage } from '../api'
import { MODELS, fmtCents, modelLabel } from '../depts'

interface Props {
  open: boolean
  onClose: () => void
  history: Usage[]
  lastTools: ToolCall[]
  model: string | null
  defaultModel: string
  onModel: (m: string | null) => void
  mock: boolean
  onMock: (m: boolean) => void
  showMock: boolean
}

export function UnderTheHood({ open, onClose, history, lastTools, model, defaultModel, onModel, mock, onMock, showMock }: Props) {
  const last = history.at(-1)
  const total = history.reduce((s, u) => s + u.cost_usd, 0)
  const prompt = last ? last.input_tokens + last.cache_read_tokens + last.cache_write_tokens : 0
  const cacheShare = last && prompt ? last.cache_read_tokens / prompt : 0
  const maxCost = Math.max(...history.map((u) => u.cost_usd), 1e-9)

  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 z-30 bg-ink/20 transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
      <aside aria-label="Under the hood" aria-hidden={!open}
        className={`fixed top-0 right-0 z-40 h-full w-[420px] max-w-full bg-ink text-paper transition-transform duration-300 ease-out overflow-y-auto ${
          open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="px-7 py-7 flex flex-col gap-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-paper/50">Instrument panel</p>
              <h2 className="display text-5xl mt-1">Under the hood</h2>
            </div>
            <button onClick={onClose} className="p-1 text-paper/60 hover:text-paper" aria-label="Close"><X size={20} /></button>
          </div>

          <section>
            <Label>Model for the next answer</Label>
            <div className="grid grid-cols-4 border border-paper/25">
              {[{ id: null, label: 'Default' }, ...MODELS].map((m, i) => (
                <button key={m.id ?? 'default'} onClick={() => onModel(m.id)}
                  className={`py-2 text-xs font-medium transition-colors ${i > 0 ? 'border-l border-paper/25' : ''} ${
                    model === m.id ? 'bg-paper text-ink' : 'text-paper/70 hover:text-paper'}`}>
                  {m.label}
                </button>
              ))}
            </div>
            <p className="font-mono text-[11px] text-paper/50 mt-2">
              {model ? `Using ${modelLabel(model)}` : `Backend default · ${modelLabel(defaultModel)}`}
            </p>
            {showMock && (
              <label className="mt-4 flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={mock} onChange={(e) => onMock(e.target.checked)} className="mt-1 accent-[var(--accent)]" />
                <span className="text-sm">Mock answers
                  <span className="block text-xs text-paper/50">Demo fallback: the backend returns the fixture answer (?mock=1) instead of calling the model.</span>
                </span>
              </label>
            )}
          </section>

          {!last ? (
            <p className="text-paper/60">Ask something. Tokens, cache hits, cost and latency for every answer appear here.</p>
          ) : (
            <>
              <section className="grid grid-cols-2 gap-px bg-paper/15 border border-paper/15">
                <Stat label="This answer" value={fmtCents(last.cost_usd)} />
                <Stat label="Latency" value={`${(last.latency_ms / 1000).toFixed(2)}s`} />
                <Stat label="Session" value={fmtCents(total)} sub={`${history.length} answer${history.length > 1 ? 's' : ''}`} />
                <Stat label="Model" value={modelLabel(last.model)} small />
              </section>

              <section>
                <div className="flex justify-between items-baseline">
                  <Label>Prompt cache</Label>
                  <span className="display text-4xl tabular">{Math.round(cacheShare * 100)}<span className="text-xl text-paper/50">% read from cache</span></span>
                </div>
                <div className="h-2.5 mt-2 bg-paper/10 flex">
                  <div className="bg-accent transition-all duration-700" style={{ width: `${cacheShare * 100}%` }} />
                  <div className="bg-paper/40 transition-all duration-700" style={{ width: `${prompt ? (last.cache_write_tokens / prompt) * 100 : 0}%` }} />
                </div>
                <dl className="grid grid-cols-2 gap-y-1.5 mt-4 font-mono text-[13px] tabular">
                  <dt className="text-paper/55">Cache read</dt><dd className="text-right">{last.cache_read_tokens.toLocaleString()}</dd>
                  <dt className="text-paper/55">Cache write</dt><dd className="text-right">{last.cache_write_tokens.toLocaleString()}</dd>
                  <dt className="text-paper/55">Fresh input</dt><dd className="text-right">{last.input_tokens.toLocaleString()}</dd>
                  <dt className="text-paper/55">Output</dt><dd className="text-right">{last.output_tokens.toLocaleString()}</dd>
                </dl>
              </section>

              {lastTools.length > 0 && (
                <section>
                  <Label>Tool calls, last answer</Label>
                  <ul className="font-mono text-[12px] flex flex-col gap-1.5">
                    {lastTools.map((t, i) => (
                      <li key={i} className="flex gap-2">
                        <span className={t.ok === false ? 'text-paper/40' : 'text-accent'}>{t.ok === false ? '✕' : '→'}</span>
                        <span className="break-all"><span className="text-paper">{t.name}</span><span className="text-paper/50">({JSON.stringify(t.input)})</span></span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <Label>Cost per answer</Label>
                <div className="flex items-end gap-2 h-24 border-b border-paper/25">
                  {history.slice(-12).map((u, i) => (
                    <div key={i} className="w-6 flex flex-col items-center justify-end h-full" title={`${modelLabel(u.model)} · ${fmtCents(u.cost_usd)} · ${u.latency_ms}ms`}>
                      <div className="w-full bg-accent transition-all" style={{ height: `${Math.max(3, (u.cost_usd / maxCost) * 100)}%` }} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-1">
                  {history.slice(-12).map((u, i) => (
                    <span key={i} className="w-6 text-center font-mono text-[9px] text-paper/50">{modelLabel(u.model).split(' ')[0].slice(0, 2)}</span>
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
  <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-paper/50 mb-3">{children}</h3>
)
function Stat({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <div className="bg-ink p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/50">{label}</div>
      <div className={`${small ? 'text-lg mt-2' : 'display text-4xl mt-1'} tabular`}>{value}</div>
      {sub && <div className="font-mono text-[11px] text-paper/50 mt-0.5">{sub}</div>}
    </div>
  )
}
