import { z } from "zod"
import { Id, Iso, PassStatus, Preference, Town } from "../shared"
import { ConsentOut, consentInput, customerFields, propertyInput } from "../customers/schemas"
import { VisitOut } from "../visits/schemas"
import { MAX_ZONES, MIN_ZONES } from "@/lib/season-pass"

export const PassOut = z.object({
  id: Id,
  number: z.string().describe("TH-<season>-NNNN."),
  season: z.number().int(),
  customerId: Id,
  propertyId: Id,
  firstName: z.string(),
  town: Town,
  zones: z.number().int(),
  inspection: z.boolean().describe("The July inspection add-on."),
  status: PassStatus,
  turnOnPreference: Preference,
  blowoutPreference: Preference,
  needsCustomerHome: z.boolean(),
  accessNote: z.string().nullable().optional().describe("Gate code, dog, where the controller is. Only for callers with the write scope."),
  cardBrand: z.string().nullable(),
  cardLast4: z.string().nullable(),
  cardExpires: z.string().nullable(),
  cardFailedAt: Iso.nullable(),
  cancelledAt: Iso.nullable(),
  createdAt: Iso,
})

export const ChargeOut = z.object({
  id: Id,
  visitId: Id,
  attempt: z.number().int(),
  amount: z.number().int().describe("Whole dollars."),
  status: z.enum(["pending", "succeeded", "failed", "refunded"]),
  failureMessage: z.string().nullable(),
  createdAt: Iso,
})

export const PassDetail = PassOut.extend({
  visits: z.array(VisitOut),
  charges: z.array(ChargeOut),
  consent: ConsentOut.nullable(),
  customer: z.object({ id: Id, firstName: z.string(), lastName: z.string().nullable(), email: z.string().nullable(), phone: z.string().nullable() }).optional().describe("Only for callers with the write scope."),
  address: z.string().optional().describe("Only for callers with the write scope."),
  price: z.number().int().describe("What the pass's visits cost in total, whole dollars."),
})

export const passCreateInput = z.object({
  passId: Id.optional().describe("The pending pass this checkout already holds; when it is still pending for the same email it is updated instead of a second one being made."),
  customer: z.object({ ...customerFields, email: z.email(), lastName: customerFields.lastName }),
  property: propertyInput.extend({ state: z.string().length(2).optional().describe("Two letters, from the picked address."), zip: z.string().max(10).optional() }),
  zones: z.number().int().min(MIN_ZONES).max(MAX_ZONES),
  inspection: z.boolean().default(false),
  turnOnPreference: Preference.default("recommended"),
  blowoutPreference: Preference.default("recommended"),
  needsCustomerHome: z.boolean().default(false).describe("The customer must be there; the visit waits for them to pick a day."),
  accessNote: z.string().max(500).optional(),
  consent: consentInput
    .extend({ termsAccepted: z.literal(true).describe("Required: the terms must be accepted to buy a pass."), source: z.enum(["checkout", "booking", "admin", "reply"]).default("checkout") })
    .optional()
    .describe("Recorded now when given (an agent or the admin). The checkout leaves it out and sends the consent with `passes.activate`, when the card is saved."),
})

/** The card step's boxes as ticked when the card form opened; the terms are required, the rest default to off. */
export const checkoutConsentInput = z.object({
  termsAccepted: z.literal(true).describe("Required: the terms were accepted on the card step."),
  marketingOptIn: z.boolean().default(false),
  marketingChannels: z.array(z.enum(["email", "sms"])).default([]).describe("The ticked marketing boxes; `sms` is dropped when the customer has no phone."),
})

export const passConsentInput = z.object({ id: Id, consent: checkoutConsentInput })

export const passActivateInput = z.object({
  id: Id,
  setupSessionId: z.string().min(1).describe("The Stripe Checkout Session in setup mode that saved the card."),
  consent: checkoutConsentInput
    .optional()
    .describe("The checkout's consent, appended once when the pass first turns active. When left out, the snapshot recorded by `passes.consent` is used."),
})
