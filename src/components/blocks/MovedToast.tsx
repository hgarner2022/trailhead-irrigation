"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { ToastBar } from "./UndoToast"

// What the screen says after any move (docs/plans/2026-11-25-scheduler-design.md, 7.8). A move never texts anyone, so the toast says "Visit moved" (or "Visit scheduled" for a first
// placement, or "11 visits moved" after a plan is accepted) and offers Notify (Notify all after a plan) and Undo, with a close. It hides itself after ten seconds; the visit keeps its
// Not told mark afterwards, so nothing is lost. It draws the same bar as UndoToast (one toast look in the app), portalled to the body above any panel. Notify and Undo each run
// their callback and then close the toast. `seconds` 0 turns the timer off, for a story. Pure props, client component.

export const MOVED_SECONDS = 10

export interface MovedToastProps {
  /** "Visit moved", "Visit scheduled" or "11 visits moved" */
  title: string
  /** what moved, "Briggs St to Thu, Apr 30, 9:00 am" */
  detail?: string
  /** a plan was accepted: the action reads Notify all */
  many?: boolean
  onNotify: () => void
  onUndo: () => void | Promise<unknown>
  onClose: () => void
  /** 10 by default; 0 keeps it up */
  seconds?: number
}

export function MovedToast({ title, detail, many = false, onNotify, onUndo, onClose, seconds = MOVED_SECONDS }: MovedToastProps) {
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })
  useEffect(() => {
    if (seconds <= 0) return
    const timer = setTimeout(() => close.current(), seconds * 1000)
    return () => clearTimeout(timer)
  }, [seconds, title, detail])
  if (typeof document === "undefined") return null
  return createPortal(
    <ToastBar
      message={
        <>
          <span className="font-semibold">{title}</span>
          {detail ? <span className="text-white/85">{`. ${detail}`}</span> : null}
        </>
      }
      actions={[
        { label: many ? "Notify all" : "Notify", onClick: () => (onNotify(), onClose()) },
        { label: "Undo", onClick: async () => (await onUndo(), onClose()) },
      ]}
      onClose={onClose}
      placement="bottom"
    />,
    document.body,
  )
}
