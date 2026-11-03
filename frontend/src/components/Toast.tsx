import { createContext, useCallback, useContext, useState } from 'react'

type Kind = 'error' | 'info'
interface T { id: number; kind: Kind; text: string }
const Ctx = createContext<(text: string, kind?: Kind) => void>(() => {})

export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<T[]>([])
  const push = useCallback((text: string, kind: Kind = 'error') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, kind, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
        {toasts.map((t) => (
          <div key={t.id} role="status"
            className={`animate-rise rounded-xl px-4 py-2.5 text-sm shadow-2xl border ${
              t.kind === 'error' ? 'bg-red-950/90 border-red-500/30 text-red-100' : 'bg-zinc-800/95 border-white/10'
            }`}>
            {t.kind === 'error' ? '⚠ ' : ''}{t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
