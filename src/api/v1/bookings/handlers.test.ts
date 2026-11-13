// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { apiDb, ctxFor, ORG, readKey, writeKey } from "../../test-helpers"
import { bookingsCancel, bookingsCreate, quoteRequestsCreate, quoteRequestsList } from "./handlers"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
  await db.insert(s.webhookEndpoint).values({ id: "hook", organizationId: ORG, url: "https://hooks.example.com/r", secret: "whsec_r", events: ["request.received"] })
  await db.insert(s.booking).values({ id: "b1", organizationId: ORG, customerId: "c100", propertyId: "property-c100" })
  await db.insert(s.visit).values([
    { id: "b1-v1", organizationId: ORG, bookingId: "b1", customerId: "c100", propertyId: "property-c100", kind: "repair", status: "scheduled", scheduledOn: "2027-05-05", truckId: "truck-1" },
    { id: "b1-v2", organizationId: ORG, bookingId: "b1", customerId: "c100", propertyId: "property-c100", kind: "repair", status: "completed" },
  ])
})
afterAll(() => db.close())

describe("bookings", () => {
  it("is a stub for create, with the scope and the schema still enforced", async () => {
    const input = {
      serviceKey: "turn-on-8", day: "2027-05-05", truckId: "truck-1",
      customer: { firstName: "A", lastName: "Tester", email: "a@example.com" }, property: { address: "1 Main St", town: "Erie" },
      consent: { termsAccepted: true, source: "booking" },
    }
    await expect(callApi(ctxFor(db, writeKey), bookingsCreate, input)).rejects.toMatchObject({ code: "not_implemented" })
    await expect(callApi(ctxFor(db, readKey), bookingsCreate, input)).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, writeKey), bookingsCreate, { ...input, consent: { termsAccepted: false, source: "booking" } })).rejects.toMatchObject({ code: "invalid" })
  })
  it("cancels a booking and its unfinished visits", async () => {
    await expect(callApi(ctxFor(db, readKey), bookingsCancel, { id: "b1" })).rejects.toMatchObject({ code: "forbidden" })
    expect(await callApi(ctxFor(db, writeKey), bookingsCancel, { id: "b1" })).toEqual({ id: "b1", status: "cancelled", cancelledVisits: 1 })
    const [v] = await db.select().from(s.visit).where(eq(s.visit.id, "b1-v1"))
    expect(v).toMatchObject({ status: "cancelled", truckId: null })
    await expect(callApi(ctxFor(db, writeKey), bookingsCancel, { id: "nope" })).rejects.toMatchObject({ code: "not_found" })
  })
})

describe("quote requests", () => {
  it("records a request, queues request.received and lists it", async () => {
    const out = await callApi(ctxFor(db, writeKey), quoteRequestsCreate, { customerId: "c100", serviceKey: "repair", notes: "Zone 3 will not shut off" })
    expect(out).toMatchObject({ customerId: "c100", status: "new", notes: "Zone 3 will not shut off" })
    expect((await db.select().from(s.outboundEvent)).map((e) => e.event)).toEqual(["request.received"])
    const list = await callApi(ctxFor(db, readKey), quoteRequestsList, { status: "new" })
    expect(list.data.map((r) => r.id)).toEqual([out.id])
    expect((await callApi(ctxFor(db, readKey), quoteRequestsList, { status: "archived" })).data).toEqual([])
  })
  it("rejects an unknown customer, service or someone else's property, and a read key", async () => {
    await expect(callApi(ctxFor(db, writeKey), quoteRequestsCreate, { customerId: "nope" })).rejects.toMatchObject({ code: "not_found" })
    await expect(callApi(ctxFor(db, writeKey), quoteRequestsCreate, { customerId: "c100", serviceKey: "nope" })).rejects.toMatchObject({ code: "not_found" })
    await expect(callApi(ctxFor(db, writeKey), quoteRequestsCreate, { customerId: "c100", propertyId: "property-c121" })).rejects.toMatchObject({ code: "unprocessable" })
    await expect(callApi(ctxFor(db, readKey), quoteRequestsCreate, { customerId: "c100" })).rejects.toMatchObject({ code: "forbidden" })
  })
  it("honours an Idempotency-Key", async () => {
    const ctx = { ...ctxFor(db, writeKey), idempotencyKey: "q-1" }
    const a = await callApi(ctx, quoteRequestsCreate, { customerId: "c100", notes: "once" })
    expect((await callApi(ctx, quoteRequestsCreate, { customerId: "c100", notes: "once" })).id).toBe(a.id)
  })
})
