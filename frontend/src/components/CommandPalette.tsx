import { useEffect, useMemo, useRef, useState } from 'react'

export interface Command { id: string; label: string; hint?: string; run: () => void }

export function CommandPalette({ open, onClose, commands, onAsk }: {
  open: boolean
  onClose: () => void
  commands: Command[]
  onAsk: (q: string) => void
}) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 0) } }, [open])

  const items = useMemo(() => {
    const f = commands.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()))
    return q.trim() ? [...f, { id: 'ask', label: `Ask Compass: "${q.trim()}"`, hint: '↵', run: () => onAsk(q.trim()) }] : f
  }, [commands, q, onAsk])

  if (!open) return null
  const run = (c: Command | undefined) => { if (c) { c.run(); onClose() } }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[18vh]" onClick={onClose}>
      <div className="w-[560px] max-w-[92vw] card bg-zinc-900/95 shadow-2xl overflow-hidden animate-rise" onClick={(e) => e.stopPropagation()}>
        <input ref={inputRef} value={q} placeholder="Jump to a department, open Quality, or ask anything…"
          onChange={(e) => { setQ(e.target.value); setSel(0) }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose()
            else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, items.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
            else if (e.key === 'Enter') run(items[sel])
          }}
          className="w-full bg-transparent px-5 py-4 text-base border-b border-white/10 focus:outline-none" />
        <ul className="max-h-80 overflow-y-auto p-2">
          {items.map((c, i) => (
            <li key={c.id}>
              <button onMouseEnter={() => setSel(i)} onClick={() => run(c)}
                className={`w-full text-left flex items-center rounded-lg px-3 py-2 text-sm ${i === sel ? 'bg-accent-soft text-white' : 'text-zinc-300'}`}>
                <span className="flex-1 truncate">{c.label}</span>
                {c.hint && <span className="text-[11px] text-zinc-500 font-mono ml-3">{c.hint}</span>}
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-zinc-500">Type a question to ask Compass</li>}
        </ul>
      </div>
    </div>
  )
}
