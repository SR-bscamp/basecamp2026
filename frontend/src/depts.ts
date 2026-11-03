import type { Dept } from './api'

export interface DeptInfo {
  id: Dept
  name: string
  short: string
  /** One-line territory description in the atlas voice. */
  pitch: string
  accent: string
  terrain: 'circuit' | 'contours' | 'survey' | 'ledger'
  roles: string[]
  /** Fallback when GET /api/suggestions is unavailable (fixture mode). */
  suggestions: string[]
}

export const DEPTS: DeptInfo[] = [
  {
    id: 'consultants', name: 'Consultants', short: 'Consulting', accent: '#0F766E', terrain: 'survey',
    pitch: 'Staffing, engagements and how to book your time.',
    roles: ['Analyst', 'Consultant', 'Manager'],
    suggestions: ['Which booking code do I use for internal training?', 'What is the code for Project Zephyr?', 'How does staffing work?'],
  },
  {
    id: 'it', name: 'IT', short: 'IT', accent: '#1F4FD1', terrain: 'circuit',
    pitch: 'Laptop, VPN, MFA and the systems you need on day one.',
    roles: ['Engineer', 'Support analyst', 'Security analyst'],
    suggestions: ['My VPN shows error 809. What do I do?', 'How do I set up MFA?', 'Who do I ask for admin rights?'],
  },
  {
    id: 'hr', name: 'HR', short: 'HR', accent: '#C2410C', terrain: 'contours',
    pitch: 'Benefits, leave, payroll and the people to ask.',
    roles: ['HR generalist', 'Recruiter', 'People partner'],
    suggestions: ['When is the benefits enrolment deadline?', 'How many days of leave do I get?', 'Who is my onboarding buddy?'],
  },
  {
    id: 'finance', name: 'Finance & Booking Codes', short: 'Finance', accent: '#A16207', terrain: 'ledger',
    pitch: 'Timesheets, booking codes and expenses, done right.',
    roles: ['Analyst', 'Controller', 'Accounts payable'],
    suggestions: ['Which code do I use when I am on the bench?', 'When are timesheets due?', 'How do I submit an expense?'],
  },
]

export const deptById = (id: Dept): DeptInfo | undefined => DEPTS.find((d) => d.id === id)

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
