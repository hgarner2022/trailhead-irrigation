import { z } from "zod"
import { yardShape } from "@/lib/admin/yard"
import { EventOut } from "../events/schemas"
import { PaymentOut } from "../payments/schemas"
import { Day, Id, Iso, Preference, Town, VisitKind, VisitStatus } from "../shared"

export const ExceptionOut = z.object({ kind: z.literal("moved-in-jobber"), at: Iso, note: z.string() })

export const LineOut = z.object({
  id: Id,
  name: z.string().describe('What was sold: "Spring turn-on".'),
  description: z.string().nullable().describe("What the visit includes, copied from the service at the sale."),
  quantity: z.number().int(),
  unitPrice: z.number().int().describe("Whole dollars."),
  taxable: z.boolean(),
  cancelledAt: Iso.nullable().describe("Set once the line is canceled; a canceled line counts nothing."),
  visitId: Id.nullable().describe("The visit the line is invoiced after; null for a line on the job as a whole."),
})

/** The yard the visit is at, as the property holds it: the one field list of `src/lib/admin/yard.ts`. */
export const YardOut = z.object(yardShape)

export const VisitOut = z.object({
  id: Id,
  passId: Id.nullable().describe("The Season Pass this visit belongs to: the id of its job when the job is a pass, else null."),
  jobId: Id.describe("The job (the pass or the booked work) this visit belongs to."),
  customerId: Id,
  firstName: z.string(),
  town: Town,
  kind: VisitKind,
  status: VisitStatus,
  window: z.string().nullable().describe('The month the visit lands in: "May", "July", "October".'),
  amount: z.number().int().describe("Whole dollars. The visit's own non-canceled lines added up; a visit with no line costs 0."),
  lineItems: z.array(LineOut).describe("Every line on the job this visit belongs to, oldest first."),
  payments: z.array(PaymentOut).describe("The visit's own payment rows, oldest first: the money that arrived for it and any refunds."),
  jobPaymentShares: z.array(PaymentOut).describe("The shares of payments made on the job as a whole (an invoice paid on the pay page) that cover this visit, as copies with the id `<paymentId>@<visitId>`; empty for most visits. Add them to `payments` for what has arrived for the visit. They are not rows of their own: refund the payment they name."),
  preference: Preference.nullable(),
  awaitingPick: z.boolean().describe("The customer must be there and has not picked a day."),
  personId: Id.nullable().describe("Who the visit is assigned to, once someone has it."),
  personName: z.string().nullable().describe("That person's name, 'Ryan Garner', once the visit has one."),
  truckId: Id.nullable().describe("Alias of personId, kept for one season: the same id."),
  truckName: z.string().nullable().describe("Alias of personName, kept for one season: the same name."),
  scheduledOn: Day.nullable(),
  startTime: z.string().nullable(),
  durationMinutes: z.number().int().nullable(),
  notes: z.string().nullable().describe("The text of the newest note about this visit (its story holds every note); null for a signed-in customer."),
  notDoneReason: z.string().nullable().describe("Why the last attempt did not happen; set by Not done, cleared when the visit gets a day."),
  paidBy: z.string().nullable().describe("How the visit was paid: card_on_file, card_now, check, venmo, cash or invoice; null before a payment."),
  paymentStatus: z.enum(["none", "paid", "pending", "failed"]).describe("The newest charge: none before one exists."),
  stopOrder: z.number().int().nullable(),
  confirmedAt: Iso.nullable(),
  completedOn: Day.nullable(),
  chargedAt: Iso.nullable().describe("Derived, never stored: when the newest payment arrived, once the visit is paid in full; null before that and after a refund leaves it unpaid."),
  exception: ExceptionOut.nullable(),
  jobberRequestUrl: z.string().nullable().describe("The Jobber request made for this visit by the routine; null until it has been."),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  address: z.string().optional().describe("Only for callers with the write scope."),
  events: z.array(EventOut).optional().describe("The visit's story: its newest 50 events and notes, newest first (events.list has the rest). Left out for a signed-in customer, who never reads events."),
  property: YardOut.describe("What is true about the yard: zones, controller, backflow, gate code, who must be home, the access note, the on-site contact, property notes."),
})
export type VisitOutType = z.infer<typeof VisitOut>

/** The webhook's word for who has the visit: `personId`, with `truckId` the same id for one season. */
export const who = (personId: string | null) => ({ personId, truckId: personId })
