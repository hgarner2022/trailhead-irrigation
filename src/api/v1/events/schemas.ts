import { z } from "zod"
import { EVENT_ABOUT } from "@/lib/events/kinds"
import { Id, Iso } from "../shared"

/** The longest note: the same ceiling the visit's notes column took. */
export const NOTE_TEXT_MAX = 2000

/** One thing that happened, or one note, about a customer, property, job, visit, payment or invoice. */
export const EventOut = z.object({
  id: Id,
  about: z.enum(EVENT_ABOUT).describe("The kind of record it is about."),
  aboutId: Id.describe("The id of that record."),
  customerId: Id.nullable().describe("The customer it belongs to; null only for an event with no customer."),
  jobId: Id.nullable().describe("The job it belongs to, when it has one."),
  visitId: Id.nullable().describe("The visit it belongs to, when it has one."),
  kind: z.string().describe("`record.verb`: visit.done, payment.refunded, invoice.sent, job.sold, consent, note and the rest of the vocabulary."),
  detail: z.record(z.string(), z.unknown()).describe("What it recorded, as the kind says. A note's is `{ text }`. For a caller without the write scope, money, gate and contact fields are left out."),
  who: z.string().describe("The signed-in person's email, `customer`, `system` (the scheduler, a cron, a webhook) or `api` (an API key)."),
  whoName: z.string().nullable().describe("That person's name when `who` is a person of the organization."),
  at: Iso,
})
export type EventOutType = z.infer<typeof EventOut>
