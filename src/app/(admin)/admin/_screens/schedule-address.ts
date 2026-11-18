"use client"

import { useEffect } from "react"
import { weekOf } from "@/lib/admin/calendar"
import { TIME_ZONE } from "@/lib/admin/format"
import { setQueryInUrl } from "@/lib/admin/record-url"

// The Schedule's view, day and week in the address (`?view=`, `?day=`, `?week=`), so a reload or a shared link opens what is on screen and Back
// returns to it. Writing is a replace (a view is not a page to go back to) and leaves the open record and every other parameter alone; reading
// follows the browser's Back and Forward, so closing a record that was opened on another week shows that week again.

type View = "week" | "day" | "list"

/** A calendar day in the address; anything else is ignored. */
export const validDay = (value: string | null | undefined) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? value : undefined)

export function useScheduleAddress({ view, day, weekStart, setView, setDay, setWeekStart }: { view: View; day: string; weekStart: string; setView: (v: View) => void; setDay: (d: string) => void; setWeekStart: (w: string) => void }) {
  useEffect(() => {
    setQueryInUrl({ view: view === "week" ? undefined : view, day: view === "day" ? day : undefined, week: view === "week" ? weekStart : undefined })
  }, [view, day, weekStart])
  useEffect(() => {
    const follow = () => {
      const params = new URLSearchParams(window.location.search)
      const named = params.get("view")
      const dayNamed = validDay(params.get("day"))
      const weekNamed = validDay(params.get("week"))
      setView(named === "list" || named === "day" ? named : dayNamed ? "day" : "week")
      if (dayNamed) {
        setDay(dayNamed)
        setWeekStart(weekOf(dayNamed, TIME_ZONE))
      } else if (weekNamed) {
        setWeekStart(weekNamed)
        setDay(weekNamed)
      }
    }
    window.addEventListener("popstate", follow)
    return () => window.removeEventListener("popstate", follow)
  }, [setView, setDay, setWeekStart])
}
