import { CornerDownLeft, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

export interface Command { id: string; label: string; group: string; hint?: string; run: () => void }

/** Mount only while open, so every open starts with a fresh query. */
export function CommandPalette({ onClose, commands, onAsk }: {
  onClose: () => void
  commands: Command[]
  onAsk: (q: string) => void
}) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)

  const items = useMemo(() => {
    const f = commands.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()))
    return q.trim() ? [...f, { id: 'ask', group: 'Ask', label: q.trim(), hint: 'Ask Compass', run: () => onAsk(q.trim()) }] : f
  }, [commands, q, onAsk])

  const run = (c: Command | undefined) => { if (c) { c.run(); onClose() } }

  return (
    <div className="fixed inset-0 z-50 bg-ink/30 flex items-start justify-center pt-[16vh]" onClick={onClose}>
      <div className="w-[600px] max-w-[92vw] bg-paper border-[1.5px] border-ink shadow-[10px_10px_0_rgba(20,18,15,0.15)] animate-rise" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 border-b-[1.5px] border-ink">
          <Search size={18} strokeWidth={1.6} className="text-ink-3" />
          <input autoFocus value={q} placeholder="Jump to a territory, open a page, or ask anything…"
            onChange={(e) => { setQ(e.target.value); setSel(0) }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
              else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, items.length - 1)) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
              else if (e.key === 'Enter') run(items[sel])
            }}
            className="flex-1 bg-transparent py-4 text-lg placeholder:text-ink-3 focus:outline-none" />
          <kbd className="font-mono text-[11px] text-ink-3">esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-2">
          {items.map((c, i) => (
            <li key={c.id}>
              {(i === 0 || items[i - 1].group !== c.group) && <p className="eyebrow px-5 pt-3 pb-1">{c.group}</p>}
              <button onMouseEnter={() => setSel(i)} onClick={() => run(c)}
                className={`w-full text-left flex items-center gap-3 px-5 py-2 text-[15px] ${i === sel ? 'bg-ink text-paper' : ''}`}>
                <span className="flex-1 truncate">{c.label}</span>
                {c.hint && <span className={`font-mono text-[11px] ${i === sel ? 'text-paper/60' : 'text-ink-3'}`}>{c.hint}</span>}
                {i === sel && <CornerDownLeft size={14} />}
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="px-5 py-6 text-ink-3">Type a question to ask Compass.</li>}
        </ul>
      </div>
    </div>
  )
}
