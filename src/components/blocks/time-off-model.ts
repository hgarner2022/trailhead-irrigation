import { clock12 } from "@/lib/booking/day-time"

// The pure parts of the time off form (docs/plans/2026-11-25-scheduler-design.md, 7.9).

export interface TimeOffValue {
  personId: string
  allDay: boolean
  /** YYYY-MM-DD */
  from: string
  to: string
  /** HH:MM, used when not all day */
  startTime: string
  endTime: string
  /** staff only, at most 140 characters */
  note: string
}

export const NOTE_MAX = 140

/** Every half hour from 6:00 am to 8:00 pm, the choices for a start and an end. */
export const TIME_CHOICES: { value: string; label: string }[] = Array.from({ length: 29 }, (_, i) => {
  const minutes = 6 * 60 + i * 30
  const value = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
  return { value, label: clock12(value) }
})

/** What is wrong with the form, in words, by field; empty when it can be saved. */
export function timeOffProblems(v: TimeOffValue): Partial<Record<"to" | "endTime" | "from", string>> {
  const out: Partial<Record<"to" | "endTime" | "from", string>> = {}
  if (!v.from) out.from = "Pick the first day."
  if (v.from && v.to && v.to < v.from) out.to = "The last day is before the first day."
  if (!v.allDay && v.from && v.to === v.from && v.endTime <= v.startTime) out.endTime = "The end is before the start."
  return out
}
