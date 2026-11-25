"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// The one confirmation a routine action gets (docs/UX_PATTERNS.md): it has already happened, so the page says
// what happened and offers Undo for ten seconds. Undo runs the reverse through the same handler. Only Cancel
// this visit and Cancel the pass ask first. An action with no reverse (a pass sold: cancelling it is its own
// dialog) shows the same toast with no Undo. `useUndoToast()` is a no-op outside the provider (a bare screen in
// a test), so a screen never needs the shell to render. The toast is portalled to the body, above the side panel's
// scrim (z-60 over its z-50), sits at the TOP of the screen so it never covers a record panel footer (the next step after Mark done is a footer button), marked live and given pointer events, so it stays clickable and read out while a panel is
// open. Client component.

export const UNDO_SECONDS = 10

interface Toast {
  id: number
  message: string
  undo?: () => Promise<unknown> | void
}

type Show = (message: string, undo?: Toast["undo"]) => void
const UndoContext = createContext<Show | null>(null)

export function useUndoToast(): Show {
  return useContext(UndoContext) ?? (() => undefined)
}

export interface ToastAction {
  label: string
  onClick: () => void | Promise<unknown>
}

/**
 * The bar itself, without the timer or the portal: the message and up to two actions (Undo alone for a routine action, Notify and Undo after a move,
 * docs/plans/2026-11-25-scheduler-design.md 7.8) and an optional close. `MovedToast` draws this same bar. It is marked live and given pointer events.
 */
export function ToastBar({ message, actions, onClose, placement = "top" }: { message: ReactNode; actions: readonly ToastAction[]; onClose?: () => void; placement?: "top" | "bottom" }) {
  const bottom = placement === "bottom"
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ pointerEvents: "auto" }}
      data-slot="undo-toast"
      data-placement={placement}
      className={cn(
        "fixed inset-x-4 z-[60] mx-auto flex max-w-md flex-wrap items-center gap-x-1 gap-y-0 rounded-lg bg-navy px-4 py-2 text-sm text-white shadow-lg md:flex-nowrap md:inset-x-auto md:left-1/2 md:max-w-xl md:-translate-x-1/2",
        bottom ? "bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6" : "top-[calc(0.75rem+env(safe-area-inset-top))]",
      )}
    >
      <span className={cn("min-w-0 flex-1 basis-40 py-2", bottom && "order-1 md:whitespace-nowrap")}>{message}</span>
      <span className={cn("flex shrink-0 items-center", bottom ? "order-3 w-full justify-end md:order-2 md:w-auto" : "contents")}>
        {actions.map((a) => (
          <Button key={a.label} type="button" size="sm" variant="ghost" className="min-h-11 text-primary-light hover:bg-white/10 hover:text-primary-light" onClick={() => void a.onClick()}>
            {a.label}
          </Button>
        ))}
      </span>
      {onClose && (
        <Button type="button" size="icon" variant="ghost" aria-label="Close" className={cn("size-11 text-white hover:bg-white/10 hover:text-white", bottom && "order-2 md:order-3")} onClick={onClose}>
          <X className="size-4" aria-hidden />
        </Button>
      )}
    </div>
  )
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
      {toast &&
        createPortal(
          <ToastBar
            message={toast.message}
            actions={
              toast.undo
                ? [
                    {
                      label: "Undo",
                      onClick: async () => {
                        const { undo } = toast
                        setToast(null)
                        await undo!()
                      },
                    },
                  ]
                : []
            }
          />,
          document.body,
        )}
    </UndoContext.Provider>
  )
}
