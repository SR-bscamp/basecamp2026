import { FileText, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import { getDoc, type DocContent } from '../api'

export interface DocRef { doc: string; quotes?: string[] }

/** Side sheet showing a cited document (GET /api/docs/{path}), with the quoted passages marked. */
export function DocSheet({ open, onClose }: { open: DocRef | null; onClose: () => void }) {
  const [doc, setDoc] = useState<DocContent | null | 'loading'>(null)

  useEffect(() => {
    if (!open) return
    let alive = true
    setDoc('loading')
    getDoc(open.doc).then((d) => { if (alive) setDoc(d) })
    return () => { alive = false }
  }, [open])

  const quotes = open?.quotes ?? []
  const title = doc && doc !== 'loading' ? doc.title : open?.doc.split('/').pop()?.replace(/\.md$/, '').replace(/-/g, ' ')

  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 z-30 bg-ink/20 transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
      <aside aria-label="Source document" aria-hidden={!open}
        className={`fixed top-0 right-0 z-40 h-full w-[560px] max-w-full bg-paper border-l border-ink shadow-[-12px_0_0_rgba(20,18,15,0.05)]
          transition-transform duration-300 ease-out overflow-y-auto ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {open && (
          <div className="px-8 py-7">
            <div className="flex items-start gap-3">
              <FileText size={18} strokeWidth={1.5} className="text-accent mt-1.5" />
              <div className="flex-1">
                <p className="eyebrow">Source · knowledge/{open.doc}</p>
                <h2 className="display text-5xl mt-2 capitalize">{title}</h2>
              </div>
              <button onClick={onClose} aria-label="Close" className="p-1 text-ink-3 hover:text-ink"><X size={20} /></button>
            </div>

            {quotes.length > 0 && (
              <div className="mt-6 border-l-[3px] border-accent pl-4 flex flex-col gap-2">
                <p className="eyebrow">Quoted in the answer</p>
                {quotes.map((q, i) => <p key={i} className="font-serif text-xl italic leading-snug">“{q}”</p>)}
              </div>
            )}

            <div className="mt-8 pt-6 border-t rule">
              {doc === 'loading' ? (
                <div className="flex flex-col gap-3">{[90, 75, 85, 60].map((w) => <div key={w} className="skeleton h-4" style={{ width: `${w}%` }} />)}</div>
              ) : doc ? (
                <div className="md text-[15px] leading-relaxed"><Markdown components={{ p: ({ children }) => <p>{mark(children, quotes)}</p> }}>{doc.content}</Markdown></div>
              ) : (
                <p className="text-sm text-ink-3">The full document isn't available here (fixture mode or older backend). The quoted passages above are what the answer relied on.</p>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

/** Highlight paragraphs that contain one of the quoted passages. */
function mark(children: React.ReactNode, quotes: string[]) {
  const text = Array.isArray(children) ? children.map((c) => (typeof c === 'string' ? c : '')).join('') : String(children ?? '')
  const hit = quotes.some((q) => q.length > 12 && text.replace(/\s+/g, ' ').includes(q.replace(/\s+/g, ' ').slice(0, 40)))
  return hit ? <mark className="bg-accent-wash text-ink box-decoration-clone px-0.5">{children}</mark> : children
}
