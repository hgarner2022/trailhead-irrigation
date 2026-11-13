// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { count, eq } from "drizzle-orm"
import type { PgTable } from "drizzle-orm/pg-core"
import { testDb, type TestDb } from "./test-db"
import * as s from "./schema"
import { seed, toMountainDay, LEAD_WEEKS } from "./seed"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { SERVICE_LIST } from "@/lib/services"

const data = snapshot as AdminData
const org = data.organizationId
let db: TestDb
const n = async (table: PgTable) => (await db.select({ c: count() }).from(table))[0].c

beforeAll(async () => {
  db = await testDb()
})
afterAll(() => db.close())

describe("seed", () => {
  it("seeds the organization, admins, trucks, areas, settings and services only", async () => {
    await seed(db, data, { organizationId: org, admins: ["hannah@example.com", "ryan@example.com"] })
    const [o] = await db.select().from(s.organization).where(eq(s.organization.id, org))
    expect(o.settings.windows.map((w) => [w.kind, w.leadWeeks])).toEqual([
      ["turn-on", 4],
      ["inspection", 4],
      ["blowout", 2],
    ])
    expect(LEAD_WEEKS.blowout).toBe(2)
    expect(await n(s.adminUser)).toBe(2)
    expect(await n(s.truck)).toBe(data.settings.trucks.length)
    expect(await n(s.area)).toBe(data.settings.areas.length)
    expect(await n(s.service)).toBe(SERVICE_LIST.length)
    expect(await n(s.seasonPass)).toBe(0)
    expect(await n(s.jobberClient)).toBe(0)
  })

  it("is idempotent", async () => {
    await seed(db, data, { organizationId: org, admins: ["hannah@example.com", "ryan@example.com"], passes: true, mirror: true })
    const counts = async () => [await n(s.adminUser), await n(s.service), await n(s.seasonPass), await n(s.visit), await n(s.consent), await n(s.jobberVisit)]
    const first = await counts()
    await seed(db, data, { organizationId: org, admins: ["hannah@example.com", "ryan@example.com"], passes: true, mirror: true })
    expect(await counts()).toEqual(first)
  })

  it("seeds the fixture passes with visits, consents and the mirror when asked", async () => {
    expect(await n(s.seasonPass)).toBe(data.passes.length)
    expect(await n(s.visit)).toBe(data.passes.reduce((sum, p) => sum + p.visits.length, 0))
    expect(await n(s.consent)).toBe(data.passes.filter((p) => p.consent).length)
    expect(await n(s.jobberClient)).toBe(data.clients.length)
    const [p1] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, "p1"))
    expect(p1.number).toBe("TH-2027-0001")
    expect(p1.inspection).toBe(true)
    const done = await db.select().from(s.visit).where(eq(s.visit.id, "p1-turn-on"))
    expect(done[0].status).toBe("completed")
    expect(done[0].completedOn).toBe("2027-05-03")
  })
})

describe("toMountainDay", () => {
  it("reads the Mountain calendar day, not the UTC one", () => {
    expect(toMountainDay("2027-05-04T03:00:00Z")).toBe("2027-05-03")
    expect(toMountainDay("2027-01-01T05:00:00Z")).toBe("2026-12-31")
  })
})
