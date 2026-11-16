import { z } from "zod"
import { Channel, Day, Id, Iso, Preference, Town, VisitKind } from "../shared"

export const MarketingChannels = z.array(Channel).describe("Channels the customer opted into for marketing.")

export const PropertyOut = z.object({ id: Id, town: Town, lat: z.number().nullable(), lng: z.number().nullable(), address: z.string().optional().describe("Only for callers with the write scope.") })

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
  visits: z.array(z.object({ id: Id, kind: VisitKind, status: z.string(), scheduledOn: Day.nullable(), amount: z.number().int() })),
})

export const CustomerListItem = CustomerOut.extend({ town: Town.nullable(), address: z.string().nullable().optional().describe("The first property's street line. Only for callers with the write scope."), hasPass: z.boolean(), next: NextOut })
export const CustomerDetail = CustomerOut.extend({ properties: z.array(PropertyOut), consent: ConsentOut.nullable(), jobs: z.array(JobOut), preference: Preference.optional() }).omit({ preference: true })

export const propertyInput = z.object({ address: z.string().min(3).max(200), town: Town })
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
