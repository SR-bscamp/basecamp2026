import { Command as CommandIcon, Gauge, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError, USE_FIXTURE, getChecklist, getHealth, getSuggestions, resetSession, streamChat, toggleChecklist,
  type Checklist as ChecklistT, type Dept, type Health, type ToolCall, type Usage,
} from './api'
import { Chat, type Attachment, type Live, type Msg } from './components/Chat'
import { Checklist } from './components/Checklist'
import { Cohort } from './components/Cohort'
import { CommandPalette, type Command } from './components/CommandPalette'
import { DeptPicker } from './components/DeptPicker'
import { DocSheet, type DocRef } from './components/DocSheet'
import { Quality } from './components/Quality'
import { ToastProvider, useToast } from './components/Toast'
import { UnderTheHood } from './components/UnderTheHood'
import { DEPTS, deptById, fmtCents } from './depts'

type Route = 'onboard' | 'quality' | 'cohort'
const ROUTES: { id: Route; label: string }[] = [
  { id: 'onboard', label: 'Route' }, { id: 'quality', label: 'Quality' }, { id: 'cohort', label: 'Cohort' },
]
const routeFromHash = (): Route => (location.hash === '#/quality' ? 'quality' : location.hash === '#/cohort' ? 'cohort' : 'onboard')
const newSession = () => Math.random().toString(36).slice(2, 10)
const uid = () => Math.random().toString(36).slice(2)
const INK = '#14120F'

export default function App() {
  return <ToastProvider><Shell /></ToastProvider>
}

