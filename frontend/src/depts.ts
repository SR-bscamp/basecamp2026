import type { Dept } from './api'

export interface DeptInfo {
  id: Dept
  name: string
  short: string
  pitch: string
  accent: string
  icon: string
  roles: string[]
  suggestions: string[]
}

export const DEPTS: DeptInfo[] = [
  {
    id: 'it', name: 'IT', short: 'IT', accent: '#22d3ee', icon: '⌁',
    pitch: 'Laptop, VPN, MFA and the systems you need on day one.',
    roles: ['Engineer', 'Support analyst', 'Security analyst'],
    suggestions: ['How do I set up the VPN?', 'My MFA app is not showing a code', 'Who do I ask for admin rights?'],
  },
  {
    id: 'hr', name: 'HR', short: 'HR', accent: '#fb7185', icon: '◍',
    pitch: 'Benefits, leave, payroll and who to talk to.',
    roles: ['HR generalist', 'Recruiter', 'People partner'],
    suggestions: ['When is the benefits enrolment deadline?', 'How many days of leave do I get?', 'Who is my onboarding buddy?'],
  },
  {
    id: 'consultants', name: 'Consultants', short: 'Consulting', accent: '#a78bfa', icon: '◆',
    pitch: 'Staffing, engagements and how to book your time.',
    roles: ['Analyst', 'Consultant', 'Manager'],
    suggestions: ['Which booking code do I use for internal training?', 'What is the code for Project Zephyr?', 'How does staffing work?'],
  },
  {
    id: 'finance', name: 'Finance & Booking Codes', short: 'Finance', accent: '#fbbf24', icon: '▲',
    pitch: 'Timesheets, booking codes and expenses, done right.',
    roles: ['Analyst', 'Controller', 'Accounts payable'],
    suggestions: ['Which code do I use when I am on the bench?', 'When are timesheets due?', 'How do I submit an expense?'],
  },
]

export const deptById = (id: Dept) => DEPTS.find((d) => d.id === id)!

export const MODELS = [
  { id: 'claude-haiku-5-5', label: 'Haiku 5.5' },
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5' },
  { id: 'claude-opus-5-5', label: 'Opus 5.5' },
] as const

export const modelLabel = (id: string) =>
  id.replace('claude-', '').replace(/-(\d)-(\d)$/, ' $1.$2').replace(/-(\d)$/, ' $1').replace(/^\w/, (c) => c.toUpperCase())

/** Cost as cents with enough precision to show fractions of a cent. */
export const fmtCents = (usd: number) => {
  const c = usd * 100
  return `${c < 0.1 ? c.toFixed(3) : c.toFixed(2)}¢`
}
export const fmtPct = (x: number) => `${Math.round(x * 100)}%`
