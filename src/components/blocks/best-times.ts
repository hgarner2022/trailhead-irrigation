import type { Opening } from "@/components/blocks/scheduler-panels-types"

// What the one Schedule dialog needs to list the best times and to draw that world's days (docs/plans/2026-11-25-scheduler-reconciliation.md, Part C step 3). Handed to
// `ScheduleDialog` / `SchedulePicker` as `best`; without it the dialog is the reviewed one, unchanged. `rows` are the openings that break no rule, ranked by the dialog;
// `stopsOf` is the day's booked stops so the start-time chips agree with the calendar; `problems` words what a chosen place breaks ("Ryan has Cheesman St at 9:00 am.").

export interface BestStop { start: number; minutes: number; name: string; town: string; person: string }

export interface BestTimes {
  /** ISO, the first day the calendar may pick from */
  today: string
  /** who may be chosen, by full name, in order */
  people: string[]
  rows: readonly Opening[]
  forced?: readonly Opening[]
  stopsOf: (iso: string) => BestStop[]
  /** a chosen day's own openings, ranked the same way, and the times of that day that break a rule (greyed, with their words) */
  dayRows?: (iso: string) => { rows: readonly Opening[]; forced: readonly Opening[] }
  /** quiet notes for a chosen day that do not stop it: "Outside this service's dates, Oct 1 to Oct 31." */
  notes?: (day: string) => string[]
  problems?: (place: { day: string; person: string; start: number | null }) => string[]
  /** a row already picked: the dialog opens on it (a row's suggestion, or the recommended time behind Schedule) */
  initialPickId?: string
  /** the day the visit being moved has now: the dialog opens "Another day" when it is not one of the rows */
  currentDay?: string
}
