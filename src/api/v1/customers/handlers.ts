import "server-only"
import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { enqueueGeocode } from "@/lib/geocode"
import { defineHandler } from "../../core/handler"
import { notFound } from "../../core/errors"
import type { Ctx } from "../../core/context"
import { afterTimeCursor, cursorPage, page, pageInput, timeCursor } from "../../core/pagination"
import { canSeeContact, idInput, iso, today } from "../shared"
import { ConsentOut, consentInput, CustomerDetail, CustomerListItem, CustomerOut, customerFields, propertyInput } from "./schemas"
import { cleanEmail, cleanName, normalizePhone } from "@/lib/format/contact"

type CustomerRow = typeof s.customer.$inferSelect
type ConsentRow = typeof s.consent.$inferSelect


/** The contact fields a caller sent, cleaned the way they are stored and print; fields not sent stay absent. */
function cleanContact(f: { firstName?: string; email?: string; phone?: string | null }) {
  return {
    ...(f.firstName !== undefined ? { firstName: cleanName(f.firstName) } : {}),
    ...(f.email !== undefined ? { email: cleanEmail(f.email) } : {}),
    ...(f.phone !== undefined ? { phone: f.phone === null ? null : (normalizePhone(f.phone) ?? f.phone) } : {}),
  }
}

export const customerOut = (ctx: Ctx, row: CustomerRow) => ({
  id: row.id,
  firstName: row.firstName,
  lastName: row.lastName,
  ...(canSeeContact(ctx) ? { email: row.email, phone: row.phone } : {}),
  leadSource: row.leadSource,
  createdAt: row.createdAt.toISOString(),
})

export const consentOut = (c: ConsentRow) => ({
  id: c.id,
  termsVersion: c.termsVersion,
  termsAcceptedAt: iso(c.termsAcceptedAt) ?? null,
  marketingOptIn: c.marketingOptIn,
  marketingChannels: c.marketingChannels,
  source: c.source,
  recordedAt: c.recordedAt.toISOString(),
  note: c.note,
})

/** The newest consent row is the current state. */
export async function latestConsent(db: Database, customerId: string) {
  const [row] = await db.select().from(s.consent).where(eq(s.consent.customerId, customerId)).orderBy(desc(s.consent.recordedAt), desc(s.consent.id)).limit(1)
  return row
}

export async function getCustomerRow(ctx: Ctx, id: string) {
  const [row] = await ctx.db.select().from(s.customer).where(and(eq(s.customer.id, id), eq(s.customer.organizationId, ctx.organizationId)))
  if (!row) throw notFound("Customer")
  return row
}

async function nextFor(ctx: Ctx, rows: CustomerRow[]) {
  const ids = rows.map((r) => r.id)
  const day = today(ctx)
  const visits = ids.length
    ? await ctx.db
        .select({ customerId: s.visit.customerId, kind: s.visit.kind, on: s.visit.scheduledOn, status: s.visit.status })
        .from(s.visit)
        .where(and(inArray(s.visit.customerId, ids), inArray(s.visit.status, ["scheduled", "unscheduled"])))
        .orderBy(asc(s.visit.scheduledOn))
    : []
  const jobberIds = rows.flatMap((r) => (r.jobberClientId ? [r.jobberClientId] : []))
  const jobs = jobberIds.length
    ? await ctx.db
        .select({ clientId: s.jobberJob.clientId, title: s.jobberJob.title })
        .from(s.jobberJob)
        .where(and(inArray(s.jobberJob.clientId, jobberIds), eq(s.jobberJob.hasVisit, false), eq(s.jobberJob.status, "open")))
    : []
  return new Map(
    rows.map((r) => {
      const mine = visits.filter((v) => v.customerId === r.id)
      const booked = mine.find((v) => v.status === "scheduled" && v.on && v.on >= day)
      const waiting = mine.find((v) => v.status === "unscheduled")
      const job = jobs.find((j) => j.clientId === r.jobberClientId)
      const next = booked
        ? { state: "scheduled" as const, kind: booked.kind, on: booked.on ?? undefined }
        : waiting
          ? { state: "to-schedule" as const, kind: waiting.kind }
          : job
            ? { state: "to-schedule" as const, title: job.title ?? undefined }
            : { state: "none" as const }
      return [r.id, next]
    }),
  )
}

export const customersList = defineHandler({
  name: "customers.list",
  method: "GET",
  path: "/customers",
  scope: "read",
  summary: "List customers, newest first, with what comes next for each. Search by name; by email or phone with the write scope.",
  input: z.object({ q: z.string().max(100).optional().describe("Matches names; also emails and phones for callers with the write scope."), ...pageInput }),
  output: page(CustomerListItem),
  async run(ctx, input) {
    const q = input.q?.trim()
    const like = q ? `%${q.replace(/[%_\\]/g, "\\$&")}%` : undefined
    const search = like
      ? or(
          sql`${s.customer.firstName} ilike ${like}`,
          sql`${s.customer.lastName} ilike ${like}`,
          ...(canSeeContact(ctx) ? [sql`${s.customer.email} ilike ${like}`, sql`${s.customer.phone} ilike ${like}`] : []),
        )
      : undefined
    const rows = await ctx.db
      .select()
      .from(s.customer)
      .where(and(eq(s.customer.organizationId, ctx.organizationId), search, afterTimeCursor(s.customer.createdAt, s.customer.id, input.cursor)))
      .orderBy(desc(s.customer.createdAt), desc(s.customer.id))
      .limit(input.limit + 1)
    const result = cursorPage(rows, input.limit, timeCursor)
    const ids = result.data.map((r) => r.id)
    const next = await nextFor(ctx, result.data)
    const towns = ids.length ? await ctx.db.select({ customerId: s.property.customerId, town: s.property.town }).from(s.property).where(inArray(s.property.customerId, ids)) : []
    const passes = ids.length
      ? await ctx.db.select({ customerId: s.seasonPass.customerId }).from(s.seasonPass).where(and(inArray(s.seasonPass.customerId, ids), ne(s.seasonPass.status, "cancelled")))
      : []
    return {
      next_cursor: result.next_cursor,
      data: result.data.map((r) => ({
        ...customerOut(ctx, r),
        town: towns.find((t) => t.customerId === r.id)?.town ?? null,
        hasPass: passes.some((p) => p.customerId === r.id),
        next: next.get(r.id)!,
      })),
    }
  },
})

