import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, USE_FIXTURE, getChecklist, getHealth, postChat, type Checklist as ChecklistT, type Dept, type Usage } from './api'
import { Chat, type Attachment, type Msg } from './components/Chat'
import { Checklist } from './components/Checklist'
import { CommandPalette, type Command } from './components/CommandPalette'
import { DeptPicker } from './components/DeptPicker'
import { Quality } from './components/Quality'
import { ToastProvider, useToast } from './components/Toast'
import { UnderTheHood } from './components/UnderTheHood'
import { DEPTS, deptById, fmtCents } from './depts'

type Route = 'onboard' | 'quality'
const routeFromHash = (): Route => (location.hash === '#/quality' ? 'quality' : 'onboard')
const newSession = () => Math.random().toString(36).slice(2, 10)
const uid = () => Math.random().toString(36).slice(2)

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
  const [messages, setMessages] = useState<Msg[]>([])
  const [pending, setPending] = useState(false)
  const [history, setHistory] = useState<Usage[]>([])
  const [model, setModel] = useState<string | null>(null)
  const [defaultModel, setDefaultModel] = useState('claude-haiku-4-5')
  const [drawer, setDrawer] = useState(false)
  const [palette, setPalette] = useState(false)
  const [flash, setFlash] = useState<Set<string>>(new Set())

  const info = dept ? deptById(dept) : null

  useEffect(() => {
    const on = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = (r: Route) => { location.hash = r === 'quality' ? '#/quality' : '#/'; setRoute(r) }

  useEffect(() => { getHealth().then((h) => setDefaultModel(h.model)).catch(() => {}) }, [])

  // Department identity: retint the whole app.
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', info?.accent ?? '#a78bfa')
  }, [info])

  const pickDept = useCallback((d: Dept, r: string) => {
    setDept(d); setRole(r); setChecklist(null); setMessages([]); setFlash(new Set()); go('onboard')
    getChecklist(d, r).then(setChecklist).catch((e: Error) => toast(e.message))
  }, [toast])

  const toggle = (id: string) =>
    setChecklist((c) => c && {
      ...c, groups: c.groups.map((g) => ({ ...g, items: g.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) })),
    })

  const send = useCallback(async (text: string, att: Attachment | null) => {
    if (!dept) return
    setMessages((m) => [...m, { id: uid(), role: 'user', text, image: att?.dataUrl }])
    setPending(true)
    try {
      const resp = await postChat({
        session_id: sessionId, dept, role, message: text,
        image_b64: att?.b64 ?? null, image_media_type: att?.mediaType ?? null, model,
      })
      setMessages((m) => [...m, { id: uid(), role: 'assistant', resp }])
      setHistory((h) => [...h, resp.usage])
      if (resp.checklist_updates.length) {
        const upd = new Map(resp.checklist_updates.map((u) => [u.id, u.done]))
        setChecklist((c) => c && {
          ...c, groups: c.groups.map((g) => ({ ...g, items: g.items.map((i) => (upd.has(i.id) ? { ...i, done: upd.get(i.id)! } : i)) })),
        })
        const ids = new Set(resp.checklist_updates.filter((u) => u.done).map((u) => u.id))
        setFlash(ids)
        setTimeout(() => setFlash(new Set()), 2200)
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Something went wrong. Your conversation is safe; try again.')
    } finally {
      setPending(false)
    }
  }, [dept, role, sessionId, model, toast])

  const reset = () => {
    setDept(null); setChecklist(null); setMessages([]); setHistory([]); setModel(null); setSessionId(newSession()); go('onboard')
    toast('Demo reset', 'info')
  }

  // Keyboard: ⌘K palette, ⌘. drawer, / focus input.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setPalette((p) => !p) }
      else if ((e.metaKey || e.ctrlKey) && e.key === '.') { e.preventDefault(); setDrawer((d) => !d) }
      else if (e.key === 'Escape') { setDrawer(false) }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  const commands: Command[] = useMemo(() => [
    ...DEPTS.map((d) => ({ id: `dept-${d.id}`, label: `Switch to ${d.name}`, hint: d.roles[0], run: () => pickDept(d.id, d.roles[0]) })),
    { id: 'onboard', label: 'Go to Onboard', run: () => go('onboard') },
    { id: 'quality', label: 'Go to Quality', run: () => go('quality') },
    { id: 'hood', label: 'Open Under the hood', hint: '⌘.', run: () => setDrawer(true) },
    { id: 'reset', label: 'Demo reset', run: reset },
    ...(info ? info.suggestions.map((s, i) => ({ id: `s${i}`, label: s, hint: 'ask', run: () => send(s, null) })) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [info, pickDept, send])

  const sessionCost = history.reduce((s, u) => s + u.cost_usd, 0)

  return (
    <div className="h-screen flex flex-col">
      <nav className="shrink-0 h-14 border-b border-white/[0.07] flex items-center gap-1 px-5 bg-zinc-950/80 backdrop-blur z-20">
        <button onClick={() => go('onboard')} className="flex items-center gap-2 mr-5 font-semibold tracking-tight">
          <span className="w-6 h-6 rounded-full border-2 border-accent grid place-items-center text-accent text-[10px] transition-colors">◆</span>
          Compass
        </button>
        {(['onboard', 'quality'] as Route[]).map((r) => (
          <button key={r} onClick={() => go(r)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize transition ${route === r ? 'bg-white/[0.08] text-white' : 'text-zinc-400 hover:text-white'}`}>
            {r}
          </button>
        ))}
        {info && route === 'onboard' && (
          <button onClick={() => setDept(null)} className="ml-3 text-xs whitespace-nowrap rounded-full px-3 py-1 bg-accent-soft text-accent hover:brightness-125 transition">
            {info.icon} {info.short} · {role} <span className="opacity-60">change</span>
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {USE_FIXTURE && <span className="whitespace-nowrap text-[10px] uppercase tracking-wider rounded-full px-2.5 py-1 bg-amber-400/15 text-amber-300">Fixture mode</span>}
          <button onClick={() => setPalette(true)} className="hidden md:inline whitespace-nowrap text-xs text-zinc-400 border border-white/10 rounded-lg px-2.5 py-1.5 hover:text-white hover:border-white/25 transition">
            Search or ask <kbd className="font-mono ml-1 text-zinc-500">⌘K</kbd>
          </button>
          <button onClick={() => setDrawer(true)}
            className="whitespace-nowrap text-xs border border-white/10 rounded-lg px-2.5 py-1.5 hover:border-accent hover:text-accent transition tabular">
            ⚙ Under the hood{history.length > 0 && <span className="ml-1.5 text-zinc-400">{fmtCents(sessionCost)}</span>}
          </button>
          <button onClick={reset} className="text-xs text-zinc-500 hover:text-white px-2 py-1.5" title="Demo reset">↺</button>
        </div>
      </nav>

      <main className="flex-1 min-h-0 overflow-y-auto">
        {route === 'quality' ? (
          <Quality />
        ) : !dept || !info ? (
          <DeptPicker onPick={pickDept} />
        ) : (
          <div className="h-full max-w-7xl mx-auto px-5 py-5 grid lg:grid-cols-[340px_1fr] gap-5 min-h-0">
            <aside className="overflow-y-auto min-h-0 pr-1">
              <Checklist checklist={checklist} onToggle={toggle} flash={flash} />
            </aside>
            <div className="min-h-[520px] lg:min-h-0">
              <Chat messages={messages} pending={pending} deptName={info.name} suggestions={info.suggestions} onSend={send} />
            </div>
          </div>
        )}
      </main>

      <UnderTheHood open={drawer} onClose={() => setDrawer(false)} history={history}
        model={model} defaultModel={defaultModel} onModel={setModel} />
      <CommandPalette open={palette} onClose={() => setPalette(false)} commands={commands}
        onAsk={(q) => { if (dept) { go('onboard'); send(q, null) } else toast('Pick a department first', 'info') }} />
    </div>
  )
}
