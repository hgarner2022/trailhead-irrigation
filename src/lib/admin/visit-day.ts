/**
 * The one day an admin screen shows for a visit. A done visit is read by the day it was done (`completed_on`), the same day the customer's account
 * shows (`visitDay` in `src/lib/portal/words.ts`); any other visit by its scheduled day. The Week and Day grids keep the scheduled day (they are
 * where the work was planned, and say "Done early" / "Done late" through `doneNote`). Pure.
 */
import { TIME_ZONE } from "@/lib/admin/format"
import { dayOf } from "@/lib/admin/calendar"
import type { Visit } from "@/lib/admin/types"

type DayFacts = Pick<Visit, "status" | "scheduledOn" | "startAt" | "completedOn">

/** The day the visit was scheduled for, whatever its status. */
export const scheduledDayOf = (visit: Pick<Visit, "scheduledOn" | "startAt">): string | undefined =>
  visit.scheduledOn ?? (visit.startAt ? dayOf(visit.startAt, TIME_ZONE) : undefined)

/** A done visit's day is the day it was done; every other visit's is its scheduled day. */
export const visitDayOf = (visit: DayFacts): string | undefined =>
  visit.status === "completed" && visit.completedOn ? visit.completedOn : scheduledDayOf(visit)

/** The scheduled day of a done visit that was done on another day (the "was scheduled" line), else undefined. */
export function wasScheduledDay(visit: DayFacts): string | undefined {
  if (visit.status !== "completed" || !visit.completedOn) return undefined
  const scheduled = scheduledDayOf(visit)
  return scheduled && scheduled !== visit.completedOn ? scheduled : undefined
}
