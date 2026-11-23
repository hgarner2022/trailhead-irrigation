"use client"

import { useId, useRef, useState, type KeyboardEvent } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { FormRow } from "@/components/blocks/FormRow"
import { Textarea } from "@/components/ui/textarea"
import { TimeChips } from "@/components/blocks/TimeChips"
import { DAYS_FULL, type DayTimeOffer, type DayTimePick, type StartOption } from "@/lib/booking/day-time"
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/nav"
import { longDay } from "@/lib/portal/words"
import { cn } from "@/lib/utils"

// The day-and-time question as a calendar (docs/plans/2026-11-23-booking-day-time-and-repeat-research.md, docs/plans/2026-11-19-booking-form-design.md "Third pass"): one month at a time as a grid, a quiet dot on
// every day with an opening, days with none plain and not pressable, and the SOONEST open day already chosen, with an orange dot (Hannah, Nov 22 2026: always steer to the soonest). Picking a day shows its
// times under the grid, earliest first; a time is never chosen for the customer. The chosen day and the chosen time settle in with one 160 ms scale (`settle`, base.css), once, and nothing pulses; under
// prefers-reduced-motion they just are chosen. The month arrows replace any button for more days. A real grid for keyboard and screen readers (WAI-ARIA date picker grid): one day in the Tab order (roving tabindex),
// arrows move by day and week, Page Up and Page Down by month, Home and End to the week's ends, Enter or Space picks; each day is a 44px button named with its weekday and date. No sentence about where
// Ryan is on which day, and no marked best time. Controlled; the screen holds the pick. With no day open it says so and offers a box for when would suit. Pure props, client component.
//
// It is the one day picker of the whole product (Hannah, Nov 23 2026: "the calendar should be everywhere"): the booking form, the Season Pass days, the customer's Reschedule, and the office's Move, New job,
// Schedule and "Done on". Four optional switches, all backward-compatible: `timed={false}` asks only for a day (the customer picks no time on a Season Pass visit or a day-only Reschedule; no times show);
// `current` marks the day the visit has now, "Your day"; `free` is the office's calendar, where any day in a range may be chosen and the open days from `offers` keep their dot; `anyTime` puts "Any time"
// first among the times for the office; `density="sheet"` is the tighter spacing for a dialog or sheet, whose body scrolls under a fixed header and button.

export interface DayCalendarProps {
  offers: readonly DayTimeOffer[]
  value: DayTimePick
  onChange: (next: DayTimePick) => void
  /** names the grid for a screen reader: "Pick your day", "Your spring turn-on" */
  legend: string
  /** the level of the month heading: 2 when the step's own heading is the h1, 3 under a heading of its own */
  headingLevel?: 2 | 3
  /** the box under a full calendar, when a screen offers one */
  note?: string
  onNote?: (text: string) => void
  className?: string
  /** false: only a day is asked for. Every offer is an open day and no times show. Default true. */
  timed?: boolean
  /** the day the visit has now, marked "Your day" (it need not be an open day) */
  current?: string | null
  /** the words for the current day's mark; default "Your day" */
  currentLabel?: string
  /** the office's calendar: any day from `from` to `to` (a year on by default) may be chosen; the days in `offers` keep their dot. `timesFor` gives a day outside the offers its start times. */
  free?: { from: string; to?: string; timesFor?: (day: string) => readonly StartOption[] }
  /** "Any time" first among the times, chosen while `value.start` is null (the office; a customer is always given a time) */
  anyTime?: boolean
  /** one line under the times' heading */
  timesHint?: string
  /** "sheet": tighter spacing for a dialog or sheet */
  density?: "page" | "sheet"
  /** a step's shell focuses `[data-autofocus]` when it opens: put it on the day in the tab order */
  autoFocusDay?: boolean
  /** a date with no year (a service's "bookable from", repeating every year): the heading and the days read "April 15", no weekday names; give it the days of one leap year */
  yearless?: boolean
}

const WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const iso = (d: Date) => d.toISOString().slice(0, 10)
const at = (day: string) => new Date(`${day}T12:00:00Z`)
const add = (day: string, n: number) => iso(new Date(at(day).getTime() + n * 86_400_000))
const monthOf = (day: string) => day.slice(0, 7)
const shiftMonth = (ym: string, n: number) => iso(new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1, 12))).slice(0, 7)

