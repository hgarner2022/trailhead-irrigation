// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { SYSTEM_ID } from "@/api/core/context"
import { adminKey, apiDb, ctxFor, customerPerson, ORG, owner, passJobOf, readKey, tech } from "@/api/test-helpers"
import type { PublicPrincipal } from "@/lib/auth/types"
import { recordEvent, whoOf } from "./record"

let db: TestDb
let customerId: string
beforeAll(async () => {
  db = await apiDb()
  customerId = (await passJobOf(db, "p3")).customerId
})
afterAll(() => db.close())

describe("recordEvent", () => {
  it("writes one row with an evt_ id, the record it is about, and now as the default time", async () => {
    const before = Date.now()
    const id = await recordEvent(db, { organizationId: ORG, about: "visit", aboutId: "p3-turn-on", customerId, jobId: "job_p3", visitId: "p3-turn-on", kind: "visit.moved", detail: { day: "2027-05-05" }, who: "ryan@example.com" })
    expect(id).toMatch(/^evt_[0-9a-f-]{36}$/)
    const [row] = await db.select().from(s.event).where(eq(s.event.id, id))
    expect(row).toMatchObject({ organizationId: ORG, about: "visit", aboutId: "p3-turn-on", customerId, jobId: "job_p3", visitId: "p3-turn-on", kind: "visit.moved", detail: { day: "2027-05-05" }, who: "ryan@example.com" })
    expect(row!.at.getTime()).toBeGreaterThanOrEqual(before - 1000)
  })

  it("takes the time it is given, leaves the optional ids null and the detail empty", async () => {
    const id = await recordEvent(db, { organizationId: ORG, about: "customer", aboutId: customerId, kind: "note", who: "system", at: new Date("2027-04-01T15:00:00Z") })
    const [row] = await db.select().from(s.event).where(eq(s.event.id, id))
    expect(row).toMatchObject({ customerId: null, jobId: null, visitId: null, detail: {} })
    expect(row!.at.toISOString()).toBe("2027-04-01T15:00:00.000Z")
  })

  it("belongs to its organization: a query scoped to another organization finds nothing", async () => {
    const id = await recordEvent(db, { organizationId: ORG, about: "customer", aboutId: customerId, kind: "note", who: "system" })
    expect(await db.select().from(s.event).where(and(eq(s.event.id, id), eq(s.event.organizationId, "another-org")))).toEqual([])
    expect(await db.select().from(s.event).where(and(eq(s.event.id, id), eq(s.event.organizationId, ORG)))).toHaveLength(1)
  })
})

describe("whoOf", () => {
  it("is the email of a signed-in admin or tech", () => {
    expect(whoOf(ctxFor(db, owner))).toBe("owner@example.com")
    expect(whoOf(ctxFor(db, tech))).toBe("tech@example.com")
  })

  it("is customer for a customer's own action and for the anonymous checkout visitor", () => {
    expect(whoOf(ctxFor(db, customerPerson(customerId)))).toBe("customer")
    const visitor: PublicPrincipal = { kind: "public", id: "checkout", organizationId: ORG, scopes: ["checkout"] }
    expect(whoOf(ctxFor(db, visitor))).toBe("customer")
  })

  it("is system for the job context and api for any other key", () => {
    expect(whoOf(ctxFor(db, { kind: "api-key", id: SYSTEM_ID, organizationId: ORG, scopes: ["read", "write", "admin"] }))).toBe("system")
    expect(whoOf(ctxFor(db, adminKey))).toBe("api")
    expect(whoOf(ctxFor(db, readKey))).toBe("api")
  })
})
