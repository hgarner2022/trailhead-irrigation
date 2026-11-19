"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"

// The note an action leaves behind (Hannah, Nov 19 2026: "billing never holds a result message"): the thing has happened, the page has
// already changed state, and this says so in one line at the bottom centre, then goes by itself after four seconds. It has no button and
// no Undo (that is `UndoToast`, at the top, for a routine action that can be taken back). `useToast()` is a no-op outside the provider,
// so a bare screen in a test never needs it. Portalled to the body, marked live. Client component.

export const TOAST_SECONDS = 4

type Show = (message: string) => void
const ToastContext = createContext<Show | null>(null)

export function useToast(): Show {
  return useContext(ToastContext) ?? (() => undefined)
}

export function ToastProvider({ children, seconds = TOAST_SECONDS }: { children: ReactNode; seconds?: number }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null)
  const next = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const show = useCallback<Show>(
    (message) => {
      clearTimeout(timer.current)
      setToast({ id: ++next.current, message })
      timer.current = setTimeout(() => setToast(null), seconds * 1000)
    },
    [seconds],
  )
  useEffect(() => () => clearTimeout(timer.current), [])
  const value = useMemo(() => show, [show])
  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast &&
        createPortal(
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            data-slot="toast"
            className="pointer-events-none fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[70] mx-auto max-w-md rounded-lg bg-navy px-4 py-3 text-center text-sm font-medium text-white shadow-lg md:inset-x-auto md:left-1/2 md:-translate-x-1/2"
          >
            {toast.message}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  )
}
