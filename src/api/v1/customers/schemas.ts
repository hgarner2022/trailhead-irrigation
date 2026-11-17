import { z } from "zod"
import { Channel, Day, Id, Iso, Preference, Town, VisitKind } from "../shared"
import { LineOut } from "../visits/schemas"

export const MarketingChannels = z.array(Channel).describe("Channels the customer opted into for marketing.")

export const PropertyOut = z.object({
  id: Id,
  customerId: Id,
  town: Town,
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  address: z.string().optional().describe("Only for callers with the write scope."),
  zones: z.number().int().nullable(),
  controller: z.string().nullable(),
  backflowLocation: z.string().nullable(),
  gateCode: z.string().nullable().optional().describe("Only for callers with the write scope."),
  mustBeHome: z.boolean(),
  accessNote: z.string().nullable().optional().describe("Only for callers with the write scope."),
  contactName: z.string().nullable(),
  contactPhone: z.string().nullable().optional().describe("Only for callers with the write scope."),
  notes: z.string().nullable(),
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
  createdAt: Iso,
})

/** A job is the sold work (a pass, or booked work); its visits are the stops. */
export const JobOut = z.object({
  id: Id,
  kind: z.enum(["pass", "repair", "install", "other"]),
  status: z.enum(["pending", "active", "done", "cancelled"]),
  price: z.number().int().nullable().describe("Whole dollars; null until quoted."),
  source: z.enum(["checkout", "office", "site"]),
  notes: z.string().nullable(),
  createdAt: Iso,
  passId: Id.nullable(),
  passNumber: z.string().nullable(),
  lines: z.array(LineOut).describe("What was sold on this job, oldest first."),
  total: z.number().int().describe("Whole dollars: the lines added up, cancelled lines left out."),
  visits: z.array(z.object({ id: Id, kind: VisitKind, status: z.string(), scheduledOn: Day.nullable(), amount: z.number().int() })),
})

export const CustomerListItem = CustomerOut.extend({ town: Town.nullable(), address: z.string().nullable().optional().describe("The first property's street line. Only for callers with the write scope."), hasPass: z.boolean(), next: NextOut })
export const CustomerDetail = CustomerOut.extend({ properties: z.array(PropertyOut), consent: ConsentOut.nullable(), jobs: z.array(JobOut), preference: Preference.optional() }).omit({ preference: true })

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
