"use client"

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { weekdayName } from "@/lib/admin/calendar"
import { firstNameOf } from "@/lib/admin/people"
import type { Person } from "@/lib/admin/types"
import { cn } from "@/lib/utils"
import { keyTarget, monthOf, monthTitle, monthWeeks, shiftMonth, stopsWords, townsLine, type MonthDay } from "./month-grid-model"
import { HATCH_STYLE, personStyle } from "./time-grid-style"

// The Month view (docs/plans/2026-11-25-scheduler-design.md, 7.4): each day a button with its stop count, up to two towns then "+1", a dot for each
// person working it in their colour, a hatch when someone is off (the whole cell when everyone is), a small mark when the day holds a move the customer
// has not been told about, and today marked. A cell opens that day (`onOpenDay`; the screen goes to Day). A real grid for keyboard and screen readers,
// as DayCalendar is: one cell in the Tab order, arrows by day and week, Home and End to the ends of the week, Page Up and Page Down by month.
// On a phone a cell shows the count only. No drag. Controlled: the screen holds the month. Pure props.

export interface MonthGridProps {
  /** YYYY-MM */
  month: string
  days: readonly MonthDay[]
  /** colour order, and the names for "Tech off" */
  people: readonly Person[]
  today?: string
  selectedDay?: string
  /** the other agent's bell for a not-told day; a small gold dot when absent */
  notToldMark?: ReactNode
  onOpenDay?: (day: string) => void
  onMonthChange?: (month: string) => void
  className?: string
}

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function MonthGrid({ month, days, people, today, selectedDay, notToldMark, onOpenDay, onMonthChange, className }: MonthGridProps) {
  const grid = useRef<HTMLDivElement>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const by = new Map(days.map((d) => [d.day, d]))
  const first = `${month}-01`
  const tabDay = (focus && monthOf(focus) === month ? focus : null) ?? (selectedDay && monthOf(selectedDay) === month ? selectedDay : null) ?? (today && monthOf(today) === month ? today : first)
  const moveTo = (day: string) => {
    setFocus(day)
    if (monthOf(day) !== month) onMonthChange?.(monthOf(day))
    requestAnimationFrame(() => grid.current?.querySelector<HTMLElement>(`[data-day="${day}"]`)?.focus())
  }
  const onKey = (e: KeyboardEvent<HTMLElement>, day: string) => {
    const t = keyTarget(e.key, day)
    if (!t) return
    e.preventDefault()
    moveTo(t)
  }
  const nameOf = (id: string) => firstNameOf(people.find((p) => p.id === id)?.name) ?? "Someone"

  return (
    <div data-slot="month-grid" className={cn("min-w-0", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <button type="button" aria-label="Previous month" onClick={() => onMonthChange?.(shiftMonth(month, -1))} className="flex size-11 cursor-pointer items-center justify-center rounded-lg border border-border text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"><ChevronLeft aria-hidden className="size-5" /></button>
        <h2 aria-live="polite" className="font-display text-2xl leading-none text-navy">{monthTitle(month)}</h2>
        <button type="button" aria-label="Next month" onClick={() => onMonthChange?.(shiftMonth(month, 1))} className="flex size-11 cursor-pointer items-center justify-center rounded-lg border border-border text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"><ChevronRight aria-hidden className="size-5" /></button>
      </div>
      <div ref={grid} role="grid" aria-label={monthTitle(month)} className="overflow-hidden rounded-lg border border-border bg-border">
        <div role="row" className="grid grid-cols-7 gap-px">
          {WEEK.map((w) => <div key={w} role="columnheader" className="bg-background py-1.5 text-center text-xs font-medium text-navy-light">{w}</div>)}
        </div>
        {monthWeeks(month).map((week, i) => (
          <div key={i} role="row" className="mt-px grid grid-cols-7 gap-px">
            {week.map((day, j) => {
              if (!day) return <div key={j} role="gridcell" aria-hidden className="min-h-14 bg-stone md:min-h-24" />
              const d = by.get(day)
              const stops = d?.stops ?? 0
              const isToday = day === today
              const off = d?.offIds ?? []
              const label = [
                `${weekdayName(day)}, ${Number(day.slice(8))}`, isToday && "today", stops ? `${stopsWords(stops)}${d?.towns.length ? ` in ${townsLine(d.towns)}` : ""}` : "no stops",
                d?.allOff ? "everyone off" : off.length ? `${off.map(nameOf).join(" and ")} off` : false, d?.notTold && "a move the customer has not been notified about",
              ].filter(Boolean).join(", ")
              return (
                <div key={day} role="gridcell" aria-selected={selectedDay === day} className="relative bg-background">
                  <button
                    type="button"
                    data-day={day}
                    aria-label={label}
                    tabIndex={day === tabDay ? 0 : -1}
                    onClick={() => onOpenDay?.(day)}
                    onKeyDown={(e) => onKey(e, day)}
                    onFocus={() => setFocus(day)}
                    style={d?.allOff ? { ...HATCH_STYLE, "--hatch": "var(--color-navy)" } as React.CSSProperties : undefined}
                    className={cn("relative flex min-h-14 w-full cursor-pointer flex-col items-start gap-0.5 p-1.5 text-left transition-colors hover:bg-cream focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy md:min-h-24", selectedDay === day && "bg-cream ring-2 ring-inset ring-navy")}
                  >
                    <span aria-hidden className={cn("flex size-6 items-center justify-center rounded-full text-sm tabular-nums", isToday ? "bg-navy font-semibold text-white" : "text-navy")}>{Number(day.slice(8))}</span>
                    {stops > 0 && <span aria-hidden className="font-display text-xl leading-none text-navy md:text-lg">{stops}<span className="hidden text-xs font-sans text-navy-light md:inline">{stops === 1 ? " stop" : " stops"}</span></span>}
                    {d && d.towns.length > 0 && <span aria-hidden className="hidden max-w-full truncate text-xs text-navy-light md:block">{townsLine(d.towns)}</span>}
                    {d && d.personIds.length > 0 && (
                      <span aria-hidden className="mt-auto hidden gap-1 md:flex">
                        {d.personIds.map((id) => <span key={id} className={cn("size-2 rounded-full", personStyle(Math.max(0, people.findIndex((p) => p.id === id))).dot)} />)}
                      </span>
                    )}
                  </button>
                  {off.length > 0 && !d?.allOff && (
                    <span aria-hidden data-slot="month-off" className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-2 border-t border-border/60", personStyle(Math.max(0, people.findIndex((p) => p.id === off[0]))).hatch)} style={HATCH_STYLE} />
                  )}
                  {d?.notTold && <span data-slot="month-not-told" aria-hidden className="pointer-events-none absolute right-0.5 top-0.5">{notToldMark ?? <span className="block size-2 rounded-full bg-warning" />}</span>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-navy-light">
        {people.map((p, i) => <span key={p.id} className="inline-flex items-center gap-1.5"><span aria-hidden className={cn("size-2 rounded-full", personStyle(i).dot)} />{p.name}</span>)}
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full bg-warning" />A move not notified</span>
      </p>
    </div>
  )
}
