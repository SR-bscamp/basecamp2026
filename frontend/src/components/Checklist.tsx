import { useEffect, useRef, useState } from 'react'
import type { Checklist as ChecklistT } from '../api'
import { Ring } from './Ring'

interface Props {
  checklist: ChecklistT | null
  error?: string | null
  onRetry?: () => void
  onToggle: (id: string) => void
  flash: Set<string> // ids just ticked by the agent
}

export function Checklist({ checklist, error, onRetry, onToggle, flash }: Props) {
  if (error) return (
    <div className="card p-6 text-center">
      <p className="text-sm text-zinc-300 mb-1">Couldn't load your checklist</p>
      <p className="text-xs text-zinc-500 mb-4">{error}</p>
      <button onClick={onRetry} className="text-sm rounded-lg px-4 py-2 bg-accent text-zinc-950 font-medium hover:brightness-110">Retry</button>
    </div>
  )
  if (!checklist) return <ChecklistSkeleton />
  const all = checklist.groups.flatMap((g) => g.items)
  const done = all.filter((i) => i.done).length
  const pct = all.length ? done / all.length : 0
  const nextUp = all.find((i) => !i.done)

  return (
    <div className="flex flex-col gap-5">
      <div className="card p-6 relative overflow-hidden">
        <div className="absolute inset-0 glow opacity-60 pointer-events-none" />
        <div className="relative flex flex-col items-center">
          <Ring value={pct} size={168} stroke={13}>
            <div>
              <div className="text-4xl font-semibold tabular tracking-tight">{Math.round(pct * 100)}</div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-400 mt-0.5">Readiness</div>
            </div>
          </Ring>
          <p className="text-sm text-zinc-400 mt-4 tabular">{done} of {all.length} steps</p>
          {nextUp && (
            <p className="text-xs text-zinc-500 mt-1">Next up: <span className="text-zinc-200">{nextUp.title}</span></p>
          )}
        </div>
      </div>

      <div className="relative pl-5">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/10" />
        {checklist.groups.map((g) => <Group key={g.id} group={g} onToggle={onToggle} flash={flash} />)}
      </div>
    </div>
  )
}

function Group({ group, onToggle, flash }: { group: ChecklistT['groups'][number] } & Pick<Props, 'onToggle' | 'flash'>) {
  const complete = group.items.length > 0 && group.items.every((i) => i.done)
  const was = useRef(complete)
  const [celebrate, setCelebrate] = useState(false)
  useEffect(() => {
    if (complete && !was.current) {
      setCelebrate(true)
      const t = setTimeout(() => setCelebrate(false), 1900)
      was.current = complete
      return () => clearTimeout(t)
    }
    was.current = complete
  }, [complete])

  return (
    <section className="mb-5 last:mb-0">
      <div className="flex items-center gap-2 mb-2 -ml-5">
        <span className={`w-[15px] h-[15px] rounded-full border-2 transition-colors ${
          complete ? 'bg-accent border-accent' : 'bg-zinc-950 border-white/25'
        } ${celebrate ? 'animate-pulse-ring' : ''}`} />
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{group.title}</h3>
        {celebrate && <span className="text-xs text-accent animate-rise">Complete ✦</span>}
      </div>
      <ul className="flex flex-col gap-1">
        {group.items.map((it) => (
          <li key={it.id}>
            <div className={`group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-white/[0.04] ${
              flash.has(it.id) ? 'bg-accent-soft' : ''
            }`}>
              <button onClick={() => onToggle(it.id)} aria-label={`${it.done ? 'Untick' : 'Tick'} ${it.title}`}
                className={`shrink-0 w-5 h-5 rounded-md border grid place-items-center text-[11px] transition ${
                  it.done ? 'bg-accent border-accent text-zinc-950 animate-pop' : 'border-white/25 hover:border-accent'
                }`}>
                {it.done ? '✓' : ''}
              </button>
              <span className={`flex-1 text-sm transition-colors ${it.done ? 'text-zinc-500 line-through decoration-zinc-600' : ''}`}>
                {it.title}
              </span>
              <span className="text-[10px] font-mono text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-28"
                title={it.doc}>{it.doc}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ChecklistSkeleton() {
  return (
    <div className="flex flex-col gap-5 animate-pulse">
      <div className="card h-64" />
      {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-white/[0.03]" />)}
    </div>
  )
}