export const customersGet = defineHandler({
  name: "customers.get",
  method: "GET",
  path: "/customers/{id}",
  scope: "read",
  summary: "One customer with their properties and current consent.",
  input: idInput,
  output: CustomerDetail,
  async run(ctx, input) {
    const row = await getCustomerRow(ctx, input.id)
    const props = await ctx.db.select().from(s.property).where(eq(s.property.customerId, row.id))
    const consent = await latestConsent(ctx.db, row.id)
    return {
      ...customerOut(ctx, row),
      properties: props.map((p) => ({ id: p.id, town: p.town, lat: p.lat, lng: p.lng, ...(canSeeContact(ctx) ? { address: p.address } : {}) })),
      consent: consent ? consentOut(consent) : null,
    }
  },
})

export const customersCreate = defineHandler({
  name: "customers.create",
  method: "POST",
  path: "/customers",
  scope: "write",
  status: 201,
  summary: "Add a customer, with a property when an address is given.",
  input: z.object({ ...customerFields, property: propertyInput.optional() }),
  output: CustomerDetail,
  async run(ctx, input) {
    const { property, ...fields } = input
    const [row] = await ctx.db.insert(s.customer).values({ organizationId: ctx.organizationId, ...fields, ...cleanContact(fields) }).returning()
    const props = property ? await ctx.db.insert(s.property).values({ organizationId: ctx.organizationId, customerId: row!.id, ...property }).returning() : []
    for (const p of props) await enqueueGeocode(ctx.db, ctx.organizationId, p.id, ctx.now)
    return {
      ...customerOut(ctx, row!),
      properties: props.map((p) => ({ id: p.id, town: p.town, lat: p.lat, lng: p.lng, address: p.address })),
      consent: null,
    }
  },
})

export const customersUpdate = defineHandler({
  name: "customers.update",
  method: "PATCH",
  path: "/customers/{id}",
  scope: "write",
  summary: "Change a customer's name, email, phone or lead source.",
  input: z.object(customerFields).partial().extend({ id: idInput.shape.id }),
  output: CustomerOut,
  async run(ctx, { id, ...changes }) {
    await getCustomerRow(ctx, id)
    const defined = Object.fromEntries(Object.entries({ ...changes, ...cleanContact(changes) }).filter(([, v]) => v !== undefined))
    const [row] = Object.keys(defined).length
      ? await ctx.db.update(s.customer).set(defined).where(and(eq(s.customer.id, id), eq(s.customer.organizationId, ctx.organizationId))).returning()
      : [await getCustomerRow(ctx, id)]
    return customerOut(ctx, row!)
  },
})

export const consentsList = defineHandler({
  name: "customers.consents.list",
  method: "GET",
  path: "/customers/{id}/consents",
  scope: "read",
  summary: "A customer's consent history, newest first. Consent is append-only.",
  input: idInput,
  output: z.object({ data: z.array(ConsentOut), next_cursor: z.null() }),
  async run(ctx, input) {
    await getCustomerRow(ctx, input.id)
    const rows = await ctx.db.select().from(s.consent).where(eq(s.consent.customerId, input.id)).orderBy(desc(s.consent.recordedAt), desc(s.consent.id))
    return { data: rows.map(consentOut), next_cursor: null }
  },
})

export const consentsRecord = defineHandler({
  name: "customers.consents.record",
  method: "POST",
  path: "/customers/{id}/consents",
  scope: "write",
  status: 201,
  summary: "Append a consent record (terms acceptance, a marketing change, a STOP). The newest record is the current state.",
  input: consentInput.extend({ id: idInput.shape.id }),
  output: ConsentOut,
  async run(ctx, { id, termsAccepted, termsVersion, ...rest }) {
    await getCustomerRow(ctx, id)
    const [org] = await ctx.db.select({ termsVersion: s.organization.termsVersion }).from(s.organization).where(eq(s.organization.id, ctx.organizationId))
    const [row] = await ctx.db
      .insert(s.consent)
      .values({
        organizationId: ctx.organizationId,
        customerId: id,
        ...rest,
        termsVersion: termsAccepted ? (termsVersion ?? org?.termsVersion) : undefined,
        termsAcceptedAt: termsAccepted ? ctx.now : undefined,
        recordedAt: ctx.now,
      })
      .returning()
    return consentOut(row!)
  },
})
