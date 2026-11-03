import { AlertTriangle, Info } from 'lucide-react'
import { createContext, useCallback, useContext, useState } from 'react'

type Kind = 'error' | 'info'
interface T { id: number; kind: Kind; text: string }
const Ctx = createContext<(text: string, kind?: Kind) => void>(() => {})

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<T[]>([])
  const push = useCallback((text: string, kind: Kind = 'error') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, kind, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center w-[min(92vw,520px)]">
        {toasts.map((t) => (
          <div key={t.id} role="status"
            className={`animate-rise w-full flex gap-3 items-start px-4 py-3 text-sm shadow-[6px_6px_0_rgba(20,18,15,0.12)] border-[1.5px] ${
              t.kind === 'error' ? 'bg-paper border-[#B42318] text-ink' : 'bg-ink border-ink text-paper'}`}>
            {t.kind === 'error' ? <AlertTriangle size={16} className="text-[#B42318] shrink-0 mt-0.5" /> : <Info size={16} className="shrink-0 mt-0.5" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
