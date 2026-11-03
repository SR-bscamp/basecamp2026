import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import type { Dept } from '../api'
import { DEPTS } from '../depts'
import { Terrain } from './Terrain'

export function DeptPicker({ onPick }: { onPick: (d: Dept, role: string) => void }) {
  const [roles, setRoles] = useState<Record<string, string>>({})
  return (
    <div className="min-h-full flex flex-col">
      <header className="px-6 sm:px-12 pt-12 pb-10 max-w-[1400px] w-full mx-auto animate-rise">
        <p className="eyebrow mb-6">Northwind Advisory · New-joiner atlas · Plate I</p>
        <h1 className="display text-[clamp(3.5rem,9vw,8.5rem)]">
          Where are you<br /><em className="italic">headed?</em>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-2 leading-relaxed">
          Choose your territory. Compass knows its playbook, cites its sources and can read a screenshot of whatever is in front of you.
        </p>
      </header>

      <div className="flex-1 grid sm:grid-cols-2 border-t rule max-w-[1400px] w-full mx-auto">
        {DEPTS.map((d, i) => {
          const role = roles[d.id] ?? d.roles[0]
          return (
            <section key={d.id} style={{ '--accent': d.accent, animationDelay: `${120 + i * 70}ms` } as React.CSSProperties}
              className={`group relative overflow-hidden px-6 sm:px-10 py-9 border-b rule animate-rise ${i % 2 === 0 ? 'sm:border-r' : ''}`}>
              <Terrain kind={d.terrain} color={d.accent} opacity={0.16} className="transition-opacity duration-500 group-hover:opacity-50" />
              <div className="relative flex flex-col h-full min-h-56">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, '0')}</span>
                  <span className="eyebrow">{d.terrain === 'circuit' ? 'Systems' : d.terrain === 'contours' ? 'People' : d.terrain === 'survey' ? 'Engagements' : 'Ledgers'}</span>
                </div>
                <h2 className="display text-6xl sm:text-7xl mt-6 text-ink group-hover:text-accent transition-colors">{d.short}</h2>
                <p className="text-ink-2 mt-3 max-w-sm">{d.pitch}</p>
                <div className="mt-auto pt-8 flex items-center gap-3">
                  <label className="sr-only" htmlFor={`role-${d.id}`}>{d.name} role</label>
                  <select id={`role-${d.id}`} value={role} onChange={(e) => setRoles({ ...roles, [d.id]: e.target.value })}
                    className="bg-transparent border-b border-ink/30 py-1.5 pr-6 text-sm focus:outline-none focus:border-accent cursor-pointer">
                    {d.roles.map((r) => <option key={r}>{r}</option>)}
                  </select>
                  <button onClick={() => onPick(d.id, role)}
                    className="ml-auto inline-flex items-center gap-2 bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors active:translate-y-px">
                    Begin route <ArrowRight size={16} strokeWidth={1.75} className="transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
