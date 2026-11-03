import { FileText, RotateCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Checklist as ChecklistT, ChecklistGroup } from '../api'
import type { DeptInfo } from '../depts'
import { Terrain } from './Terrain'

interface Props {
  checklist: ChecklistT | null
  info: DeptInfo
  role: string
  error?: string | null
  onRetry?: () => void
  onToggle: (id: string) => void
  onOpenDoc: (doc: string) => void
  flash: Set<string> // ids just ticked by the agent
}

/** The onboarding checklist drawn as a route: one hero number, then waypoints on a trail. */
export function Checklist({ checklist, info, role, error, onRetry, onToggle, onOpenDoc, flash }: Props) {
  const all = checklist?.groups.flatMap((g) => g.items) ?? []
  const done = all.filter((i) => i.done).length
  const pct = all.length ? Math.round((done / all.length) * 100) : 0
  const ready = all.length > 0 && done === all.length

  return (
    <div className="flex flex-col">
      <div className="relative overflow-hidden border-b rule px-6 pt-7 pb-6">
        <Terrain kind={info.terrain} color={info.accent} opacity={0.22} />
        <div className="relative">
          <p className="eyebrow">{info.name} · {role}</p>
          <div className="flex items-end gap-3 mt-3">
            <span className="display text-[7.5rem] tabular text-ink transition-all">{checklist ? pct : '–'}</span>
            <span className="display text-5xl text-ink-3 mb-2">%</span>
            {ready && (
              <span className="animate-stamp ml-auto mb-6 border-2 border-accent text-accent px-3 py-1 font-mono text-sm uppercase tracking-[0.2em]">
                Ready
              </span>
            )}
          </div>
          <p className="text-ink-2 -mt-1">of the way to ready{checklist && <span className="text-ink-3"> · {done} of {all.length} stops</span>}</p>
          <div className="mt-4 h-[3px] bg-ink/10">
            <div className="h-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {error ? (
        <div className="px-6 py-8">
          <p className="font-medium">Couldn't load your route.</p>
          <p className="text-sm text-ink-3 mt-1 mb-4">{error}</p>
          <button onClick={onRetry} className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2 text-sm hover:bg-accent">
            <RotateCw size={14} /> Retry
          </button>
        </div>
      ) : !checklist ? (
        <div className="px-6 py-6 flex flex-col gap-3">
          {[60, 80, 70, 50, 75].map((w, i) => <div key={i} className="skeleton h-5" style={{ width: `${w}%` }} />)}
        </div>
      ) : (
        <div className="relative px-6 py-6">
          <div className="absolute left-[33px] top-9 bottom-9 border-l border-dashed border-ink/30" />
          {checklist.groups.map((g) => (
            <Waypoint key={g.id} group={g} onToggle={onToggle} onOpenDoc={onOpenDoc} flash={flash} />
          ))}
        </div>
      )}
    </div>
  )
}

function Waypoint({ group, onToggle, onOpenDoc, flash }: { group: ChecklistGroup } & Pick<Props, 'onToggle' | 'onOpenDoc' | 'flash'>) {
  const complete = group.items.length > 0 && group.items.every((i) => i.done)
  const was = useRef(complete)
  const [justReached, setJustReached] = useState(false)
  useEffect(() => {
    const reached = complete && !was.current
    was.current = complete
    if (!reached) return
    setJustReached(true)
    const t = setTimeout(() => setJustReached(false), 2400)
    return () => clearTimeout(t)
  }, [complete])

  return (
    <section className="relative mb-6 last:mb-0">
      <div className="flex items-center gap-3 mb-2">
        <span className={`relative z-10 w-[19px] h-[19px] rounded-full border-[1.5px] grid place-items-center bg-paper transition-colors ${
          complete ? 'border-accent bg-accent' : 'border-ink/50'
        }`}>
          {complete && <span className="w-1.5 h-1.5 rounded-full bg-paper" />}
        </span>
        <h3 className="display text-[1.7rem]">{group.title}</h3>
        {complete && (
          <span className={`${justReached ? 'animate-stamp' : '-rotate-[8deg]'} ml-1 border border-accent text-accent px-1.5 font-mono text-[10px] uppercase tracking-[0.18em]`}>
            Reached
          </span>
        )}
      </div>
      <ul className="pl-8">
        {group.items.map((it) => {
          const byCompass = flash.has(it.id)
          return (
            <li key={it.id} className={`group flex items-start gap-3 py-1.5 transition-colors ${byCompass ? 'bg-accent-wash -mx-2 px-2' : ''}`}>
              <button onClick={() => onToggle(it.id)} aria-label={`${it.done ? 'Untick' : 'Tick'} ${it.title}`} aria-pressed={it.done}
                className={`shrink-0 mt-0.5 w-[18px] h-[18px] border-[1.5px] grid place-items-center transition-colors ${
                  it.done ? 'border-accent bg-accent text-paper' : 'border-ink/50 hover:border-accent'
                }`}>
                {it.done && (
                  <svg viewBox="0 0 16 16" className="w-3 h-3"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" className="animate-draw" style={{ '--len': 16 } as React.CSSProperties} /></svg>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <span className={`text-[15px] leading-snug ${it.done ? 'struck text-ink-3' : ''}`}>{it.title}</span>
                {byCompass && <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-accent animate-rise">Ticked by Compass</span>}
              </div>
              <button onClick={() => onOpenDoc(it.doc)} title={`Open ${it.doc}`}
                className="shrink-0 text-ink-3 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-accent transition-opacity">
                <FileText size={15} strokeWidth={1.6} />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
