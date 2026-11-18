import { z } from "zod"
import { yardShape } from "@/lib/admin/yard"
import { Channel, Day, Id, Iso, Preference, Town, VisitKind } from "../shared"
import { EventOut } from "../events/schemas"
import { PaymentOut } from "../payments/schemas"
import { LineOut } from "../visits/schemas"

export const MarketingChannels = z.array(Channel).describe("Channels the customer opted into for marketing.")

export const PropertyOut = z.object({
  id: Id,
  customerId: Id,
  town: Town,
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  address: z.string().optional().describe("Only for callers with the write scope."),
  ...yardShape,
})

export const ConsentOut = z.object({
  id: Id,
  termsVersion: z.string().nullable(),
  termsAcceptedAt: Iso.nullable(),
  marketingOptIn: z.boolean(),
  marketingChannels: MarketingChannels,
  source: z.enum(["checkout", "booking", "admin", "reply"]),
  recordedAt: Iso,
  note: z.string().nullable(),
})

/** What comes next for the customer: the first booked visit on or after today, else the first pass visit with no day, else a Jobber job with no visit. */
export const NextOut = z.object({
  state: z.enum(["scheduled", "to-schedule", "none"]),
  kind: VisitKind.optional(),
  on: Day.optional(),
  title: z.string().optional(),
})

export const CustomerOut = z.object({
  id: Id,
  firstName: z.string(),
  lastName: z.string().nullable(),
  email: z.string().nullable().optional().describe("Only for callers with the write scope."),
  phone: z.string().nullable().optional().describe("Only for callers with the write scope."),
  leadSource: z.string().nullable(),
  card: z.object({ brand: z.string().nullable(), last4: z.string().nullable(), expires: z.string().nullable().describe("YYYY-MM"), failedAt: Iso.nullable().describe("When the last charge to this card failed; cleared by the next success or a new card.") }).nullable().describe("The card on file, one per customer, charged after each visit; null when there is none."),
  createdAt: Iso,
})

/** A job is the sold work (a pass, or booked work); its visits are the stops. */
export const JobOut = z.object({
  id: Id,
  kind: z.enum(["pass", "repair", "install", "other"]),
  status: z.enum(["needs-a-quote", "quoted", "open", "done", "cancelled"]).describe("The job's stage, read from its facts (never typed): cancelled, done when every live visit is, then for work that is not a Season Pass quoted or needs-a-quote, else open."),
  price: z.number().int().nullable().describe("Whole dollars: the job total (its lines added up), null while it is 0."),
  source: z.enum(["checkout", "office", "site", "renewal"]),
  notes: z.string().nullable().describe("The text of the newest note about the job (its story holds every note)."),
  createdAt: Iso,
  passId: Id.nullable(),
  passNumber: z.string().nullable(),
  lines: z.array(LineOut).describe("What was sold on this job, oldest first."),
  total: z.number().int().describe("Whole dollars: the lines added up, cancelled lines left out."),
  payments: z.array(PaymentOut).describe("Every payment row on the job, oldest first; a refund is a negative row."),
  money: z.object({
    paid: z.number().int().describe("Whole dollars that arrived, refunds taken out."),
    total: z.number().int(),
    owed: z.number().int().describe("Whole dollars still owed, never below zero."),
    words: z.string().describe('"Paid", "Bill sent", "$115 owed", "2 of 3 paid, $115 owed", or empty for a job with no price and no money.'),
    billSent: z.boolean().describe("The job owes money and has an open bill (sent or overdue); the words read Bill sent."),
  }).describe("The job's money in words, read from its payment rows and its open bill."),
  invoiceId: Id.nullable().describe("The job's open bill, if there is one (see invoices.get)."),
  visits: z.array(z.object({ id: Id, kind: VisitKind, status: z.string(), scheduledOn: Day.nullable(), amount: z.number().int() })),
  events: z.array(EventOut).describe("The job's story: its newest 10 events and notes, newest first (events.list has the rest)."),
})

export const CustomerListItem = CustomerOut.extend({ town: Town.nullable(), address: z.string().nullable().optional().describe("The first property's street line. Only for callers with the write scope."), hasPass: z.boolean(), next: NextOut })
export const CustomerDetail = CustomerOut.extend({ properties: z.array(PropertyOut), consent: ConsentOut.nullable(), jobs: z.array(JobOut), events: z.array(EventOut).describe("The customer's story: their newest 50 events and notes, newest first (events.list has the rest)."), preference: Preference.optional() }).omit({ preference: true })

/** A text field of the yard: trimmed, and an empty answer is stored as null. */
const yardText = (max: number) => z.string().max(max).transform((v) => v.trim() || null).nullable().optional()
/** The nine fields of the yard, all optional. */
export const yardFields = {
  zones: z.number().int().min(1).max(16).nullable().optional(),
  controller: yardText(120),
  backflowLocation: yardText(200),
  gateCode: yardText(60),
  mustBeHome: z.boolean().optional(),
  accessNote: yardText(500),
  contactName: yardText(120),
  contactPhone: yardText(30),
  notes: yardText(1000),
}
export const propertyInput = z.object({ address: z.string().min(3).max(200), town: Town, ...yardFields })
export const customerFields = {
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).optional(),
  email: z.email().optional(),
  phone: z.string().min(7).max(30).optional(),
  leadSource: z.string().max(80).optional(),
}

export const consentInput = z.object({
  termsAccepted: z.boolean().default(false).describe("True when the customer accepted the terms with this record."),
  termsVersion: z.string().optional().describe("Defaults to the organization's current terms version."),
  marketingOptIn: z.boolean().default(false),
  marketingChannels: MarketingChannels.default([]),
  source: z.enum(["checkout", "booking", "admin", "reply"]),
  note: z.string().max(500).optional(),
})
