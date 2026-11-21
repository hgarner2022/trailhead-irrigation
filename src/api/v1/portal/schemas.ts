import { z } from "zod"
import { Day, Id, VisitKind, VisitStatus } from "../shared"
import { LineOut } from "../visits/schemas"

// What the customer's account reads, and nothing more: no notes, no events, no Jobber links, no coordinates, no other person's
// surname, no staff-only yard fact. Every field below was chosen for a screen in `/account` (docs/plans/2026-11-18-customer-portal-design.md).

/** One stop on a job as its customer sees it. A person appears by first name only. */
export const PortalVisit = z.object({
  id: Id,
  jobId: Id,
  kind: VisitKind,
  name: z.string().describe('What the visit is called: "Spring turn-on".'),
  status: VisitStatus,
  scheduledOn: Day.nullable(),
  completedOn: Day.nullable().describe("The day the visit was marked done; a done visit is read by this day, not the day it was scheduled for."),
  canceledOn: Day.nullable().describe("The day a canceled or skipped visit was canceled: the day of its `visit.cancelled` event (a visit has no cancelled_at). Null for any other visit."),
  windowTold: z.boolean().describe("The day-before message for this visit on its present day exists: only then does the customer see the time of a Season Pass visit."),
  window: z.string().nullable().describe('The exact start, "10:30 am", only when `windowTold` or the visit was booked at a time; never the office\'s estimated start time before the customer was told.'),
  month: z.string().nullable().describe('The month the visit lands in: "May".'),
  personFirstName: z.string().nullable().describe("The first name of whoever has the visit."),
  price: z.number().int().describe("Whole dollars with sales tax: what the visit's live lines come to; 0 when it is unpriced or canceled."),
  money: z.object({ tone: z.enum(["paid", "unpaid", "invoice-sent", "past-due", "none"]), label: z.string(), paymentIds: z.array(Id) }).describe("The customer's word for the visit's money (Paid, $115 unpaid, Invoice sent, due Dec 1, Past due since Dec 1, or empty) and the payments that paid it."),
  mustBeHome: z.boolean().describe("The property says someone must be home."),
  notDoneReason: z.string().nullable().describe("Why the last try did not happen, until the visit has a day again."),
  reschedule: z.enum(["yes", "text", "no"]).describe("yes: the customer may pick or change the day online; text: it is inside 24 hours (or a kind whose days are set with Ryan), so Text Ryan; no: nothing to do online."),
  cancel: z.enum(["yes", "text", "no"]).describe("yes: the customer may cancel online; text: inside 24 hours, so Text Ryan; no: nothing to cancel."),
  cancelsBy: z.string().nullable().describe('The last minute the customer may change it online: "Sunday, April 26, 11:59 pm"; null with no day.'),
})
export type PortalVisitType = z.infer<typeof PortalVisit>

export const PortalPayment = z.object({
  id: Id,
  visitId: Id.nullable(),
  amount: z.number().int().describe("Whole dollars; negative for a refund."),
  method: z.enum(["card_on_file", "card_now", "check", "venmo", "cash", "bill"]),
  reference: z.string().nullable().describe("The check number or Venmo handle the customer gave."),
  paidOn: Day.nullable(),
  refundsPaymentId: Id.nullable(),
  receiptUrl: z.string().nullable().describe("The card receipt, when the payment has one; check, Venmo and cash payments print a receipt page instead."),
})

/** An invoice the customer holds: sent, paid or past due. A voided or draft one is never carried. */
export const PortalInvoice = z.object({
  id: Id,
  number: z.string(),
  total: z.number().int(),
  sentOn: Day,
  dueOn: Day,
  paidOn: Day.nullable(),
  status: z.enum(["sent", "paid", "overdue"]),
  payUrl: z.string().nullable().describe("The pay page for this open invoice, signed for the customer; null once paid."),
})

export const PortalJob = z.object({
  id: Id,
  name: z.string().describe('"Season Pass 2027", or the first line sold: "Repair".'),
  kind: z.enum(["pass", "repair", "install", "other"]),
  passId: Id.nullable().describe("The Season Pass id (the job's own) when the job is a pass."),
  season: z.number().int().nullable(),
  passNumber: z.string().nullable(),
  soldOn: Day,
  canceled: z.boolean(),
  open: z.boolean().describe("The job still has work ahead that the customer can act on: sold, not canceled and, for a Season Pass, in its season. A past season's leftover visit is not shown as coming up."),
  stage: z.enum(["open", "done", "cancelled"]),
  address: z.string().describe("The property's street line."),
  town: z.string().describe("The property's town."),
  lines: z.array(LineOut).describe("What was sold, oldest first; a canceled line is struck through on screen."),
  total: z.number().int().describe("Whole dollars: the live lines with their sales tax."),
  money: z.object({ paid: z.number().int(), owed: z.number().int(), words: z.string() }),
  visits: z.array(PortalVisit),
  payments: z.array(PortalPayment).describe("What arrived and any refunds, oldest first; a payment that failed is left out."),
  invoices: z.array(PortalInvoice).describe("The sent, past-due and paid invoices, oldest first."),
})
export type PortalJobType = z.infer<typeof PortalJob>

/** A property as its customer sees it: every yard fact the customer knows best, the office's own property notes left out. */
export const PortalProperty = z.object({
  id: Id,
  address: z.string(),
  town: z.string(),
  zones: z.number().int().nullable(),
  controller: z.string().nullable(),
  backflowLocation: z.string().nullable(),
  gateCode: z.string().nullable(),
  mustBeHome: z.boolean(),
  accessNote: z.string().nullable(),
  contactName: z.string().nullable(),
  contactPhone: z.string().nullable(),
})

export const PortalCustomer = z.object({
  id: Id,
  firstName: z.string(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  hasHeldPass: z.boolean().describe("The customer has bought a Season Pass at some point (a pending one does not count): the Season Pass tab shows only for them."),
  card: z.object({ brand: z.string().nullable(), last4: z.string().nullable(), expires: z.string().nullable(), failedAt: z.string().nullable() }).nullable(),
  properties: z.array(PortalProperty),
})
export type PortalCustomerType = z.infer<typeof PortalCustomer>

/** A payment as a printable receipt: built from the payment row, with the job it paid for and the property it was at. */
export const ReceiptOut = z.object({
  id: Id,
  business: z.object({ name: z.string(), phone: z.string() }),
  customerName: z.string(),
  address: z.string().nullable(),
  jobName: z.string().nullable(),
  lines: z.array(z.object({ name: z.string(), quantity: z.number().int(), unitPrice: z.number().int() })),
  amount: z.number().int(),
  method: z.enum(["card_on_file", "card_now", "check", "venmo", "cash", "bill"]),
  reference: z.string().nullable(),
  paidOn: Day.nullable(),
  receiptUrl: z.string().nullable(),
  /** "What we did": the visit's checklist and the photos Ryan shared with the customer (`shown_to_customer`, the visit done); absent when the invoice this paid left the report out, or the payment has no visit */
  report: z.object({ items: z.array(z.object({ label: z.string(), done: z.boolean() })), photos: z.array(z.object({ url: z.string() })) }).optional(),
})
export type ReceiptOutType = z.infer<typeof ReceiptOut>
