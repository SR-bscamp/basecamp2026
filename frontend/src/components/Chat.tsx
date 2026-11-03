import {
  ArrowRight, ArrowUp, CheckSquare, Contact, ImagePlus, Loader2, ScanSearch, Search, Ticket as TicketIcon, X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import type { ChatResponse, Citation, ToolCall } from '../api'
import { fmtCents, modelLabel, type DeptInfo } from '../depts'
import { Terrain } from './Terrain'

export interface Attachment { dataUrl: string; b64: string; mediaType: string; name: string }
export type Msg =
  | { id: string; role: 'user'; text: string; image?: string }
  | { id: string; role: 'assistant'; resp: ChatResponse }

/** The answer while it streams: tool events as live status, reply text as it is written. */
export interface Live { text: string; tools: ToolCall[] }

interface Props {
  messages: Msg[]
  live: Live | null
  pending: boolean
  info: DeptInfo
  suggestions: string[]
  onSend: (text: string, att: Attachment | null) => void
  onOpenDoc: (doc: string, quotes?: string[]) => void
}

export function Chat({ messages, live, pending, info, suggestions, onSend, onOpenDoc }: Props) {
  const [text, setText] = useState('')
  const [att, setAtt] = useState<Attachment | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, live?.text, live?.tools.length, pending])

  const readFile = (f: File | undefined | null) => {
    if (!f || !f.type.startsWith('image/')) return
    const r = new FileReader()
    r.onload = () => {
      const dataUrl = String(r.result)
      setAtt({ dataUrl, b64: dataUrl.split(',')[1] ?? '', mediaType: f.type, name: f.name || 'pasted image' })
      inputRef.current?.focus()
    }
    r.readAsDataURL(f)
  }

  const submit = (t = text) => {
    const msg = t.trim() || (att ? 'What am I looking at, and what should I do next?' : '')
    if (!msg || pending) return
    onSend(msg, att)
    setText('')
    setAtt(null)
  }

  const lastUser = [...messages].reverse().find((m) => m.role === 'user') as Extract<Msg, { role: 'user' }> | undefined

  return (
    <div
      className="flex flex-col h-full min-h-0 relative"
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) }}
      onDrop={(e) => { e.preventDefault(); setDragging(false); readFile(e.dataTransfer.files[0]) }}
    >
      {dragging && (
        <div className="absolute inset-4 z-20 border-2 border-dashed border-accent bg-paper/95 grid place-items-center pointer-events-none overflow-hidden">
          <Terrain kind={info.terrain} color={info.accent} opacity={0.25} />
          <div className="relative text-center">
            <ScanSearch size={40} strokeWidth={1.25} className="mx-auto text-accent mb-3" />
            <p className="display text-5xl">Drop it here.</p>
            <p className="text-ink-2 mt-2">Compass will read the screen and tell you what to do next.</p>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-8 flex flex-col gap-10">
          {messages.length === 0 && !pending && (
            <div className="animate-rise pt-[6vh]">
              <p className="eyebrow mb-4">Field notes</p>
              <h2 className="display text-6xl sm:text-7xl">Ask anything<br />about <em className="text-accent">{info.short}.</em></h2>
              <p className="text-ink-2 mt-4 max-w-md">Answers come only from Northwind's documents, with sources. Or paste a screenshot of what's in front of you.</p>
              <ol className="mt-8 border-t rule">
                {suggestions.map((s, i) => (
                  <li key={s}>
                    <button onClick={() => submit(s)}
                      className="group w-full flex items-baseline gap-5 py-4 border-b rule text-left hover:text-accent transition-colors">
                      <span className="font-mono text-xs text-ink-3 group-hover:text-accent">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-lg flex-1">{s}</span>
                      <ArrowRight size={18} strokeWidth={1.5} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition" />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={m.id} className="self-end max-w-[85%] animate-rise flex flex-col items-end gap-2">
                {m.image && <img src={m.image} alt="Your screenshot" className="max-h-44 border rule shadow-[6px_6px_0_rgba(20,18,15,0.08)]" />}
                <p className="bg-ink text-paper px-4 py-2.5 text-[15px] leading-snug whitespace-pre-wrap">{m.text}</p>
              </div>
            ) : (
              <FieldNote key={m.id} resp={m.resp} onOpenDoc={onOpenDoc}
                onTicket={i === messages.length - 1 && lastUser && !pending
                  ? () => submit(`Please open a ticket for this: ${lastUser.text}`) : undefined} />
            ),
          )}

          {pending && <LiveNote live={live} />}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t rule bg-paper/90 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-4">
          {att && (
            <div className="flex items-center gap-3 mb-3 animate-rise">
              <img src={att.dataUrl} alt="Attachment preview" className="h-14 w-20 object-cover border rule" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{att.name}</p>
                <p className="eyebrow">Screenshot attached</p>
              </div>
              <button onClick={() => setAtt(null)} className="p-1.5 text-ink-3 hover:text-ink" aria-label="Remove attachment"><X size={16} /></button>
            </div>
          )}
          <div className="flex items-end gap-2 border-b-[1.5px] border-ink focus-within:border-accent transition-colors">
            <button onClick={() => fileRef.current?.click()} title="Attach a screenshot" aria-label="Attach a screenshot"
              className="shrink-0 p-2 mb-0.5 text-ink-2 hover:text-accent transition-colors">
              <ImagePlus size={20} strokeWidth={1.5} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = '' }} />
            <textarea
              id="chat-input" ref={inputRef} rows={1} value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={(e) => { const f = [...e.clipboardData.files][0]; if (f) { e.preventDefault(); readFile(f) } }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
              placeholder="Ask Compass, or paste a screenshot…"
              className="flex-1 resize-none bg-transparent py-3 text-[17px] max-h-32 placeholder:text-ink-3 focus:outline-none"
            />
            <button onClick={() => submit()} disabled={pending || (!text.trim() && !att)} aria-label="Send"
              className="shrink-0 mb-1.5 w-9 h-9 grid place-items-center bg-ink text-paper hover:bg-accent disabled:opacity-25 disabled:hover:bg-ink transition-colors">
              <ArrowUp size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const TOOL: Record<string, { icon: typeof Search; doing: string; done: (input: Record<string, unknown>, ok: boolean) => string }> = {
  lookup_booking_code: {
    icon: Search, doing: 'Looking up booking codes',
    done: (i, ok) => `Looked up “${String(i.client_or_project ?? i.query ?? '')}” in booking codes${ok ? '' : ': not found'}`,
  },
  tick_checklist: {
    icon: CheckSquare, doing: 'Updating your route',
    done: (i, ok) => (ok ? `Ticked “${String(i.item_id ?? '')}” on your route` : `Couldn't tick “${String(i.item_id ?? '')}”`),
  },
  find_contact: {
    icon: Contact, doing: 'Finding the right person',
    done: (i, ok) => `Searched contacts for “${String(i.topic ?? '')}”${ok ? '' : ': nobody listed'}`,
  },
  create_ticket: {
    icon: TicketIcon, doing: 'Opening a ticket',
    done: (i) => `Opened a ticket with ${String(i.queue ?? 'support')}`,
  },
}
const toolInfo = (name: string) => TOOL[name] ?? { icon: Search, doing: `Running ${name}`, done: () => `Ran ${name}` }

function LiveNote({ live }: { live: Live | null }) {
  const tools = live?.tools ?? []
  return (
    <article className="animate-rise" aria-live="polite">
      <p className="eyebrow mb-3 flex items-center gap-2"><Loader2 size={12} className="animate-spin text-accent" /> Compass is working</p>
      {tools.length > 0 && (
        <ul className="mb-4 flex flex-col gap-1.5">
          {tools.map((t, i) => {
            const ti = toolInfo(t.name)
            const Icon = ti.icon
            return (
              <li key={i} className="flex items-center gap-2.5 text-sm text-ink-2 animate-rise">
                {t.ok === undefined ? <Loader2 size={15} className="animate-spin text-accent" /> : <Icon size={15} strokeWidth={1.6} className="text-accent" />}
                {t.ok === undefined ? `${ti.doing}…` : ti.done(t.input, t.ok)}
              </li>
            )
          })}
        </ul>
      )}
      {live?.text ? (
        <div className="md text-[17px] leading-relaxed caret"><Markdown>{live.text}</Markdown></div>
      ) : tools.length === 0 ? (
        <div className="flex flex-col gap-2.5">{[85, 70, 40].map((w) => <div key={w} className="skeleton h-4" style={{ width: `${w}%` }} />)}</div>
      ) : null}
    </article>
  )
}

/** One answer as one designed object: reply, steps, what Compass did, ticket, footnoted sources. */
function FieldNote({ resp, onTicket, onOpenDoc }: { resp: ChatResponse; onTicket?: () => void; onOpenDoc: Props['onOpenDoc'] }) {
  const sources = groupCitations(resp.citations)
  const tools = resp.tool_calls ?? []
  const meta = `${modelLabel(resp.usage.model)} · ${fmtCents(resp.usage.cost_usd)} · ${(resp.usage.latency_ms / 1000).toFixed(1)}s`

  if (resp.off_topic) {
    return (
      <article className="animate-rise border-l-[3px] border-accent pl-6 py-1">
        <p className="eyebrow mb-3">Off the record</p>
        <blockquote className="display italic text-[2.1rem] leading-[1.1] text-ink">
          <Markdown components={{ p: ({ children }) => <>{children}</> }}>{resp.reply}</Markdown>
        </blockquote>
        <p className="mt-4 font-mono text-[11px] text-ink-3">Compass, in its best consultant voice · {meta}</p>
      </article>
    )
  }

  const unsure = resp.confidence === 'low'
  return (
    <article className="animate-rise">
      {resp.screen_identified && (
        <div className="mb-5 flex items-start gap-3 border-y rule py-3">
          <ScanSearch size={18} strokeWidth={1.5} className="text-accent shrink-0 mt-0.5" />
          <div>
            <p className="eyebrow">On your screen</p>
            <p className="display text-2xl mt-1 leading-tight">{resp.screen_identified}</p>
          </div>
        </div>
      )}

      <div className="md text-[17px] leading-relaxed text-ink">
        <Markdown>{resp.reply}</Markdown>
      </div>

      {resp.steps.length > 0 && (
        <ol className="mt-5 border-t rule">
          {resp.steps.map((s, i) => (
            <li key={i} className="flex gap-5 py-3 border-b rule">
              <span className="display text-3xl text-accent w-7 text-right shrink-0 leading-none pt-0.5 tabular">{i + 1}</span>
              <span className="text-[15px] leading-snug pt-1">{s}</span>
            </li>
          ))}
        </ol>
      )}

      {tools.length > 0 && (
        <div className="mt-5">
          <p className="eyebrow mb-2">What Compass did</p>
          <ul className="flex flex-col gap-1.5">
            {tools.map((t, i) => {
              const ti = toolInfo(t.name)
              const Icon = ti.icon
              return (
                <li key={i} className="flex items-center gap-2.5 text-sm text-ink-2">
                  <Icon size={15} strokeWidth={1.6} className={t.ok === false ? 'text-ink-3' : 'text-accent'} />
                  {ti.done(t.input, t.ok ?? true)}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {resp.ticket && (
        <div className="mt-6 relative border-[1.5px] border-dashed border-ink/40 px-5 py-4 flex gap-4 items-start bg-paper-2/50">
          <TicketIcon size={20} strokeWidth={1.5} className="text-accent shrink-0 mt-1" />
          <div className="flex-1">
            <p className="font-mono text-xs uppercase tracking-[0.14em]">
              <span className="text-accent">{resp.ticket.id}</span> · routed to {resp.ticket.queue}
            </p>
            <p className="text-sm text-ink-2 mt-1.5 leading-snug">{resp.ticket.summary}</p>
          </div>
          <span className="absolute -top-2.5 right-4 bg-paper px-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">Ticket opened</span>
        </div>
      )}

      {!resp.ticket && unsure && onTicket && (
        <button onClick={onTicket} className="mt-5 inline-flex items-center gap-2 text-sm border-b border-ink pb-0.5 hover:text-accent hover:border-accent transition-colors">
          The docs don't cover this. Open a ticket <ArrowRight size={14} />
        </button>
      )}

      <footer className="mt-6 pt-3 border-t-[1.5px] border-ink flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <span className={`font-mono text-[11px] uppercase tracking-[0.12em] ${unsure ? 'text-[#B42318]' : 'text-ink-2'}`}>
          {unsure ? 'Not in the docs' : resp.confidence === 'medium' ? 'Partly grounded' : 'Grounded'}
          {sources.length > 0 && ` · ${sources.length} source${sources.length > 1 ? 's' : ''}`}
        </span>
        {sources.map((c, i) => (
          <button key={c.doc} onClick={() => onOpenDoc(c.doc, c.quotes)}
            className="text-sm text-ink-2 hover:text-accent transition-colors text-left">
            <sup className="font-mono text-accent mr-1">{i + 1}</sup>
            <span className="underline decoration-ink/25 underline-offset-[3px]">{c.title}</span>
          </button>
        ))}
        <span className="ml-auto font-mono text-[11px] text-ink-3 tabular">{meta}</span>
      </footer>
    </article>
  )
}

type CitationGroup = { doc: string; title: string; quotes: string[] }

/** The backend may cite one doc several times with different quotes: one footnote per doc. */
function groupCitations(cs: Citation[]): CitationGroup[] {
  const by = new Map<string, CitationGroup>()
  for (const c of cs) {
    const g = by.get(c.doc) ?? { doc: c.doc, title: c.title, quotes: [] }
    if (c.quote && !g.quotes.includes(c.quote)) g.quotes.push(c.quote)
    by.set(c.doc, g)
  }
  return [...by.values()]
}

