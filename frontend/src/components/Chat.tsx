import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import type { ChatResponse, Citation } from '../api'
import { fmtCents, modelLabel } from '../depts'

export interface Attachment { dataUrl: string; b64: string; mediaType: string; name: string }
export type Msg =
  | { id: string; role: 'user'; text: string; image?: string }
  | { id: string; role: 'assistant'; resp: ChatResponse }

interface Props {
  messages: Msg[]
  pending: boolean
  deptName: string
  suggestions: string[]
  onSend: (text: string, att: Attachment | null) => void
}

export function Chat({ messages, pending, deptName, suggestions, onSend }: Props) {
  const [text, setText] = useState('')
  const [att, setAtt] = useState<Attachment | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, pending])

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

  const lastUserText = [...messages].reverse().find((m) => m.role === 'user') as Extract<Msg, { role: 'user' }> | undefined

  return (
    <div
      className="card flex flex-col h-full min-h-0 relative overflow-hidden"
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false) }}
      onDrop={(e) => { e.preventDefault(); setDragging(false); readFile(e.dataTransfer.files[0]) }}
    >
      {dragging && (
        <div className="absolute inset-3 z-20 rounded-xl border-2 border-dashed border-accent bg-zinc-950/85 grid place-items-center pointer-events-none">
          <div className="text-center">
            <div className="text-4xl mb-2 text-accent">⌖</div>
            <p className="font-medium">Drop a screenshot</p>
            <p className="text-sm text-zinc-400">Compass will read the screen and tell you what to do.</p>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 flex flex-col gap-4">
        {messages.length === 0 && !pending && (
          <div className="m-auto text-center max-w-md animate-rise">
            <p className="text-zinc-400 mb-5">Ask anything about {deptName}, or drop a screenshot of what's in front of you.</p>
            <div className="flex flex-col gap-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => submit(s)}
                  className="text-left text-sm rounded-xl border border-white/10 px-4 py-2.5 hover:border-accent/50 hover:bg-accent-soft transition">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={m.id} className="self-end max-w-[80%] animate-rise flex flex-col items-end gap-2">
              {m.image && <img src={m.image} alt="Uploaded screenshot" className="max-h-40 rounded-xl border border-white/10" />}
              <div className="rounded-2xl rounded-br-md bg-accent text-zinc-950 px-4 py-2.5 text-sm font-medium whitespace-pre-wrap">{m.text}</div>
            </div>
          ) : (
            <AssistantCard key={m.id} resp={m.resp}
              onTicket={i === messages.length - 1 && lastUserText
                ? () => submit(`Please open a ticket for this: ${lastUserText.text}`) : undefined} />
          ),
        )}

        {pending && (
          <div className="self-start card px-4 py-3 typing flex gap-1 text-accent text-lg leading-none" aria-label="Compass is thinking">
            <span>●</span><span>●</span><span>●</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-white/[0.07] p-3">
        {att && (
          <div className="flex items-center gap-3 mb-2 p-2 rounded-xl bg-white/[0.04] animate-rise">
            <img src={att.dataUrl} alt="Attachment preview" className="h-12 w-16 object-cover rounded-md" />
            <span className="text-xs text-zinc-400 flex-1 truncate">{att.name}</span>
            <button onClick={() => setAtt(null)} className="text-xs text-zinc-400 hover:text-white px-2" aria-label="Remove attachment">✕</button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button onClick={() => fileRef.current?.click()} title="Attach screenshot"
            className="shrink-0 w-10 h-10 rounded-xl border border-white/10 hover:border-accent hover:text-accent transition grid place-items-center">
            ⎘
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden
            onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = '' }} />
          <textarea
            id="chat-input" ref={inputRef} rows={1} value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={(e) => { const f = [...e.clipboardData.files][0]; if (f) { e.preventDefault(); readFile(f) } }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
            placeholder="Ask Compass…  (paste or drop a screenshot)"
            className="flex-1 resize-none bg-zinc-950/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm max-h-32 focus:outline-none focus:border-accent"
          />
          <button onClick={() => submit()} disabled={pending || (!text.trim() && !att)}
            className="shrink-0 h-10 px-4 rounded-xl bg-accent text-zinc-950 text-sm font-semibold disabled:opacity-30 hover:brightness-110 active:scale-95 transition">
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

const CONF: Record<ChatResponse['confidence'], string> = {
  high: 'bg-emerald-400/15 text-emerald-300',
  medium: 'bg-amber-400/15 text-amber-300',
  low: 'bg-red-400/15 text-red-300',
}

function AssistantCard({ resp, onTicket }: { resp: ChatResponse; onTicket?: () => void }) {
  return (
    <div className="self-start max-w-[88%] flex flex-col gap-2.5 animate-rise">
      {resp.screen_identified && (
        <div className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-2.5 text-sm">
          <span className="text-[10px] uppercase tracking-[0.18em] text-accent font-semibold block mb-0.5">What I see</span>
          {resp.screen_identified}
        </div>
      )}
      <div className="card px-4 py-3.5 text-sm leading-relaxed">
        <div className="md"><Markdown>{resp.reply}</Markdown></div>

        {resp.steps.length > 0 && (
          <ol className="mt-3 flex flex-col gap-1.5">
            {resp.steps.map((s, i) => (
              <li key={i} className="flex gap-3 items-start rounded-lg bg-white/[0.035] px-3 py-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-accent-soft text-accent text-[11px] font-semibold grid place-items-center tabular">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className={`text-[10px] uppercase tracking-wider font-semibold rounded-full px-2 py-0.5 ${CONF[resp.confidence]}`}>
            {resp.confidence} confidence
          </span>
          {groupCitations(resp.citations).map((c) => <CitationChip key={c.doc} c={c} />)}
          <span className="ml-auto text-[10px] font-mono text-zinc-500 tabular">
            {modelLabel(resp.usage.model)} · {fmtCents(resp.usage.cost_usd)} · {(resp.usage.latency_ms / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      {resp.ticket && (
        <div className="card px-4 py-3 flex items-center gap-3 border-accent/30">
          <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent grid place-items-center">✉</span>
          <div className="text-sm flex-1">
            <div className="font-medium">Ticket <span className="font-mono">{resp.ticket.id}</span> opened · {resp.ticket.queue} queue</div>
            <div className="text-zinc-400 text-xs">{resp.ticket.summary}</div>
          </div>
        </div>
      )}
      {!resp.ticket && resp.confidence === 'low' && onTicket && (
        <button onClick={onTicket}
          className="self-start text-sm rounded-xl border border-dashed border-red-300/40 text-red-200 px-4 py-2 hover:bg-red-400/10 transition">
          The docs don't cover this. Create a ticket →
        </button>
      )}
    </div>
  )
}

type CitationGroup = { doc: string; title: string; quotes: string[] }

/** The backend may cite one doc several times with different quotes: show one chip per doc. */
function groupCitations(cs: Citation[]): CitationGroup[] {
  const by = new Map<string, CitationGroup>()
  for (const c of cs) {
    const g = by.get(c.doc) ?? { doc: c.doc, title: c.title, quotes: [] }
    if (c.quote && !g.quotes.includes(c.quote)) g.quotes.push(c.quote)
    by.set(c.doc, g)
  }
  return [...by.values()]
}

function CitationChip({ c }: { c: CitationGroup }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative">
      <button onClick={() => setOpen(!open)}
        className="text-[11px] rounded-full border border-white/10 px-2 py-0.5 hover:border-accent hover:text-accent transition">
        ↗ {c.title}
      </button>
      {open && (
        <span className="absolute z-10 bottom-full mb-2 left-0 w-72 card p-3 text-xs shadow-2xl animate-rise block">
          <span className="font-mono text-zinc-500 block mb-1">knowledge/{c.doc}</span>
          {c.quotes.map((q, i) => (
            <span key={i} className="text-zinc-200 italic block mt-1 first:mt-0">"{q}"</span>
          ))}
        </span>
      )}
    </span>
  )
}
