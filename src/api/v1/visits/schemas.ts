import { z } from "zod"
import { Day, Id, Iso, Preference, Town, VisitKind, VisitStatus } from "../shared"

export const ExceptionOut = z.object({ kind: z.literal("moved-in-jobber"), at: Iso, note: z.string() })

export const VisitOut = z.object({
  id: Id,
  passId: Id.nullable(),
  bookingId: Id.nullable(),
  customerId: Id,
  firstName: z.string(),
  town: Town,
  kind: VisitKind,
  status: VisitStatus,
  window: z.string().nullable().describe('The month the visit lands in: "May", "July", "October".'),
  amount: z.number().int().describe("Whole dollars."),
  preference: Preference.nullable(),
  awaitingPick: z.boolean().describe("The customer must be there and has not picked a day."),
  truckId: Id.nullable(),
  truckName: z.string().nullable().describe("The truck's name, 'Truck 1', once a truck has the visit."),
  scheduledOn: Day.nullable(),
  startTime: z.string().nullable(),
  durationMinutes: z.number().int().nullable(),
  stopOrder: z.number().int().nullable(),
  confirmedAt: Iso.nullable(),
  completedOn: Day.nullable(),
  chargedAt: Iso.nullable(),
  exception: ExceptionOut.nullable(),
  jobberRequestUrl: z.string().nullable().describe("The Jobber request made for this visit by the routine; null until it has been."),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  address: z.string().optional().describe("Only for callers with the write scope."),
})
export type VisitOutType = z.infer<typeof VisitOut>
