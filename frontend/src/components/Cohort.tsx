import { DEPTS } from '../depts'
import { Terrain } from './Terrain'

// A9 · Manager view. There is no backend endpoint for org-wide progress, so this is an
// illustrative cohort and is labelled as sample data on the page. Never present it as real.
const SAMPLE = {
  consultants: { joiners: 14, ready: 0.71, stuck: 'Booking codes for client work' },
  it: { joiners: 6, ready: 0.83, stuck: 'VPN error 809' },
  hr: { joiners: 3, ready: 0.92, stuck: 'Benefits enrolment deadline' },
  finance: { joiners: 5, ready: 0.64, stuck: 'Timesheet submission' },
} as const

export function Cohort() {
  const total = Object.values(SAMPLE).reduce((s, d) => s + d.joiners, 0)
  const avg = Object.values(SAMPLE).reduce((s, d) => s + d.ready * d.joiners, 0) / total
  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-12 py-10 animate-rise">
      <header className="flex flex-wrap items-baseline gap-x-6 border-b-[1.5px] border-ink pb-3">
        <p className="eyebrow">Cohort · Plate III · for onboarding managers</p>
        <span className="ml-auto -rotate-2 border-2 border-[#B42318] text-[#B42318] px-2.5 py-0.5 font-mono text-xs uppercase tracking-[0.18em]">
          Sample cohort · illustrative
        </span>
      </header>

      <section className="py-10 border-b rule">
        <p className="text-ink-2 text-lg">This month's {total} new joiners are, on average,</p>
        <p className="display text-[clamp(6rem,14vw,11rem)] tabular leading-[0.85] mt-2">{Math.round(avg * 100)}%</p>
        <p className="text-ink-2 text-lg mt-2">of the way to ready.</p>
      </section>

      <section className="grid sm:grid-cols-2 border-l rule">
        {DEPTS.map((d) => {
          const s = SAMPLE[d.id]
          return (
            <div key={d.id} className="relative overflow-hidden border-r border-b rule px-7 py-7" style={{ '--accent': d.accent } as React.CSSProperties}>
              <Terrain kind={d.terrain} color={d.accent} opacity={0.12} />
              <div className="relative">
                <div className="flex items-baseline justify-between">
                  <h2 className="display text-5xl">{d.short}</h2>
                  <span className="font-mono text-xs text-ink-3 tabular">{s.joiners} joiners</span>
                </div>
                <p className="display text-6xl tabular text-accent mt-4">{Math.round(s.ready * 100)}%</p>
                <div className="h-[4px] bg-ink/10 mt-2"><div className="h-full bg-accent" style={{ width: `${s.ready * 100}%` }} /></div>
                <p className="mt-4 text-sm text-ink-2"><span className="eyebrow mr-2">Most asked</span>{s.stuck}</p>
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}
