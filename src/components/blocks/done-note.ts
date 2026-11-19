import type { Visit } from "@/lib/admin/types"

// What the Schedule says about a visit that is done: nothing when it was done on its scheduled day, "Done early" when the done day is before it
// and "Done late" when it is after (a repair marked done on Thursday that was set for Friday reads as work ahead without this). Pure.

export const isDone = (visit: Pick<Visit, "status">): boolean => visit.status === "completed"

export function doneNote(visit: Pick<Visit, "status" | "scheduledOn" | "completedOn">): string | undefined {
  if (!isDone(visit) || !visit.completedOn || !visit.scheduledOn || visit.completedOn === visit.scheduledOn) return undefined
  return visit.completedOn < visit.scheduledOn ? "Done early" : "Done late"
}
