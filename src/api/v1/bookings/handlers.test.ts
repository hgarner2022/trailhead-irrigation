// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { apiDb, ctxFor, eventsOf, linesOfJob, ORG, readKey, writeKey } from "../../test-helpers"
import { visitsCreate } from "../visits/office"
import { bookingsCancel, bookingsCreate } from "./handlers"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
  await db.insert(s.job).values({ id: "b1", organizationId: ORG, customerId: "c100", propertyId: "property-c100", source: "office" })
  await db.insert(s.visit).values([
    { id: "b1-v1", organizationId: ORG, jobId: "b1", customerId: "c100", propertyId: "property-c100", kind: "repair", status: "scheduled", scheduledOn: "2027-05-05", personId: "person_truck-1" },
    { id: "b1-v2", organizationId: ORG, jobId: "b1", customerId: "c100", propertyId: "property-c100", kind: "repair", status: "completed" },
  ])
})
afterAll(() => db.close())

describe("bookings", () => {
  it("is a stub for create, with the scope and the schema still enforced", async () => {
    const input = {
      serviceKey: "turn-on-8", day: "2027-05-05", personId: "person_truck-1",
      customer: { firstName: "A", lastName: "Tester", email: "a@example.com" }, property: { address: "1 Main St", town: "Erie" },
      consent: { termsAccepted: true, source: "booking" },
    }
    await expect(callApi(ctxFor(db, writeKey), bookingsCreate, input)).rejects.toMatchObject({ code: "not_implemented" })
    await expect(callApi(ctxFor(db, readKey), bookingsCreate, input)).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, writeKey), bookingsCreate, { ...input, consent: { termsAccepted: false, source: "booking" } })).rejects.toMatchObject({ code: "invalid" })
  })
  it("cancels a booking and its unfinished visits", async () => {
    await expect(callApi(ctxFor(db, readKey), bookingsCancel, { id: "b1" })).rejects.toMatchObject({ code: "forbidden" })
    expect(await eventsOf(db, { jobId: "b1" })).toEqual([])
    expect(await callApi(ctxFor(db, writeKey), bookingsCancel, { id: "b1" })).toEqual({ id: "b1", status: "cancelled", cancelledVisits: 1 })
    // One `visit.cancelled` for the visit that gave up its day (the finished one stays), and one `job.cancelled`.
    expect(await eventsOf(db, { kind: "visit.cancelled", jobId: "b1" })).toMatchObject([{ about: "visit", aboutId: "b1-v1", customerId: "c100", visitId: "b1-v1", who: "api", detail: { name: "Repair", day: "2027-05-05" } }])
    expect(await eventsOf(db, { kind: "job.cancelled", jobId: "b1" })).toMatchObject([{ about: "job", aboutId: "b1", customerId: "c100", visitId: null, who: "api" }])
    // Cancelling again adds nothing.
    await callApi(ctxFor(db, writeKey), bookingsCancel, { id: "b1" })
    expect(await eventsOf(db, { jobId: "b1" })).toHaveLength(2)
    const [v] = await db.select().from(s.visit).where(eq(s.visit.id, "b1-v1"))
    expect(v).toMatchObject({ status: "cancelled", personId: null })
    await expect(callApi(ctxFor(db, writeKey), bookingsCancel, { id: "nope" })).rejects.toMatchObject({ code: "not_found" })
  })
})

describe("cancelling a job made by visits.create", () => {
  it("cancels every line of the job", async () => {
    const v = await callApi(ctxFor(db, writeKey), visitsCreate, { customerId: "c100", kind: "repair", price: 145 })
    expect((await linesOfJob(db, v.jobId)).length).toBeGreaterThan(0)
    await callApi(ctxFor(db, writeKey), bookingsCancel, { id: v.jobId })
    const lines = await linesOfJob(db, v.jobId)
    expect(lines.length).toBeGreaterThan(0)
    for (const l of lines) expect(l.cancelledAt).not.toBeNull()
  })
})
