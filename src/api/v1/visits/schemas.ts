import { z } from "zod"
import { Day, Id, Iso, Preference, Town, VisitKind, VisitStatus } from "../shared"

export const ExceptionOut = z.object({ kind: z.literal("moved-in-jobber"), at: Iso, note: z.string() })

export const VisitOut = z.object({
  id: Id,
  passId: Id.nullable(),
  bookingId: Id.nullable().describe("The old booking row; new jobs have none."),
  jobId: Id.describe("The job (the pass or the booked work) this visit belongs to."),
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
  notes: z.string().nullable().describe("Notes on this visit, from the office."),
  notDoneReason: z.string().nullable().describe("Why the last attempt did not happen; set by Not done, cleared when the visit gets a day."),
  paidBy: z.string().nullable().describe("How the visit was paid: card_on_file, card_now, check, venmo, cash or bill; null before a payment."),
  paymentStatus: z.enum(["none", "paid", "pending", "failed"]).describe("The newest charge: none before one exists."),
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
