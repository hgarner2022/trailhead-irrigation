import "server-only"
import { and, asc, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { changedFields } from "@/lib/events/diff"
import { newestJobNotes, recentEvents } from "../events/queries"
import { recordEvent, whoOf } from "@/lib/events/record"
import { enqueueGeocode } from "@/lib/geocode"
import { defineHandler } from "../../core/handler"
import { ApiError, notFound } from "../../core/errors"
import type { Ctx } from "../../core/context"
import { afterTimeCursor, cursorPage, page, pageInput, timeCursor } from "../../core/pagination"
import { canSeeContact, idInput, iso, today } from "../shared"
import { hasScope } from "@/lib/auth/principal"
import { customerHasCard } from "@/lib/customer/card"
import { ConsentOut, consentInput, CustomerDetail, CustomerListItem, CustomerOut, customerFields, propertyInput } from "./schemas"
import { loadJobKinds } from "@/lib/jobs/kind-load"
import { jobTotal, linesOfVisit, visitPrice } from "@/lib/jobs/lines"
import { stageOf } from "@/lib/jobs/stage"
import { loadTaxRule } from "@/lib/money/tax-rule"
import { jobMoney, jobOwed } from "@/lib/money/words"
import { paymentOut } from "../payments/queries"
import { cleanEmail, cleanName, normalizePhone } from "@/lib/format/contact"

type CustomerRow = typeof s.customer.$inferSelect
type ConsentRow = typeof s.consent.$inferSelect


/** The contact fields a caller sent, cleaned the way they are stored and print; fields not sent stay absent. */
export function cleanContact(f: { firstName?: string; lastName?: string; email?: string; phone?: string | null }) {
  return {
    ...(f.firstName !== undefined ? { firstName: cleanName(f.firstName) } : {}),
    ...(f.lastName !== undefined ? { lastName: f.lastName.trim() ? cleanName(f.lastName) : null } : {}),
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
  card: customerHasCard(row) ? { brand: row.cardBrand, last4: row.cardLast4, expires: row.cardExpires, failedAt: row.cardFailedAt?.toISOString() ?? null } : null,
  createdAt: row.createdAt.toISOString(),
})

type PropertyRow = typeof s.property.$inferSelect

/** The yard's nine facts as the API serves them: the gate code, access note and on-site phone only with the write scope. */
/** The yard facts only a write-scope caller may see; the one gate for the API and the admin's live data. Absent keys for anyone else. */
export const gateYard = (ctx: Ctx, p: Pick<PropertyRow, "gateCode" | "accessNote" | "contactPhone">) =>
  canSeeContact(ctx) ? { gateCode: p.gateCode, accessNote: p.accessNote, contactPhone: p.contactPhone } : {}

export const yardOut = (ctx: Ctx, p: PropertyRow) => ({
  zones: p.zones,
  controller: p.controller,
  backflowLocation: p.backflowLocation,
  mustBeHome: p.mustBeHome,
  contactName: p.contactName,
  // property notes are staff's: a signed-in customer reading their own pass never gets them
  notes: hasScope(ctx.principal, "read") ? p.notes : null,
  ...gateYard(ctx, p),
})

/** A property as the API serves it: the street line too, only with the write scope. */
export const propertyOut = (ctx: Ctx, p: PropertyRow) => ({
  id: p.id,
  customerId: p.customerId,
  town: p.town,
  lat: p.lat,
  lng: p.lng,
  ...yardOut(ctx, p),
  ...(canSeeContact(ctx) ? { address: p.address } : {}),
})

type YardInput = Partial<Record<"zones" | "controller" | "backflowLocation" | "gateCode" | "accessNote" | "contactName" | "contactPhone" | "notes", string | number | null>> & { mustBeHome?: boolean }

/** The yard fields a caller sent, cleaned the way they are stored (the phone printed like the customer's); fields not sent stay absent. */
export function cleanYard(f: YardInput) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(f)) if (v !== undefined) out[k] = v
  if (typeof f.contactPhone === "string") {
    const phone = normalizePhone(f.contactPhone)
    if (!phone) throw new ApiError("invalid", "That phone number is not valid", [{ path: "contactPhone", message: "invalid-phone" }])
    out.contactPhone = phone
  }
  return out as Partial<Pick<PropertyRow, "zones" | "controller" | "backflowLocation" | "gateCode" | "mustBeHome" | "accessNote" | "contactName" | "contactPhone" | "notes">>
}

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
    const towns = ids.length ? await ctx.db.select({ customerId: s.property.customerId, town: s.property.town, address: s.property.address }).from(s.property).where(inArray(s.property.customerId, ids)).orderBy(asc(s.property.createdAt)) : []
    const passes = ids.length
      ? await ctx.db.select({ customerId: s.job.customerId }).from(s.job).where(and(inArray(s.job.customerId, ids), eq(s.job.organizationId, ctx.organizationId), isNotNull(s.job.season), isNull(s.job.cancelledAt)))
      : []
    return {
      next_cursor: result.next_cursor,
      data: result.data.map((r) => ({
        ...customerOut(ctx, r),
        town: towns.find((t) => t.customerId === r.id)?.town ?? null,
        ...(canSeeContact(ctx) ? { address: towns.find((t) => t.customerId === r.id)?.address ?? null } : {}),
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
      properties: props.map((p) => propertyOut(ctx, p)),
      consent: consent ? consentOut(consent) : null,
      jobs: await jobsOf(ctx, row.id),
      events: await recentEvents(ctx, { customerId: row.id }, 50),
    }
  },
})

