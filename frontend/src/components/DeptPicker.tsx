import { useState } from 'react'
import type { Dept } from '../api'
import { DEPTS } from '../depts'

export function DeptPicker({ onPick }: { onPick: (d: Dept, role: string) => void }) {
  const [roles, setRoles] = useState<Record<string, string>>({})
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="text-center mb-12 animate-rise">
        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-3">Northwind Advisory · Onboarding</p>
        <h1 className="text-5xl font-semibold tracking-tight">Find your bearings.</h1>
        <p className="text-zinc-400 mt-4 text-lg">Pick your department. Compass knows its playbook and can see your screen.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {DEPTS.map((d, i) => {
          const role = roles[d.id] ?? d.roles[0]
          return (
            <div key={d.id} style={{ '--accent': d.accent, animationDelay: `${i * 60}ms` } as React.CSSProperties}
              className="group card p-6 relative overflow-hidden animate-rise transition hover:-translate-y-0.5 hover:border-accent/40">
              <div className="absolute -top-16 -right-16 w-48 h-48 glow opacity-40 group-hover:opacity-90 transition-opacity" />
              <div className="relative">
                <div className="w-11 h-11 rounded-xl grid place-items-center text-xl bg-accent-soft text-accent mb-4">{d.icon}</div>
                <h2 className="text-xl font-semibold">{d.name}</h2>
                <p className="text-zinc-400 text-sm mt-1 mb-5">{d.pitch}</p>
                <div className="flex gap-2">
                  <select value={role} onChange={(e) => setRoles({ ...roles, [d.id]: e.target.value })}
                    aria-label={`${d.name} role`}
                    className="flex-1 bg-zinc-950/70 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent">
                    {d.roles.map((r) => <option key={r}>{r}</option>)}
                  </select>
                  <button onClick={() => onPick(d.id, role)}
                    className="rounded-lg px-4 py-2 text-sm font-medium bg-accent text-zinc-950 hover:brightness-110 active:scale-95 transition">
                    Start →
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
