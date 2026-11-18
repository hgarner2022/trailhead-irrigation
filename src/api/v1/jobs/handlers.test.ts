// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { apiDb, ctxFor, eventsOf, linesOfJob, ORG, readKey, writeKey } from "../../test-helpers"
import { jobsCreate, PLACEHOLDER_ADDRESS } from "./handlers"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
  await db.insert(s.webhookEndpoint).values({ id: "hook", organizationId: ORG, url: "https://hooks.example.com/r", secret: "whsec_r", events: ["request.received"] })
})
afterAll(() => db.close())

const jobRow = async (id: string) => (await db.select().from(s.job).where(eq(s.job.id, id)))[0]!
const visitsOf = (jobId: string) => db.select().from(s.visit).where(eq(s.visit.jobId, jobId))

describe("jobs.create with needsQuote", () => {
  it("makes a job with no sold day, one unpriced line, no visit, a job.requested event and the outbound request.received", async () => {
    const out = await callApi(ctxFor(db, writeKey), jobsCreate, {
      customer: { firstName: "Dana", lastName: "Quill", email: "Dana.Quill@Example.com", phone: "970-555-0142" },
      property: { address: "12 Cottonwood Way", town: "Erie" },
      serviceKey: "install", notes: "New system for the back yard, about 8 zones", needsQuote: true,
    })
    expect(out).toMatchObject({ source: "site", needsQuote: true, soldOn: null })
    const job = await jobRow(out.id)
    expect(job).toMatchObject({ source: "site", soldOn: null, quoteSentOn: null, quoteAcceptedOn: null, cancelledAt: null, season: null })
    expect(await visitsOf(out.id)).toEqual([])
    const lines = await linesOfJob(db, out.id)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ name: "New sprinkler system installation", description: "New system for the back yard, about 8 zones", quantity: 1, unitPrice: 0, serviceKey: "install", visitId: null, cancelledAt: null })
    // the customer was made, with the email as the office writes it, and the property is the one given
    const [customer] = await db.select().from(s.customer).where(eq(s.customer.id, out.customerId))
    expect(customer).toMatchObject({ firstName: "Dana", lastName: "Quill", email: "dana.quill@example.com", leadSource: "website" })
    const [property] = await db.select().from(s.property).where(eq(s.property.id, out.propertyId))
    expect(property).toMatchObject({ address: "12 Cottonwood Way", town: "Erie" })
    expect(await eventsOf(db, { kind: "job.requested", jobId: out.id })).toMatchObject([{ about: "job", aboutId: out.id, customerId: out.customerId, who: "api", detail: { source: "site" } }])
    expect((await db.select().from(s.outboundEvent)).map((e) => e.payload)).toContainEqual({ jobId: out.id, customerId: out.customerId })
  })

  it("finds a customer by email in any case instead of making another, and reuses the property at the same address", async () => {
    const [before] = await db.select().from(s.customer).where(eq(s.customer.email, "dana.quill@example.com"))
    const again = await callApi(ctxFor(db, writeKey), jobsCreate, {
      customer: { firstName: "Dana", email: "DANA.QUILL@example.com" }, property: { address: "12 cottonwood way", town: "Erie" }, serviceKey: "repair", needsQuote: true,
    })
    expect(again.customerId).toBe(before!.id)
    expect(await db.select().from(s.customer).where(eq(s.customer.email, "dana.quill@example.com"))).toHaveLength(1)
    expect(await db.select().from(s.property).where(eq(s.property.customerId, before!.id))).toHaveLength(1)
    expect((await linesOfJob(db, again.id))[0]).toMatchObject({ name: "Sprinkler repair visit", description: null, unitPrice: 0 })
  })

  it("with no address uses the customer's newest property, else the placeholder in Erie", async () => {
    const onFile = await callApi(ctxFor(db, writeKey), jobsCreate, { customerId: "c100", serviceKey: "repair", needsQuote: true })
    const [newest] = (await db.select().from(s.property).where(eq(s.property.customerId, "c100"))).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id))
    expect(onFile.propertyId).toBe(newest!.id)
    const fresh = await callApi(ctxFor(db, writeKey), jobsCreate, { customer: { firstName: "Noah", email: "noah@example.com" }, serviceKey: "repair", notes: "Zone 3 will not shut off", needsQuote: true })
    const [made] = await db.select().from(s.property).where(eq(s.property.id, fresh.propertyId))
    expect(made).toMatchObject({ address: PLACEHOLDER_ADDRESS, town: "Erie", customerId: fresh.customerId })
    // a second call for the same customer reuses the placeholder
    expect((await callApi(ctxFor(db, writeKey), jobsCreate, { customerId: fresh.customerId, serviceKey: "repair", needsQuote: true })).propertyId).toBe(made!.id)
  })
})