function Shell() {
  const toast = useToast()
  const [route, setRoute] = useState<Route>(routeFromHash)
  const [sessionId, setSessionId] = useState(newSession)
  const [dept, setDept] = useState<Dept | null>(null)
  const [role, setRole] = useState('')
  const [checklist, setChecklist] = useState<ChecklistT | null>(null)
  const [checklistError, setChecklistError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[] | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [pending, setPending] = useState(false)
  const [live, setLive] = useState<Live | null>(null)
  const [history, setHistory] = useState<Usage[]>([])
  const [lastTools, setLastTools] = useState<ToolCall[]>([])
  const [model, setModel] = useState<string | null>(null)
  const [health, setHealth] = useState<Health | null | 'offline'>(null)
  const [mock, setMock] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [palette, setPalette] = useState(false)
  const [docRef, setDocRef] = useState<DocRef | null>(null)
  const [flash, setFlash] = useState<Set<string>>(new Set())

  const info = dept ? deptById(dept) : undefined
  const defaultModel = health && health !== 'offline' ? health.model : 'claude-haiku-5-5'

  useEffect(() => {
    const on = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = (r: Route) => { location.hash = r === 'onboard' ? '#/' : `#/${r}`; setRoute(r) }

  useEffect(() => {
    const check = () => getHealth().then(setHealth).catch(() => setHealth('offline'))
    check()
    const t = setInterval(check, 15000)
    return () => clearInterval(t)
  }, [])

  // Department identity: the whole app takes the territory's ink.
  useEffect(() => { document.documentElement.style.setProperty('--accent', info?.accent ?? INK) }, [info])

  const loadChecklist = useCallback((d: Dept, r: string, sid: string) => {
    setChecklist(null); setChecklistError(null)
    getChecklist(d, r, sid).then(setChecklist).catch((e: Error) => setChecklistError(e.message))
  }, [])

  const pickDept = useCallback((d: Dept, r: string) => {
    setDept(d); setRole(r); setMessages([]); setFlash(new Set()); setSuggestions(null); go('onboard')
    loadChecklist(d, r, sessionId)
    getSuggestions(d).then((s) => setSuggestions(s && s.length ? s.slice(0, 3) : null))
  }, [loadChecklist, sessionId])

  const setDone = (id: string, done: boolean) =>
    setChecklist((c) => c && {
      ...c, groups: c.groups.map((g) => ({ ...g, items: g.items.map((i) => (i.id === id ? { ...i, done } : i)) })),
    })

  const toggle = (id: string) => {
    const item = checklist?.groups.flatMap((g) => g.items).find((i) => i.id === id)
    if (!item) return
    setDone(id, !item.done)
    toggleChecklist(sessionId, id, !item.done).catch((e: Error) => { setDone(id, item.done); toast(e.message) })
  }

  const send = useCallback(async (text: string, att: Attachment | null) => {
    if (!dept) return
    setMessages((m) => [...m, { id: uid(), role: 'user', text, image: att?.dataUrl }])
    setPending(true)
    setLive({ text: '', tools: [] })
    try {
      const resp = await streamChat({
        session_id: sessionId, dept, role, message: text,
        image_b64: att?.b64 ?? null, image_media_type: att?.mediaType ?? null, model,
      }, {
        onTool: (t) => setLive((l) => l && { ...l, tools: [...l.tools, t] }),
        onToolDone: (name, ok) => setLive((l) => {
          if (!l) return l
          const idx = l.tools.findIndex((t) => t.name === name && t.ok === undefined)
          return idx < 0 ? l : { ...l, tools: l.tools.map((t, i) => (i === idx ? { ...t, ok } : t)) }
        }),
        onDelta: (d) => setLive((l) => l && { ...l, text: l.text + d }),
      }, mock)
      setMessages((m) => [...m, { id: uid(), role: 'assistant', resp }])
      setHistory((h) => [...h, resp.usage])
      setLastTools(resp.tool_calls ?? [])
      const ticked = resp.checklist_updates.filter((u) => u.done)
      if (resp.checklist_updates.length) {
        for (const u of resp.checklist_updates) setDone(u.id, u.done)
        setFlash(new Set(ticked.map((u) => u.id)))
        setTimeout(() => setFlash(new Set()), 3000)
      }
      const titles = ticked.map((u) => checklist?.groups.flatMap((g) => g.items).find((i) => i.id === u.id)?.title ?? u.id)
      if (titles.length) toast(`Compass ticked “${titles.join('”, “')}” on your route.`, 'info')
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Something went wrong. Your conversation is safe; try again.'
      toast(!mock && !USE_FIXTURE ? `${msg} Tip: switch on Mock answers in Under the hood (⌘.).` : msg)
    } finally {
      setPending(false)
      setLive(null)
    }
  }, [dept, role, sessionId, model, mock, toast, checklist])

  const reset = useCallback(() => {
    resetSession(sessionId).catch(() => {})
    setDept(null); setChecklist(null); setMessages([]); setHistory([]); setLastTools([]); setModel(null); setMock(false)
    setSessionId(newSession()); go('onboard')
    toast('Demo reset. Fresh session.', 'info')
  }, [sessionId, toast])

  // Keyboard: ⌘K palette, ⌘. drawer, Esc closes sheets.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p) }
      else if ((e.metaKey || e.ctrlKey) && e.key === '.') { e.preventDefault(); setDrawer((d) => !d) }
      else if (e.key === 'Escape') { setDrawer(false); setDocRef(null) }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  const deptSuggestions = suggestions ?? info?.suggestions ?? []
  const commands: Command[] = useMemo(() => [
    ...deptSuggestions.map((s, i) => ({ id: `s${i}`, group: 'Ask', label: s, run: () => { go('onboard'); send(s, null) } })),
    ...DEPTS.map((d) => ({ id: `dept-${d.id}`, group: 'Territories', label: `Switch to ${d.name}`, hint: d.roles[0], run: () => pickDept(d.id, d.roles[0]) })),
    ...ROUTES.map((r) => ({ id: r.id, group: 'Pages', label: `Open ${r.label}`, run: () => go(r.id) })),
    { id: 'hood', group: 'Pages', label: 'Open Under the hood', hint: '⌘.', run: () => setDrawer(true) },
    { id: 'reset', group: 'Demo', label: 'Demo reset', run: reset },
  ], [deptSuggestions, pickDept, send, reset])

  const sessionCost = history.reduce((s, u) => s + u.cost_usd, 0)

  return (
    <div className="h-screen flex flex-col">
      <nav className="shrink-0 h-14 border-b-[1.5px] border-ink flex items-center gap-1 px-4 sm:px-6 bg-paper z-20 min-w-0">
        <button onClick={() => go('onboard')} className="flex items-center gap-2 mr-3 sm:mr-6" aria-label="Compass home">
          <CompassMark />
          <span className="display text-[1.7rem] leading-none">Compass</span>
        </button>
        {ROUTES.map((r) => (
          <button key={r.id} onClick={() => go(r.id)}
            className={`px-2.5 sm:px-3 h-14 text-sm border-b-2 -mb-[1.5px] transition-colors ${
              route === r.id ? 'border-accent text-ink font-medium' : 'border-transparent text-ink-3 hover:text-ink'}`}>
            {r.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1 sm:gap-3 min-w-0">
          <StatusPill health={health} mock={mock} />
          <button onClick={() => setPalette(true)} className="hidden md:inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink px-2 py-1">
            <CommandIcon size={14} strokeWidth={1.75} /> K
          </button>
          <button onClick={() => setDrawer(true)} title="Under the hood (⌘.)"
            className="inline-flex items-center gap-2 text-sm px-2.5 py-1.5 hover:text-accent transition-colors">
            <Gauge size={17} strokeWidth={1.6} />
            <span className="hidden sm:inline">Under the hood</span>
            {history.length > 0 && <span className="font-mono text-xs text-ink-3 tabular">{fmtCents(sessionCost)}</span>}
          </button>
          <button onClick={reset} className="p-1.5 text-ink-3 hover:text-ink" title="Demo reset" aria-label="Demo reset">
            <RotateCcw size={16} strokeWidth={1.6} />
          </button>
        </div>
      </nav>

      <main className="flex-1 min-h-0 overflow-y-auto">
        {route === 'quality' ? <Quality /> : route === 'cohort' ? <Cohort /> : !dept || !info ? (
          <DeptPicker onPick={pickDept} />
        ) : (
          <div className="h-full grid lg:grid-cols-[400px_1fr] min-h-0">
            <aside className="lg:border-r-[1.5px] border-ink overflow-y-auto min-h-0 flex flex-col">
              <Checklist checklist={checklist} info={info} role={role} error={checklistError} flash={flash}
                onRetry={() => loadChecklist(dept, role, sessionId)} onToggle={toggle} onOpenDoc={(doc) => setDocRef({ doc })} />
              <button onClick={() => setDept(null)} className="mt-auto mx-6 mb-6 pt-4 border-t rule text-left text-sm text-ink-3 hover:text-ink">
                Change territory →
              </button>
            </aside>
            <div className="min-h-[560px] lg:min-h-0">
              <Chat messages={messages} live={live} pending={pending} info={info} suggestions={deptSuggestions}
                onSend={send} onOpenDoc={(doc, quotes) => setDocRef({ doc, quotes })} />
            </div>
          </div>
        )}
      </main>

      <UnderTheHood open={drawer} onClose={() => setDrawer(false)} history={history} lastTools={lastTools}
        model={model} defaultModel={defaultModel} onModel={setModel}
        mock={mock} onMock={setMock} showMock={!USE_FIXTURE} />
      <DocSheet open={docRef} onClose={() => setDocRef(null)} />
      {palette && (
        <CommandPalette onClose={() => setPalette(false)} commands={commands}
          onAsk={(q) => { if (dept) { go('onboard'); send(q, null) } else toast('Pick a territory first.', 'info') }} />
      )}
    </div>
  )
}

function CompassMark() {
  return (
    <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden>
      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 4.5l2.8 11.5L16 27.5 13.2 16z" fill="currentColor" />
      <path d="M16 4.5l2.8 11.5h-5.6z" fill="var(--accent)" className="transition-colors duration-500" />
    </svg>
  )
}

function StatusPill({ health, mock }: { health: Health | null | 'offline'; mock: boolean }) {
  const [label, color, title] = USE_FIXTURE
    ? ['Fixture', '#B45309', 'VITE_USE_FIXTURE=1: no backend calls']
    : health === null ? ['Connecting', '#8A8377', '']
      : health === 'offline' ? ['Offline', '#B42318', "Can't reach the API"]
        : mock ? ['Mock answers', '#B45309', 'Chat uses ?mock=1 (fixture answer)']
          : health.live === false ? ['No API key', '#B42318', 'Backend is up but has no ANTHROPIC_API_KEY']
            : ['Live', '#15803D', `${health.docs ?? '?'} docs loaded`]
  return (
    <span title={title} className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.12em] flex items-center gap-1.5 px-1" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />{label}
    </span>
  )
}
