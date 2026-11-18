// The one rule for a customer changing their own day, pure so the handler that enforces it and the screen that words it read the same
// facts (docs/plans/2026-11-18-customer-portal-design.md, "The reschedule rule"; Hannah's decision, Nov 18 2026: until two days
// before the day, then call). A visit with a window (a turn-on, an inspection, a blowout) that is booked or still needs a day, on a job that is sold and not
// canceled, may be moved to one of the offered days; after the cut-off the screen gives the phone number instead. Staff are not held to it.

/** A customer may change a booked day until this many days before it. */
export const CHANGE_CUTOFF_DAYS = 2

/** "yes": Change my day or Pick a day; "call": the day is too close, call Ryan; "no": nothing to change online. */
export type ChangeState = "yes" | "call" | "no"

export interface ChangeFacts {
  status: string
  scheduledOn: string | null
  /** the visit's kind has a season window in the settings (turn-on, inspection, blowout) */
  hasWindow: boolean
  /** the job is sold and not canceled (a pass: open) */
  jobOpen: boolean
}

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

/** Whether a booked day is still far enough off to move online: today is at least `CHANGE_CUTOFF_DAYS` before it. */
export const beforeCutoff = (scheduledOn: string, today: string): boolean => addDays(today, CHANGE_CUTOFF_DAYS) <= scheduledOn

export function changeFor(f: ChangeFacts, today: string): ChangeState {
  if (!f.hasWindow || !f.jobOpen) return "no"
  if (f.status === "unscheduled") return "yes"
  if (f.status !== "scheduled") return "no"
  return f.scheduledOn && !beforeCutoff(f.scheduledOn, today) ? "call" : "yes"
}