describe("jobs.create without needsQuote", () => {
  it("is the office's one-off job: sold today, the service's price on its one line, no visit, a job.sold event", async () => {
    const out = await callApi(ctxFor(db, writeKey), jobsCreate, { customerId: "c100", serviceKey: "repair", notes: "Called about a leak" })
    expect(out).toMatchObject({ source: "office", needsQuote: false, soldOn: "2027-04-20" })
    expect(await jobRow(out.id)).toMatchObject({ source: "office", soldOn: "2027-04-20", quoteSentOn: null })
    expect(await visitsOf(out.id)).toEqual([])
    expect((await linesOfJob(db, out.id))[0]).toMatchObject({ name: "Repair", unitPrice: 145, serviceKey: "repair" })
    expect(await eventsOf(db, { kind: "job.sold", jobId: out.id })).toMatchObject([{ detail: { source: "office", name: "Repair" } }])
    expect(await eventsOf(db, { kind: "note", jobId: out.id })).toMatchObject([{ detail: { text: "Called about a leak" } }])
    expect(await eventsOf(db, { kind: "job.requested", jobId: out.id })).toEqual([])
  })
})

describe("jobs.create rules", () => {
  it("needs the write scope, a customer one way or the other, and an offered service", async () => {
    await expect(callApi(ctxFor(db, readKey), jobsCreate, { customerId: "c100", serviceKey: "repair" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, writeKey), jobsCreate, { serviceKey: "repair" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, writeKey), jobsCreate, { customerId: "c100", customer: { firstName: "A", email: "a@example.com" }, serviceKey: "repair" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, writeKey), jobsCreate, { customerId: "nope", serviceKey: "repair" })).rejects.toMatchObject({ code: "not_found" })
    await expect(callApi(ctxFor(db, writeKey), jobsCreate, { customerId: "c100", serviceKey: "nope" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, writeKey), jobsCreate, { customerId: "c100", propertyId: "property-c121", serviceKey: "repair" })).rejects.toMatchObject({ code: "unprocessable" })
  })
  it("leaves no customer behind when the service is refused", async () => {
    await db.update(s.service).set({ active: false }).where(and(eq(s.service.organizationId, ORG), eq(s.service.key, "aeration")))
    await expect(callApi(ctxFor(db, writeKey), jobsCreate, { customer: { firstName: "Gone", email: "gone@example.com" }, serviceKey: "aeration", needsQuote: true })).rejects.toMatchObject({ code: "invalid" })
    expect(await db.select().from(s.customer).where(eq(s.customer.email, "gone@example.com"))).toEqual([])
    await db.update(s.service).set({ active: true }).where(and(eq(s.service.organizationId, ORG), eq(s.service.key, "aeration")))
  })
  it("honours an Idempotency-Key", async () => {
    const ctx = { ...ctxFor(db, writeKey), idempotencyKey: "job-once" }
    const input = { customerId: "c100", serviceKey: "repair", needsQuote: true }
    const a = await callApi(ctx, jobsCreate, input)
    expect((await callApi(ctx, jobsCreate, input)).id).toBe(a.id)
  })
})