/** The weeks of a month, Sunday first, with null for the days that belong to the months around it. */
function weeksOf(ym: string, yearless = false): (string | null)[][] {
  // a year-less month has no weekdays, so its first day opens the first row
  const first = yearless ? { getUTCDay: () => 0 } : at(`${ym}-01`)
  const days = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate()
  const cells: (string | null)[] = [...Array(first.getUTCDay()).fill(null), ...Array.from({ length: days }, (_, i) => `${ym}-${String(i + 1).padStart(2, "0")}`)]
  while (cells.length % 7) cells.push(null)
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7))
}

const LINK = "inline-flex min-h-11 items-center font-semibold text-primary-deep underline underline-offset-2"

export function DayCalendar({ offers, value, onChange, legend, headingLevel = 2, note = "", onNote, className, timed = true, current: yourDay = null, currentLabel = "Your day", free, anyTime = false, timesHint, density = "page", autoFocusDay = false, yearless = false }: DayCalendarProps) {
  const Month = headingLevel === 2 ? "h2" : "h3"
  const id = useId()
  const grid = useRef<HTMLTableElement>(null)
  const open = new Map(offers.filter((o) => !timed || o.times.length > 0).map((o) => [o.day, o]))
  const days = [...open.keys()].sort()
  const soonest = days[0] ?? null
  const freeTo = free ? (free.to ?? add(free.from, 365)) : null
  const edges = [...days, ...(free ? [free.from, freeTo!] : []), ...(yourDay ? [yourDay] : [])].sort()
  const first = monthOf(edges[0] ?? "2000-01-01")
  const last = monthOf(edges.at(-1) ?? "2000-01-01")
  const [month, setMonth] = useState(() => monthOf(value.day ?? soonest ?? free?.from ?? yourDay ?? "2000-01-01"))
  const [focus, setFocus] = useState<string | null>(null)
  const sheet = density === "sheet"
  const dayWords = (day: string) => (yearless ? `${MONTHS[+day.slice(5, 7) - 1]} ${+day.slice(8)}` : longDay(day))
  // the column a day sits in: its weekday, or (year-less, where the first of the month opens the row) its place in the week of seven
  const column = (day: string) => (yearless ? (+day.slice(8) - 1) % 7 : at(day).getUTCDay())
  const monthWords = yearless ? MONTHS[+month.slice(5) - 1] : `${MONTHS[+month.slice(5) - 1]} ${month.slice(0, 4)}`
  const isOpenDay = (day: string) => open.has(day) || (free !== undefined && day >= free.from && day <= freeTo!)

  if (days.length === 0 && !free)
    return (
      <div data-slot="day-calendar" data-state="full" className={cn("space-y-3", className)}>
        <p role="status" className="text-base text-foreground">
          {DAYS_FULL}
        </p>
        {onNote && (
          <FormRow label="When would suit you?" hint="Optional.">
            <Textarea value={note} onChange={(e) => onNote(e.target.value)} className="min-h-24 text-base" />
          </FormRow>
        )}
        <p className="text-base text-muted-foreground">
          {"Or call Ryan at "}
          <a href={PHONE_TEL} className={LINK}>
            {PHONE_DISPLAY}
          </a>
          .
        </p>
      </div>
    )

  const held = value.day && isOpenDay(value.day) ? value.day : null
  const heldTimes: readonly StartOption[] = held ? (open.get(held)?.times ?? free?.timesFor?.(held) ?? []) : []
  const showTimes = timed && held !== null && (heldTimes.length > 0 || anyTime || open.has(held))
  const firstOpen = days.find((d) => monthOf(d) === month) ?? (free && monthOf(free.from) === month ? free.from : null)
  const tabDay = (focus && monthOf(focus) === month ? focus : null) ?? (value.day && monthOf(value.day) === month ? value.day : null) ?? firstOpen ?? `${month}-01`
  const pickDay = (day: string) => onChange({ day, start: value.day === day ? value.start : null })
  const moveTo = (day: string) => {
    setFocus(day)
    setMonth(monthOf(day))
    requestAnimationFrame(() => grid.current?.querySelector<HTMLElement>(`[data-day="${day}"]`)?.focus())
  }
  const onKey = (e: KeyboardEvent<HTMLElement>, day: string) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (e.key in step) moveTo(add(day, step[e.key]!))
    else if (e.key === "PageUp" || e.key === "PageDown") moveTo(add(`${shiftMonth(monthOf(day), e.key === "PageUp" ? -1 : 1)}-01`, +day.slice(8) - 1))
    else if (e.key === "Home") moveTo(add(day, -column(day)))
    else if (e.key === "End") moveTo(add(day, 6 - column(day)))
    else return
    e.preventDefault()
  }
  const soonestMark = (day: string) => day === soonest

  return (
    <div data-slot="day-calendar" className={cn(sheet ? "space-y-5" : "space-y-8", className)}>
      <div>
        <div className="flex items-center justify-between gap-2">
          <button type="button" aria-label="Previous month" disabled={month <= first} onClick={() => setMonth(shiftMonth(month, -1))} className="flex size-11 cursor-pointer items-center justify-center rounded-lg border border-border text-navy disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <Month id={`${id}-month`} aria-live="polite" className={cn("font-display leading-none text-navy", sheet ? "text-xl" : "text-2xl")}>{monthWords}</Month>
          <button type="button" aria-label="Next month" disabled={month >= last} onClick={() => setMonth(shiftMonth(month, 1))} className="flex size-11 cursor-pointer items-center justify-center rounded-lg border border-border text-navy disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>
        <table ref={grid} role="grid" aria-label={`${legend}, ${monthWords}`} className="mt-3 w-full table-fixed border-separate border-spacing-y-1">
          {!yearless && (
            <thead>
              <tr>
                {WEEK.map((w) => (
                  <th key={w} scope="col" abbr={w} className="pb-1 text-center text-sm font-medium text-muted-foreground">
                    {w.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {weeksOf(month, yearless).map((week, i) => (
              <tr key={i}>
                {week.map((day, j) => {
                  if (!day) return <td key={j} />
                  const enabled = isOpenDay(day)
                  const selected = value.day === day
                  const mark = soonestMark(day)
                  const yours = day === yourDay
                  const dotted = open.has(day)
                  return (
                    <td key={day} aria-selected={selected} className="p-0 text-center">
                      <button
                        type="button"
                        data-day={day}
                        data-soonest={day === soonest || undefined}
                        data-current={yours || undefined}
                        data-autofocus={(autoFocusDay && day === tabDay) || undefined}
                        aria-pressed={selected}
                        aria-disabled={!enabled || undefined}
                        aria-label={`${dayWords(day)}${mark ? ", soonest" : ""}${yours ? `, ${currentLabel.toLowerCase()}` : ""}${enabled ? "" : free ? ", not available" : timed ? ", no times open" : ", not open"}`}
                        tabIndex={day === tabDay ? 0 : -1}
                        onClick={() => enabled && pickDay(day)}
                        onKeyDown={(e) => onKey(e, day)}
                        onFocus={() => setFocus(day)}
                        className={cn(
                          "relative mx-auto flex h-11 w-full max-w-11 flex-col items-center justify-center rounded-lg text-base tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1",
                          selected ? "settle bg-navy font-semibold text-white" : enabled ? "cursor-pointer border border-border bg-background text-navy hover:border-navy/50" : "cursor-not-allowed text-muted-foreground/50",
                          yours && (selected ? "ring-2 ring-inset ring-white/70" : "border-2 border-navy font-semibold text-navy"),
                        )}
                      >
                        <span aria-hidden>{+day.slice(8)}</span>
                        {dotted && <span aria-hidden className={cn("absolute bottom-1 size-1.5 rounded-full", mark ? (selected ? "bg-primary-light" : "bg-primary") : selected ? "bg-white/60" : "bg-navy/30")} />}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {(soonest !== null || yourDay) && (
          <p data-slot="calendar-legend" className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            {soonest !== null && (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="size-1.5 rounded-full bg-navy/30" />
                  Open
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                  Soonest
                </span>
              </>
            )}
            {yourDay && (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-3 rounded-sm border-2 border-navy" />
                {currentLabel}
              </span>
            )}
          </p>
        )}
      </div>

      {showTimes && held && (
        <div key={held}>
          <TimeChips options={heldTimes} value={value.start} onChange={(start) => onChange({ day: held, start })} anyTime={anyTime} legend={longDay(held)} hint={timesHint} density={density} />
          {heldTimes.length === 0 && !anyTime && <p className="mt-3 text-base text-muted-foreground">No times are left on this day. Pick another day.</p>}
        </div>
      )}
    </div>
  )
}
