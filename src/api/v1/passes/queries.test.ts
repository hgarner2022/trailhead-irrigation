// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ctxFor, ORG, owner, passJobOf } from "../../test-helpers"
import { recordChange } from "./queries"

let db: TestDb
let customerId: string
let jobId: string
beforeAll(async () => {
  db = await apiDb()
  const job = await passJobOf(db, "p3")
  customerId = job.customerId
  jobId = job.id
})
afterAll(() => db.close())

const events = (kind: string) => db.select().from(s.event).where(eq(s.event.kind, kind))

describe("recordChange", () => {
  it("writes one event with the mapped kind, about the visit, and no other row", async () => {
    const before = (await db.select().from(s.event)).length
    await recordChange(ctxFor(db, owner), { customerId, jobId, visitId: "p3-turn-on", kind: "day-picked", detail: { day: "2027-05-05" } })
    expect((await db.select().from(s.event)).length).toBe(before + 1)
    const rows = await events("visit.moved")
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ organizationId: ORG, about: "visit", aboutId: "p3-turn-on", customerId, jobId, visitId: "p3-turn-on", who: "owner@example.com", detail: { day: "2027-05-05" } })
    expect(rows[0]!.at.toISOString()).toBe("2027-04-20T15:00:00.000Z")
  })

  it("is about the pass's job when the new kind is not a visit kind, even with a visit", async () => {
    await recordChange(ctxFor(db, owner), { customerId, jobId, visitId: "p3-turn-on", kind: "visit-created", detail: { source: "office" } })
    expect(await events("job.sold")).toMatchObject([{ about: "job", aboutId: jobId, jobId, visitId: "p3-turn-on" }])
    await recordChange(ctxFor(db, owner), { customerId, jobId, kind: "cancelled", detail: { reason: "moving" } })
    expect(await events("pass.cancelled")).toMatchObject([{ about: "job", aboutId: jobId, jobId, visitId: null }])
  })

  it("finds the job through the visit when none is given, and falls back to the customer with neither", async () => {
    const [oneOff] = await db.select().from(s.visit).where(eq(s.visit.id, "p3-blowout"))
    await recordChange(ctxFor(db, owner), { customerId, visitId: "p3-blowout", kind: "visit-edited", detail: { changed: ["price"] } })
    expect(await events("visit.edited")).toMatchObject([{ about: "visit", aboutId: "p3-blowout", jobId: oneOff!.jobId }])
    await recordChange(ctxFor(db, owner), { customerId, kind: "consent-snapshot", detail: { source: "admin" } })
    expect(await events("consent")).toMatchObject([{ about: "customer", aboutId: customerId, jobId: null, visitId: null }])
  })

  it("copies a kind it does not know unchanged, and records who the system principal is", async () => {
    await recordChange(ctxFor(db, { kind: "api-key", id: "system", organizationId: ORG, scopes: ["read", "write", "admin"] }), { customerId, jobId, kind: "brand-new-kind" })
    expect(await events("brand-new-kind")).toMatchObject([{ about: "job", who: "system" }])
  })
})
