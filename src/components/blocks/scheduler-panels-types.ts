import type { Town } from "@/lib/admin/types"

// The shapes the scheduler's side panels, Find a time, Notify and Jev's plan read (docs/plans/2026-11-25-scheduler-design.md, sections 7.6 to 7.11).
// Plain data in, strings already worded: a block never formats a date or a duration it was not given a word for.

/** A job with no day, one row of the Unscheduled panel. */
export interface UnscheduledJob {
  id: string
  customer: string
  town: Town
  /** "Spring turn-on" */
  service: string
  /** "1 h", "1 h 30 min" */
  length: string
  /** the day the job was made, YYYY-MM-DD: Oldest and Newest sort on it */
  addedOn: string
  lat?: number
  lng?: number
  /** the one quiet line of the best day and time, "Suggested: Thu, Nov 26, 9:00 am, Ryan Garner"; the row's Schedule button opens the Schedule dialog on it */
  suggestion?: string
}

/** A visit that moved and whose customer has not been notified. */
export interface NotToldVisit {
  id: string
  customer: string
  town: Town
  service: string
  /** "Tue, Nov 24, 9:00 am" */
  was: string
  /** "Thu, Nov 26, 9:00 am" */
  now: string
  phone?: string
  email?: string
}

/** One opening Find a time offers. `conflict` is set on a forced row: the engine's words for the first rule it breaks. */
export interface Opening {
  id: string
  /** YYYY-MM-DD */
  day: string
  /** HH:MM */
  start: string
  /** HH:MM */
  end: string
  personId: string
  personName: string
  /** minutes of driving this slot adds to the person's day */
  addedMinutes: number
  /** lower is better (section 2.2) */
  score: number
  /** office only: "Next to an Erie visit" */
  nextTo?: string
  conflict?: string
}

export type PlanKind = "move" | "stale" | "customer-picked"

/** One move in Jev's plan. */
export interface PlanMove {
  id: string
  /** the visit's street, "Dry Creek Rd" */
  visit: string
  /** "Tue, Dec 1" */
  from: string
  /** "Thu, Dec 3, 9:30 am" */
  to: string
  /** one plain reason, or the note on a stale or customer-picked row */
  reason: string
  kind: PlanKind
}