/** A customer's jobs, newest first, each with its visits and, for a pass, its number (the job's own); a Season Pass's id is its job's id. */
async function jobsOf(ctx: Ctx, customerId: string) {
  const db = ctx.db
  const org = ctx.organizationId
  const jobs = await db.select().from(s.job).where(and(eq(s.job.customerId, customerId), eq(s.job.organizationId, org))).orderBy(desc(s.job.createdAt), desc(s.job.id))
  if (!jobs.length) return []
  const visits = await db.select().from(s.visit).where(and(inArray(s.visit.jobId, jobs.map((j) => j.id)), eq(s.visit.organizationId, org))).orderBy(asc(s.visit.scheduledOn), asc(s.visit.createdAt))
  const lineRows = await db.select().from(s.lineItem).where(and(inArray(s.lineItem.jobId, jobs.map((j) => j.id)), eq(s.lineItem.organizationId, org))).orderBy(asc(s.lineItem.createdAt), asc(s.lineItem.id))
  const paymentRows = await db.select().from(s.charge).where(and(inArray(s.charge.jobId, jobs.map((j) => j.id)), eq(s.charge.organizationId, org))).orderBy(asc(s.charge.createdAt), asc(s.charge.id))
  const bills = await db.select().from(s.invoice).where(and(inArray(s.invoice.jobId, jobs.map((j) => j.id)), eq(s.invoice.organizationId, org), isNull(s.invoice.cancelledAt))).orderBy(asc(s.invoice.paidOn), asc(s.invoice.id))
  const openBills = bills.filter((b) => !b.paidOn)
  // Each job's newest 10 events (a customer has a few jobs, so one small query each).
  const stories = await Promise.all(jobs.map((j) => recentEvents(ctx, { jobId: j.id }, 10)))
  // A job's kind is derived (a pass by its season, else its first line's service, else its first visit) and its notes are its newest note event.
  const [kinds, notes, rule] = await Promise.all([loadJobKinds(db, org, jobs), newestJobNotes(ctx, jobs.map((j) => j.id)), loadTaxRule(db, org)])
  return jobs.map((j, index) => {
    const lines = lineRows.filter((l) => l.jobId === j.id)
    const payments = paymentRows.filter((p) => p.jobId === j.id)
    const jobVisits = visits.filter((v) => v.jobId === j.id)
    // An open invoice on a job that owes nothing (money arrived another way) is not carried: the job reads Paid.
    const bill = jobOwed(lines, payments, rule) > 0 ? openBills.find((b) => b.jobId === j.id) : undefined
    // The visits the paid invoices name, which a payment made on the job as a whole credits first.
    const paidBillVisits = bills.filter((b) => b.jobId === j.id && b.paidOn).flatMap((b) => b.lines.map((l) => l.visitId).filter((id): id is string => Boolean(id)))
    const kind = kinds.get(j.id)!
    // The job's total and each visit's price carry the sales tax, read from the same rule the invoice is built with.
    const total = jobTotal(lines, rule)
    return {
      id: j.id, kind,
      // the stage word, read from the facts (`stageOf`): there is no typed status
      status: stageOf({ kind, cancelledAt: j.cancelledAt, soldOn: j.soldOn, quoteSentOn: j.quoteSentOn, quoteAcceptedOn: j.quoteAcceptedOn, lines, visits: jobVisits }),
      // the job's price is its total, null while it is 0
      price: total > 0 ? total : null, source: j.source, notes: notes.get(j.id) ?? null, createdAt: j.createdAt.toISOString(),
      // a Season Pass is its job: the pass id is the job id
      passId: j.season !== null ? j.id : null, passNumber: j.passNumber,
      lines: lines.map((l) => ({ id: l.id, name: l.name, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, taxable: l.taxable, cancelledAt: l.cancelledAt?.toISOString() ?? null, visitId: l.visitId })),
      total,
      payments: payments.map((p) => paymentOut(ctx, p)),
      money: jobMoney(lines, payments, jobVisits.map((v) => ({ id: v.id, cancelled: v.status === "cancelled" || v.status === "skipped", price: visitPrice(linesOfVisit(lines, v.id), rule), done: v.status === "completed", doneOn: v.completedOn })), rule, bill, paidBillVisits),
      invoiceId: bill?.id ?? null,
      visits: jobVisits.map((v) => ({ id: v.id, kind: v.kind, status: v.status, scheduledOn: v.scheduledOn, amount: visitPrice(linesOfVisit(lines, v.id), rule) })),
      events: stories[index]!,
    }
  })
}

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
    const props = property ? await ctx.db.insert(s.property).values({ organizationId: ctx.organizationId, customerId: row!.id, address: property.address, town: property.town, ...cleanYard(property) }).returning() : []
    for (const p of props) await enqueueGeocode(ctx.db, ctx.organizationId, p.id, ctx.now)
    await recordEvent(ctx.db, { organizationId: ctx.organizationId, about: "customer", aboutId: row!.id, customerId: row!.id, kind: "customer.edited", detail: { created: true, changed: changedFields({}, { firstName: row!.firstName, lastName: row!.lastName, email: row!.email, phone: row!.phone, leadSource: row!.leadSource }) }, who: whoOf(ctx), at: ctx.now })
    return {
      ...customerOut(ctx, row!),
      properties: props.map((p) => propertyOut(ctx, p)),
      consent: null,
      jobs: [],
      events: await recentEvents(ctx, { customerId: row!.id }, 50),
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
    const before = await getCustomerRow(ctx, id)
    const defined = Object.fromEntries(Object.entries({ ...changes, ...cleanContact(changes) }).filter(([, v]) => v !== undefined))
    const [row] = Object.keys(defined).length
      ? await ctx.db.update(s.customer).set(defined).where(and(eq(s.customer.id, id), eq(s.customer.organizationId, ctx.organizationId))).returning()
      : [before]
    const changed = changedFields(before, defined)
    if (Object.keys(changed).length) await recordEvent(ctx.db, { organizationId: ctx.organizationId, about: "customer", aboutId: id, customerId: id, kind: "customer.edited", detail: { changed }, who: whoOf(ctx), at: ctx.now })
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
    await recordEvent(ctx.db, { organizationId: ctx.organizationId, about: "customer", aboutId: id, customerId: id, kind: "consent", detail: { marketingOptIn: row!.marketingOptIn, marketingChannels: row!.marketingChannels, source: row!.source }, who: whoOf(ctx), at: ctx.now })
    return consentOut(row!)
  },
})
