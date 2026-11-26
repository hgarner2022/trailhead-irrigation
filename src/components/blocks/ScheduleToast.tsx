"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ToastBar } from "./UndoToast"

// What the screen says after a visit is moved or scheduled (docs/plans/2026-11-26-scheduler-review-research.md, point 3): the app's own UndoToast bar, at the bottom centre on a laptop and above
// the tab bar on a phone, "Moved to Thu, Nov 26, 9:00 am" with Notify the customer and Undo. Each action is there only when its callback is: a move the Schedule dialog already told the customer
// about has Undo alone, and "Customer notified" has none. It closes itself after 10 seconds, or 4 when it has no action, and the timer waits while the pointer or focus is on it. Nothing stays on
// screen afterwards: the move is in the visit's history. Notify and Undo each run their callback and then close. Pure props, client component.

export const SCHEDULE_TOAST_SECONDS = 10
export const PLAIN_TOAST_SECONDS = 4

export interface ScheduleToastProps {
  /** "Moved to Thu, Nov 26, 9:00 am" */
  message: string
  /** the customer is not told yet: shows Notify the customer */
  onNotify?: () => void
  onUndo?: () => void | Promise<unknown>
  onClose: () => void
  /** seconds before it closes itself; 0 keeps it up (the stories). Default 10, or 4 with no action */
  seconds?: number
}

export function ScheduleToast({ message, onNotify, onUndo, onClose, seconds }: ScheduleToastProps) {
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })
  const [paused, setPaused] = useState(false)
  const total = seconds ?? (onNotify || onUndo ? SCHEDULE_TOAST_SECONDS : PLAIN_TOAST_SECONDS)
  useEffect(() => {
    if (total <= 0 || paused) return
    const timer = setTimeout(() => close.current(), total * 1000)
    return () => clearTimeout(timer)
  }, [total, message, paused])
  if (typeof document === "undefined") return null
  return createPortal(
    <div onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <ToastBar
        message={<span className="font-semibold">{message}</span>}
        actions={[
          ...(onNotify ? [{ label: "Notify the customer", onClick: () => (onNotify(), onClose()) }] : []),
          ...(onUndo ? [{ label: "Undo", onClick: async () => (await onUndo(), onClose()) }] : []),
        ]}
        onClose={onClose}
        placement="bottom"
      />
    </div>,
    document.body,
  )
}
