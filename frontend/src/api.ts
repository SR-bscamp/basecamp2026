// API client. Shapes follow docs/CONTRACT.md exactly.
// VITE_USE_FIXTURE=1 → every call reads docs/fixtures/* and eval_results/latest.json.
import chatFixture from '../../docs/fixtures/chat_response.json'
import evalsFixture from '../../eval_results/latest.json'
import { fixtureChecklist } from './fixtures/checklists'

export const USE_FIXTURE = import.meta.env.VITE_USE_FIXTURE === '1'
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

export type Dept = 'it' | 'hr' | 'consultants' | 'finance'
export type Confidence = 'high' | 'medium' | 'low'

export interface ChecklistItem { id: string; title: string; doc: string; done: boolean }
export interface ChecklistGroup { id: string; title: string; items: ChecklistItem[] }
export interface Checklist { dept: Dept; role: string; groups: ChecklistGroup[] }

export interface Citation { doc: string; title: string; quote: string }
export interface Ticket { id: string; queue: 'IT' | 'HR'; summary: string }
export interface Usage {
  model: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  cost_usd: number
  latency_ms: number
}
export interface ChatResponse {
  reply: string
  steps: string[]
  screen_identified: string | null
  citations: Citation[]
  checklist_updates: { id: string; done: boolean }[]
  ticket: Ticket | null
  confidence: Confidence
  usage: Usage
}
export interface ChatRequest {
  session_id: string
  dept: Dept
  role: string
  message: string
  image_b64: string | null
  image_media_type: string | null
  model: string | null
}

export interface EvalResults {
  _fixture?: boolean
  generated_at: string
  model: string
  runs: number
  model_comparison: { model: string; pass_rate: number; avg_cost_usd: number; p50_latency_ms: number }[]
  variants: { label: string; pass_rate: number }[]
  by_department: { dept: Dept; passed: number; total: number }[]
  tasks: {
    id: string
    dept: Dept
    pass_rate: number
    flaky: boolean
    checks: { type: string; pass: boolean; reason: string }[]
  }[]
  judge_validation: { labelled: number; agreement: number }
}

export class ApiError extends Error {}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, init)
  } catch {
    throw new ApiError(`Can't reach the Compass backend at ${API_BASE}`)
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) msg = body.error
    } catch { /* non-JSON error body */ }
    throw new ApiError(msg)
  }
  return (await res.json()) as T
}

/** "Support analyst" → "support-analyst" (the contract uses lowercase role ids, e.g. role=analyst). */
export const roleId = (role: string) => role.trim().toLowerCase().replace(/\s+/g, '-')

export async function getChecklist(dept: Dept, role: string, sessionId: string): Promise<Checklist> {
  if (USE_FIXTURE) {
    await delay(250)
    return fixtureChecklist(dept, roleId(role))
  }
  const q = new URLSearchParams({ dept, role: roleId(role), session_id: sessionId })
  return request<Checklist>(`/api/checklist?${q}`)
}

/** mock=true asks the backend for the fixture answer (?mock=1): the demo fallback when the model is unavailable. */
export async function postChat(body: ChatRequest, mock = false): Promise<ChatResponse> {
  if (USE_FIXTURE) {
    await delay(900 + Math.random() * 600)
    return structuredClone(chatFixture) as ChatResponse
  }
  return request<ChatResponse>(`/api/chat${mock ? '?mock=1' : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function getEvals(): Promise<EvalResults> {
  if (USE_FIXTURE) {
    await delay(200)
    return evalsFixture as EvalResults
  }
  return request<EvalResults>('/api/evals/latest')
}

/** `live` and `docs` are backend additions (CONTRACT.md, "Additions from the backend"). */
export interface Health { ok: boolean; model: string; live?: boolean; docs?: number }

export async function getHealth(): Promise<Health> {
  if (USE_FIXTURE) return { ok: true, model: chatFixture.usage.model }
  return request('/api/health')
}
