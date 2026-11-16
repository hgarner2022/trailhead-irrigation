"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"

// The one confirmation a routine action gets (docs/UX_PATTERNS.md): it has already happened, so the page says
// what happened and offers Undo for ten seconds. Undo runs the reverse through the same handler. Only Cancel
// this visit and Cancel the pass ask first. `useUndoToast()` is a no-op outside the provider (a bare screen in a
// test), so a screen never needs the shell to render. Client component.

export const UNDO_SECONDS = 10

interface Toast {
  id: number
  message: string
  undo: () => Promise<unknown> | void
}

type Show = (message: string, undo: Toast["undo"]) => void
const UndoContext = createContext<Show | null>(null)

export function useUndoToast(): Show {
  return useContext(UndoContext) ?? (() => undefined)
}

export function UndoToastProvider({ children, seconds = UNDO_SECONDS }: { children: ReactNode; seconds?: number }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const next = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const show = useCallback<Show>(
    (message, undo) => {
      clearTimeout(timer.current)
      setToast({ id: ++next.current, message, undo })
      timer.current = setTimeout(() => setToast(null), seconds * 1000)
    },
    [seconds],
  )
  useEffect(() => () => clearTimeout(timer.current), [])
  const value = useMemo(() => show, [show])
  return (
    <UndoContext.Provider value={value}>
      {children}
      {toast && (
        <div
          role="status"
          data-slot="undo-toast"
          className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg bg-navy px-4 py-2 text-sm text-white shadow-lg md:inset-x-auto md:bottom-6 md:left-1/2 md:-translate-x-1/2"
        >
          <span className="min-w-0 flex-1">{toast.message}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-h-11 text-primary-light hover:bg-white/10 hover:text-primary-light"
            onClick={async () => {
              const { undo } = toast
              setToast(null)
              await undo()
            }}
          >
            Undo
          </Button>
        </div>
      )}
    </UndoContext.Provider>
  )
}
