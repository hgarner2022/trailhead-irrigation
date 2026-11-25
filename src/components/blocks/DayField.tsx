"use client"

import { useId, useState } from "react"
import { CalendarDays, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DayCalendar } from "@/components/blocks/DayCalendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { FormRow } from "@/components/blocks/FormRow"
import { OFFICE_STARTS, clock12, type DayTimeOffer, type StartOption } from "@/lib/booking/day-time"
import { longDay } from "@/lib/portal/words"
import { cn } from "@/lib/utils"

// A day (and, when asked, a time) in a form of the admin: one field that reads the answer ("Tuesday, November 24 at 9:00 am", or "No day yet") and opens the one calendar (`DayCalendar`, the office's
// mode: any day in the range may be chosen) under itself, so a form with three days (a Season Pass's visits) is not three calendars tall until one is wanted. It is the calendar, not a second picker:
// the day settles in with its one short scale and the times, when asked for, are the calendar's own. `clearable` adds the way back to "No day yet" for a day that is optional. Pure props, client.

export interface DayFieldProps {
  label: string
  /** the day held, "2026-11-24"; "" while there is none */
  value: string
  /** the start held, "09:00"; "" for any time (only with `timed`) */
  start?: string
  onChange: (day: string, start: string) => void
  /** the first and last day that may be chosen; the last defaults to a year on */
  from: string
  to?: string
  /** also ask for a start time, "Any time" first */
  timed?: boolean
  /** the starts a day offers; default every half hour, 7:00 am to 5:00 pm */
  timesFor?: (day: string) => readonly StartOption[]
  /** days with an opening, when the screen knows them: they carry the calendar's dot and the soonest its orange one */
  offers?: readonly DayTimeOffer[]
  /** the day may be left empty, with a "Clear the day" button once one is chosen */
  clearable?: boolean
  /** the words while no day is held */
  empty?: string
  hint?: string
  /** a calendar that starts open */
  defaultOpen?: boolean
  className?: string
}

export function DayField({ label, value, start = "", onChange, from, to, timed = false, timesFor, offers = [], clearable = false, empty = "No day yet", hint, defaultOpen = false, className }: DayFieldProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panel = useId()
  const words = value ? `${longDay(value)}${timed ? ` at ${start ? clock12(start) : "any time"}` : ""}` : empty
  return (
    <div data-slot="day-field" className={cn("space-y-3", className)}>
      <FormRow label={label} hint={hint}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panel}
          aria-label={`${label}, ${words}`}
          onClick={() => setOpen(!open)}
          className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 text-left text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 md:text-sm"
        >
          <CalendarDays aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn("min-w-0 flex-1 truncate", !value && "text-muted-foreground")}>{words}</span>
          <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </FormRow>
      {open && (
        <div id={panel} data-slot="day-field-calendar" className="rounded-lg border border-border p-3">
          <DayCalendar
            offers={offers}
            free={{ from, ...(to ? { to } : {}), timesFor: timesFor ?? (() => OFFICE_STARTS) }}
            timed={timed}
            anyTime={timed}
            density="sheet"
            headingLevel={3}
            legend={label}
            value={{ day: value || null, start: start || null }}
            // the time chosen stays with the visit when only the day changes
            onChange={(next) => onChange(next.day ?? "", next.day !== value ? start : (next.start ?? ""))}
          />
          {clearable && value && (
            <Button type="button" variant="ghost" className="mt-2 min-h-11 px-0 font-semibold text-primary-deep underline underline-offset-2 hover:bg-transparent" onClick={() => onChange("", "")}>
              Clear the day
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// A plain date field (Hannah, Nov 23 2026: every date is chosen on the one calendar): the same trigger as `DayField`, with the calendar in a popover under it, for a place with no room to open one in the
// flow, such as a row of Settings or the Schedule's Move strip. It reads the day in words, or `empty`. With `yearless` the value is "MM-DD" (a service's bookable-from day, repeating every year) and the
// calendar is the days of one leap year with no weekdays. `from` and `to` bound it. Choosing a day closes it. Pure props, client.

export interface DayPopoverFieldProps {
  id?: string
  /** names the button for a screen reader: "Spring turn-on bookable from" */
  label: string
  /** "2026-11-24", or "04-15" with `yearless`; "" or null while none */
  value: string | null
  onChange: (value: string | null) => void
  /** bounds as "2026-11-24" (ignored with `yearless`, which is one whole year) */
  from?: string
  to?: string
  yearless?: boolean
  /** the words while no day is held */
  empty?: string
  /** a "Clear the day" button inside the popover once a day is held */
  clearable?: boolean
  className?: string
}

const LEAP = 2028
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

export function DayPopoverField({ id, label, value, onChange, from, to, yearless = false, empty = "No day yet", clearable = false, className }: DayPopoverFieldProps) {
  const [open, setOpen] = useState(false)
  const iso = value ? (yearless ? `${LEAP}-${value}` : value) : ""
  const words = value ? (yearless ? `${MONTH_NAMES[+value.slice(0, 2) - 1]} ${+value.slice(3, 5)}` : longDay(value)) : empty
  const range = yearless ? { from: `${LEAP}-01-01`, to: `${LEAP}-12-31` } : { from: from!, ...(to ? { to } : {}) }
  const set = (day: string | null) => {
    onChange(day ? (yearless ? day.slice(5) : day) : null)
    setOpen(false)
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          aria-label={`${label}, ${words}`}
          className={cn("flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 text-left text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 md:min-h-9 md:text-sm", className)}
        >
          <CalendarDays aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn("min-w-0 flex-1 truncate", !value && "text-muted-foreground")}>{words}</span>
          <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label={label} data-slot="day-popover" className="max-h-[min(80svh,var(--radix-popover-content-available-height))] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto p-3 data-[state=closed]:animate-none data-[state=open]:animate-none">
        <DayCalendar offers={[]} free={range} timed={false} yearless={yearless} density="sheet" headingLevel={3} legend={label} value={{ day: iso || null, start: null }} onChange={(next) => next.day && set(next.day)} />
        {clearable && value && (
          <Button type="button" variant="ghost" className="mt-2 min-h-11 px-0 font-semibold text-primary-deep underline underline-offset-2 hover:bg-transparent" onClick={() => set(null)}>
            Clear the day
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
