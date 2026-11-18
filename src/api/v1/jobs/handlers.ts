import "server-only"
import { and, desc, eq, sql } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { changedFields } from "@/lib/events/diff"
import { enqueueGeocode } from "@/lib/geocode"
import { recordEvent, whoOf } from "@/lib/events/record"
import { LINE_NAMES } from "@/lib/jobs/lines"
import { cleanText } from "@/lib/format/contact"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { cleanContact, cleanYard } from "../customers/handlers"
import { customerFields, propertyInput } from "../customers/schemas"
import { emitEvent } from "../webhooks/deliver"
import { Day, Id, Iso, today } from "../shared"

/** The street line of the property a job gets when nothing says where the work is (the website form's address is optional). The notes carry the real words. */
export const PLACEHOLDER_ADDRESS = "Address needed"
export const PLACEHOLDER_TOWN = "Erie"

const NewCustomer = z.object({ ...customerFields, email: z.email() })

const JobCreated = z.object({
  id: Id,
  customerId: Id,
  propertyId: Id,
  source: z.enum(["office", "site"]),
  needsQuote: z.boolean(),
  soldOn: Day.nullable().describe("The Mountain day the work was sold; empty while the job needs a quote."),
  createdAt: Iso,
})

export const jobsCreate = defineHandler({
  name: "jobs.create",
  method: "POST",
  path: "/jobs",
  scope: "write",
  status: 201,
  summary:
    "Make a job. With `needsQuote` it is work still to be quoted: no sold day, no quote sent, one unpriced line from the service (the notes as its description), no visit, source site, and the story reads \"Quote asked for online\"; the website's contact form makes these. Without it, the office takes a one-off job (sold today, the service's own price, no visit yet). Give an existing customer by id, or a name and email (found by email, else made). Where the work is: a property id, an address and town, else the customer's newest property.",
  input: z.object({
    customerId: Id.optional(),
    customer: NewCustomer.optional().describe("Found by email (any case) in this organization, else made."),
    propertyId: Id.optional().describe("One of the customer's properties."),
    property: propertyInput.optional().describe("An address and town: the customer's property at that address, else a new one."),
    serviceKey: z.string().min(2).max(40).describe("The catalogue service the job is for (services.list)."),
    notes: z.string().trim().max(2000).optional().describe("What the customer wrote or the office noted; the line's description on a job that needs a quote."),
    needsQuote: z.boolean().optional(),
  }),
  output: JobCreated,
  async run(ctx, input) {
    if (!input.customerId === !input.customer) throw new ApiError("invalid", "Choose an existing customer or give a name and email", [{ path: "customerId", message: "Give a customerId or a customer, not both" }])
    const org = ctx.organizationId
    const needsQuote = input.needsQuote === true
    // The service is checked before any customer row is made, so a refused service leaves nothing behind.
    const [service] = await ctx.db.select().from(s.service).where(and(eq(s.service.organizationId, org), eq(s.service.key, input.serviceKey)))
    if (!service || !service.active) throw new ApiError("invalid", "That service is not offered", [{ path: "serviceKey", message: "No active service has that key" }])

    let customerId = input.customerId
    if (customerId) {
      const [c] = await ctx.db.select({ id: s.customer.id }).from(s.customer).where(and(eq(s.customer.id, customerId), eq(s.customer.organizationId, org)))
      if (!c) throw notFound("Customer")
    } else {
      const email = cleanContact(input.customer!).email!
      const [found] = await ctx.db.select({ id: s.customer.id }).from(s.customer).where(and(eq(s.customer.organizationId, org), sql`lower(${s.customer.email}) = ${email.toLowerCase()}`)).orderBy(s.customer.createdAt).limit(1)
      if (found) customerId = found.id
      else {
        const fields = input.customer!
        const [made] = await ctx.db.insert(s.customer).values({ organizationId: org, ...fields, ...cleanContact(fields), leadSource: needsQuote ? "website" : "office" }).returning()
        customerId = made!.id
        await recordEvent(ctx.db, { organizationId: org, about: "customer", aboutId: customerId, customerId, kind: "customer.edited", detail: { created: true, changed: changedFields({}, { firstName: made!.firstName, lastName: made!.lastName, email: made!.email, phone: made!.phone, leadSource: made!.leadSource }) }, who: whoOf(ctx), at: ctx.now })
      }
    }

    const properties = await ctx.db.select().from(s.property).where(and(eq(s.property.customerId, customerId), eq(s.property.organizationId, org))).orderBy(desc(s.property.createdAt), desc(s.property.id))
    let propertyId: string
    if (input.propertyId) {
      const own = properties.find((p) => p.id === input.propertyId)
      if (!own) throw new ApiError("unprocessable", "That property does not belong to this customer")
      propertyId = own.id
    } else if (input.property) {
      const address = cleanText(input.property.address)
      const same = properties.find((p) => p.address.trim().toLowerCase() === address.toLowerCase() && p.town === input.property!.town)
      if (same) propertyId = same.id
      else {
        const [made] = await ctx.db.insert(s.property).values({ organizationId: org, customerId, address, town: input.property.town, ...cleanYard(input.property) }).returning({ id: s.property.id })
        propertyId = made!.id
        await enqueueGeocode(ctx.db, org, propertyId, ctx.now)
      }
    } else if (properties[0]) {
      propertyId = properties[0].id
    } else {
      // No address anywhere: a placeholder the office replaces when they call back.
      const [made] = await ctx.db.insert(s.property).values({ organizationId: org, customerId, address: PLACEHOLDER_ADDRESS, town: PLACEHOLDER_TOWN }).returning({ id: s.property.id })
      propertyId = made!.id
    }

    const soldOn = needsQuote ? null : today(ctx)
    const source = needsQuote ? ("site" as const) : ("office" as const)
    const [job] = await ctx.db.insert(s.job).values({ organizationId: org, customerId, propertyId, source, soldOn }).returning()
    // One line from the service. A quote job's is unpriced and carries the customer's words; the office's one-off takes the service's price.
    const name = needsQuote ? service.name : (LINE_NAMES[service.kind] ?? service.name)
    await ctx.db.insert(s.lineItem).values({
      organizationId: org, jobId: job!.id, serviceId: service.id, visitId: null, name,
      description: needsQuote ? (input.notes ?? null) : service.description,
      quantity: 1, unitPrice: needsQuote ? 0 : (service.price ?? 0), taxable: service.taxable,
      createdAt: ctx.now, updatedAt: ctx.now,
    })
    if (needsQuote) {
      await recordEvent(ctx.db, { organizationId: org, about: "job", aboutId: job!.id, customerId, jobId: job!.id, kind: "job.requested", detail: { source, name, serviceKey: service.key }, who: whoOf(ctx), at: ctx.now })
      await emitEvent(ctx.db, org, "request.received", { jobId: job!.id, customerId })
    } else {
      await recordEvent(ctx.db, { organizationId: org, about: "job", aboutId: job!.id, customerId, jobId: job!.id, kind: "job.sold", detail: { source, name, kind: service.kind }, who: whoOf(ctx), at: ctx.now })
      if (input.notes) await recordEvent(ctx.db, { organizationId: org, about: "job", aboutId: job!.id, customerId, jobId: job!.id, kind: "note", detail: { text: input.notes }, who: whoOf(ctx), at: ctx.now })
    }
    return { id: job!.id, customerId, propertyId, source, needsQuote, soldOn, createdAt: job!.createdAt.toISOString() }
  },
})
