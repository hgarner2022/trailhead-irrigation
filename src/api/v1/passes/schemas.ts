import { z } from "zod"
import { Day, Id, Iso, PassStatus, Preference, Town } from "../shared"
import { ConsentOut, consentInput, customerFields, propertyInput } from "../customers/schemas"
import { VisitOut } from "../visits/schemas"
import { MAX_ZONES, MIN_ZONES } from "@/lib/season-pass"

export const PassOut = z.object({
  id: Id.describe("The pass's job id. A pass id the old pass table gave out (in a link, a message, a stored key) still opens the same pass, and the answer says the job id."),
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
  visits: z.array(VisitOut.extend({ calendarUrl: z.string().nullable().describe("The signed link to this visit's .ics calendar file, once it has a day; null before, or where the server has no signing key.") })),
  charges: z.array(ChargeOut),
  consent: ConsentOut.nullable(),
  customer: z.object({ id: Id, firstName: z.string(), lastName: z.string().nullable(), email: z.string().nullable(), phone: z.string().nullable() }).optional().describe("Only for callers with the write scope."),
  address: z.string().optional().describe("Only for callers with the write scope."),
  price: z.number().int().describe("What the pass's visits cost in total, whole dollars."),
})

export const ChosenDay = z
  .object({
    kind: z.enum(["turn-on", "inspection", "blowout"]),
    day: Day,
    personId: Id.optional().describe("The person offered with the day."),
    truckId: Id.optional().describe("Alias of personId, kept for one season: the same id."),
    start: z.string().regex(/^\d{2}:\d{2}$/).describe("HH:MM, the start of the two-hour window offered with the day."),
  })
  .refine((d) => d.personId !== undefined || d.truckId !== undefined, { message: "Give the person offered with the day", path: ["personId"] })

/** A chosen day as the pass modules take it: the person under one name. */
export const chosenDay = (d: z.infer<typeof ChosenDay>) => ({ kind: d.kind, day: d.day, start: d.start, personId: (d.personId ?? d.truckId)! })

export const passCreateInput = z.object({
  passId: Id.optional().describe("The pending pass this checkout already holds; when it is still pending for the same email it is updated instead of a second one being made."),
  customer: z.object({ ...customerFields, email: z.email(), lastName: customerFields.lastName }),
  property: propertyInput.extend({ state: z.string().length(2).optional().describe("Two letters, from the picked address."), zip: z.string().max(10).optional() }),
  zones: z.number().int().min(MIN_ZONES).max(MAX_ZONES),
  inspection: z.boolean().default(false),
  turnOnPreference: Preference.default("recommended"),
  blowoutPreference: Preference.default("recommended"),
  needsCustomerHome: z.boolean().optional().describe("A note for Ryan: the customer cannot be reached without being home. It no longer holds a visit back; every visit gets a day."),
  days: z.array(ChosenDay).max(3).default([]).describe("The days the customer picked on the checkout's \"Your days\" step, one per visit at most. A day that is no longer open is dropped, and the visit is left for the scheduler. `passes.activate` puts each on its truck."),
  renewOf: Id.optional().describe("The pass this one renews: its address, zones and add-on fill what the call leaves out, and its customer holds the new pass."),
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

/** The day the office typed for each visit kind; a kind left out, or blank, leaves that visit with no day yet. */
export const SellDays = z.object({ "turn-on": Day.optional(), inspection: Day.optional(), blowout: Day.optional() })

export const passSellInput = z.object({
  customerId: Id.optional().describe("An existing customer. Give this or `newCustomer`, not both."),
  propertyId: Id.optional().describe("One of the customer's properties; the first when left out."),
  email: z.email().optional().describe("For an existing customer with no email on file: recorded on the customer, since the confirmation and the pass card go by email."),
  newCustomer: z
    .object({ ...customerFields, lastName: z.string().min(1).max(80), email: z.email().describe("Required: the confirmation goes by email."), property: propertyInput, accessNote: z.string().max(500).optional() })
    .optional(),
  zones: z.number().int().min(MIN_ZONES).max(MAX_ZONES),
  inspection: z.boolean().default(false).describe("The July inspection add-on."),
  days: SellDays.default({}).describe("A day per visit, each optional. A day goes through the same rules as a move: a day that is not open goes to the next open one and the move is recorded as `day-filled`, which the confirmation says."),
  paysBy: z.enum(["card-link", "at-visit"]).describe("`card-link`: the confirmation carries a link to add the card, charged after each visit once added. `at-visit`: no card; Done asks how each visit was paid (check, Venmo or cash)."),
  termsAccepted: z.literal(true).describe("Required: the terms were read to the customer and accepted; recorded as consent with source `admin`."),
  notes: z.string().trim().max(1000).optional().describe("Kept on the job."),
})

export const passActivateInput = z.object({
  id: Id,
  setupSessionId: z.string().min(1).describe("The Stripe Checkout Session in setup mode that saved the card."),
  consent: checkoutConsentInput
    .optional()
    .describe("The checkout's consent, appended once when the pass first turns active. When left out, the snapshot recorded by `passes.consent` is used."),
})
