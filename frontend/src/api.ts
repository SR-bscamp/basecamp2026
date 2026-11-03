// API client. Shapes follow docs/CONTRACT.md exactly (including "Additions from the backend"
// and "Off-topic questions, tool trace and streaming").
// VITE_USE_FIXTURE=1 → every call reads docs/fixtures/* and eval_results/latest.json.
import chatFixture from '../../docs/fixtures/chat_response.json'
import offTopicFixture from '../../docs/fixtures/chat_response_offtopic.json'
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
export interface ToolCall { name: string; input: Record<string, unknown>; ok?: boolean }
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
  off_topic?: boolean
  tool_calls?: ToolCall[]
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
    throw new ApiError(`Can't reach the Compass backend at ${API_BASE}.`)
  }
  if (!res.ok) throw new ApiError(await errorMessage(res))
  return (await res.json()) as T
}

async function errorMessage(res: Response) {
  try {
    const body = (await res.json()) as { error?: string }
    if (body.error) return body.error
  } catch { /* non-JSON error body */ }
  return `Request failed (${res.status}).`
}

const json = (body: unknown): RequestInit => ({
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

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

export async function toggleChecklist(sessionId: string, itemId: string, done: boolean): Promise<void> {
  if (USE_FIXTURE) return
  await request('/api/checklist/toggle', json({ session_id: sessionId, item_id: itemId, done }))
}

export async function resetSession(sessionId: string): Promise<void> {
  if (USE_FIXTURE) return
  await request(`/api/session/reset?session_id=${encodeURIComponent(sessionId)}`, { method: 'POST' })
}

export async function getSuggestions(dept: Dept): Promise<string[] | null> {
  if (USE_FIXTURE) return null
  try { return await request<string[]>(`/api/suggestions?dept=${dept}`) } catch { return null }
}

export interface DocContent { doc: string; title: string; content: string }
export async function getDoc(path: string): Promise<DocContent | null> {
  if (USE_FIXTURE) return null
  try { return await request<DocContent>(`/api/docs/${path}`) } catch { return null }
}

/** Fixture mode: questions that look unrelated to work get the off-topic fixture, so the playful style can be demoed. */
const looksOffTopic = (m: string) => /meaning of life|purpose of life|joke|weather|football|soccer/i.test(m)

/** mock=true asks the backend for the fixture answer (?mock=1): the demo fallback when the model is unavailable. */
export async function postChat(body: ChatRequest, mock = false): Promise<ChatResponse> {
  if (USE_FIXTURE) {
    await delay(900 + Math.random() * 600)
    return structuredClone(looksOffTopic(body.message) ? offTopicFixture : chatFixture) as ChatResponse
  }
  return request<ChatResponse>(`/api/chat${mock ? '?mock=1' : ''}`, json(body))
}

export interface StreamHandlers {
  onTool?: (t: ToolCall) => void
  onToolDone?: (name: string, ok: boolean) => void
  onDelta?: (text: string) => void
}

/**
 * POST /api/chat/stream (SSE). Resolves with the authoritative `final` envelope.
 * Fixture and mock modes replay the non-streamed answer with a typed-out reply so the UI behaves the same.
 */
export async function streamChat(body: ChatRequest, h: StreamHandlers, mock = false): Promise<ChatResponse> {
  if (USE_FIXTURE || mock) {
    const resp = await postChat(body, mock)
    for (const t of resp.tool_calls ?? []) { h.onTool?.(t); await delay(250); h.onToolDone?.(t.name, t.ok ?? true) }
    const words = resp.reply.split(/(\s+)/)
    for (let i = 0; i < words.length; i += 3) { h.onDelta?.(words.slice(i, i + 3).join('')); await delay(18) }
    return resp
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/chat/stream`, json(body))
  } catch {
    throw new ApiError(`Can't reach the Compass backend at ${API_BASE}.`)
  }
  if (res.status === 404) return postChat(body) // older backend without streaming
  if (!res.ok || !res.body) throw new ApiError(await errorMessage(res))

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buf = ''
  let final: ChatResponse | null = null
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += value
    let sep: number
    while ((sep = buf.indexOf('\n\n')) !== -1) {
      const frame = buf.slice(0, sep)
      buf = buf.slice(sep + 2)
      const event = /^event: (.*)$/m.exec(frame)?.[1]
      const data = /^data: (.*)$/m.exec(frame)?.[1]
      if (!event || !data) continue
      const ev = JSON.parse(data) as Record<string, unknown>
      if (event === 'tool') h.onTool?.({ name: String(ev.name), input: (ev.input as Record<string, unknown>) ?? {} })
      else if (event === 'tool_done') h.onToolDone?.(String(ev.name), Boolean(ev.ok))
      else if (event === 'delta') h.onDelta?.(String(ev.text ?? ''))
      else if (event === 'final') final = ev.envelope as ChatResponse
      else if (event === 'error') throw new ApiError(String(ev.error ?? 'The assistant hit a problem.'))
    }
  }
  if (!final) throw new ApiError('The answer was cut off. Please try again.')
  return final
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
