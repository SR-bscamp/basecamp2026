// UI-only fallback checklist for fixture mode. The live source is GET /api/checklist
// (backed by data/checklists.json, Lane C). Ids mirror the contract examples
// ("vpn", "timesheet") so chat checklist_updates tick something in fixture mode.
import type { Checklist, Dept } from '../api'

type Row = [id: string, title: string, doc: string]
type Groups = Record<'day1' | 'week1' | 'month1', Row[]>

const common: Groups = {
  day1: [
    ['laptop', 'Collect laptop and sign in', 'it/laptop-setup.md'],
    ['vpn', 'Set up VPN', 'it/vpn-setup.md'],
    ['mfa', 'Enrol in MFA', 'it/mfa.md'],
  ],
  week1: [
    ['benefits', 'Choose your benefits', 'hr/benefits.md'],
    ['timesheet', 'Submit your first timesheet', 'finance/booking-codes.md'],
  ],
  month1: [['buddy', 'Meet your onboarding buddy', 'hr/buddy-program.md']],
}

const extra: Record<Dept, Partial<Groups>> = {
  it: { week1: [['oncall', 'Shadow an on-call shift', 'it/on-call.md']] },
  hr: { week1: [['hris', 'Get HRIS access', 'hr/hris.md']] },
  consultants: {
    week1: [['staffing', 'Read the staffing process', 'consultants/staffing.md']],
    month1: [['first-engagement', 'Join your first engagement', 'consultants/engagements.md']],
  },
  finance: { week1: [['codes', 'Learn the booking-code structure', 'finance/booking-codes.md']] },
}

const titles = { day1: 'Day 1', week1: 'Week 1', month1: 'Month 1' } as const

export function fixtureChecklist(dept: Dept, role: string): Checklist {
  const groups = (Object.keys(titles) as (keyof Groups)[]).map((gid) => ({
    id: gid,
    title: titles[gid],
    items: [...common[gid], ...(extra[dept][gid] ?? [])].map(([id, title, doc]) => ({
      id, title, doc, done: false,
    })),
  }))
  return { dept, role, groups }
}
