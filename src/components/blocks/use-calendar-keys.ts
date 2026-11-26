"use client"

import { useEffect, useRef, useState } from "react"

/** The calendar's shortcuts, in the order the "?" list shows them. */
export const CALENDAR_KEYS: readonly { keys: string; does: string }[] = [
  { keys: "d", does: "Day view" },
  { keys: "w", does: "Week view" },
  { keys: "m", does: "Month view" },
  { keys: "t", does: "Go to today" },
  { keys: "j or n", does: "Next day, week or month" },
  { keys: "k or p", does: "Last day, week or month" },
  { keys: "?", does: "Show this list" },
]

export type CalendarView = "day" | "week" | "month"
export interface CalendarKeyActions { onView?: (view: CalendarView) => void; onToday?: () => void; onNext?: () => void; onPrev?: () => void }

const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.closest("[role=dialog],[role=menu]") !== null)

/**
 * Keyboard shortcuts for the Schedule: d, w and m switch Day, Week and Month; t goes to today; j or n next, k or p last; "?" opens the list.
 * Ignored while typing in a field, with a menu or dialog open, or with Ctrl, Cmd or Alt held (Cmd+K is the search's). Returns the list's open state.
 */
export function useCalendarKeys(actions: CalendarKeyActions, enabled = true) {
  const [helpOpen, setHelpOpen] = useState(false)
  const ref = useRef(actions)
  useEffect(() => { ref.current = actions })
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return
      const a = ref.current
      const k = e.key
      if (k === "d") a.onView?.("day")
      else if (k === "w") a.onView?.("week")
      else if (k === "m") a.onView?.("month")
      else if (k === "t") a.onToday?.()
      else if (k === "j" || k === "n") a.onNext?.()
      else if (k === "k" || k === "p") a.onPrev?.()
      else if (k === "?") setHelpOpen((o) => !o)
      else return
      e.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [enabled])
  return { helpOpen, setHelpOpen }
}
