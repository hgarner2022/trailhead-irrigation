"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { ToastBar } from "./UndoToast"

// What the screen says after a visit is moved or scheduled (docs/plans/2026-11-25-scheduler-reconciliation.md, Part C step 3): the app's own UndoToast bar, at the bottom centre
// on a laptop and above the tab bar on a phone, with "Notify the customer" and "Undo" ("Moved to Thu, Nov 26, 9:00 am", "Scheduled for ..."). When the Schedule dialog already told the
// customer the bar offers Undo alone. It closes itself after `seconds` (10 by default, 0 keeps it up for a story); the visit keeps its "not notified" mark, so nothing is lost.
// Notify and Undo each run their callback and then close. Pure props, client component.

export const SCHEDULE_TOAST_SECONDS = 10

export interface ScheduleToastProps {
  /** "Moved to Thu, Nov 26, 9:00 am" */
  message: string
  /** the customer was already notified: Undo alone */
  notified?: boolean
  onNotify: () => void
  onUndo: () => void | Promise<unknown>
  onClose: () => void
  seconds?: number
}

export function ScheduleToast({ message, notified = false, onNotify, onUndo, onClose, seconds = SCHEDULE_TOAST_SECONDS }: ScheduleToastProps) {
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })
  useEffect(() => {
    if (seconds <= 0) return
    const timer = setTimeout(() => close.current(), seconds * 1000)
    return () => clearTimeout(timer)
  }, [seconds, message])
  if (typeof document === "undefined") return null
  return createPortal(
    <ToastBar
      message={<span className="font-semibold">{message}</span>}
      actions={[
        ...(notified ? [] : [{ label: "Notify the customer", onClick: () => (onNotify(), onClose()) }]),
        { label: "Undo", onClick: async () => (await onUndo(), onClose()) },
      ]}
      onClose={onClose}
      placement="bottom"
    />,
    document.body,
  )
}
