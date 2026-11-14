// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import { testDb, type TestDb } from "./test-db"
import * as s from "./schema"

let db: TestDb
const ORG = "org-1"

async function reject(p: Promise<unknown>) {
  await expect(p).rejects.toThrow()
}

beforeAll(async () => {
  db = await testDb()
  await db.insert(s.organization).values({
    id: ORG,
    name: "Trailhead",
    termsVersion: "2026-11",
    settings: { windows: [], bufferPercentEarly: 0, bufferPercentLate: 0, fallTownOrder: [], springTownOrder: [], messages: [] },
  })
  await db.insert(s.customer).values({ id: "c1", organizationId: ORG, firstName: "Andrea" })
  await db.insert(s.property).values({ id: "pr1", organizationId: ORG, customerId: "c1", address: "1 Main St", town: "Erie" })
  await db.insert(s.job).values([
    { id: "j1", organizationId: ORG, customerId: "c1", propertyId: "pr1", kind: "pass", source: "checkout" },
    { id: "j2", organizationId: ORG, customerId: "c1", propertyId: "pr1", kind: "repair", source: "office" },
  ])
})
afterAll(() => db.close())

const pass = (over: Partial<typeof s.seasonPass.$inferInsert> = {}) => ({
  jobId: "j1",
  organizationId: ORG,
  number: "TH-2027-0001",
  season: 2027,
  customerId: "c1",
  propertyId: "pr1",
  zones: 6,
  ...over,
})

describe("schema", () => {
  it("refuses a pass for an unknown organization", async () => {
    await reject(db.insert(s.seasonPass).values(pass({ organizationId: "nope", number: "X" })))
  })

  it("numbers passes uniquely per organization", async () => {
    await db.insert(s.seasonPass).values(pass({ id: "p1" }))
    await reject(db.insert(s.seasonPass).values(pass()))
    await db.insert(s.organization).values({ id: "org-2", name: "Other", termsVersion: "1", settings: { windows: [], bufferPercentEarly: 0, bufferPercentLate: 0, fallTownOrder: [], springTownOrder: [], messages: [] } })
    await db.insert(s.customer).values({ id: "c2", organizationId: "org-2", firstName: "B" })
    await db.insert(s.property).values({ id: "pr2", organizationId: "org-2", customerId: "c2", address: "2 Main", town: "Erie" })
    await db.insert(s.job).values({ id: "j-org2", organizationId: "org-2", customerId: "c2", propertyId: "pr2", kind: "pass", source: "checkout" })
    await db.insert(s.seasonPass).values(pass({ jobId: "j-org2", organizationId: "org-2", customerId: "c2", propertyId: "pr2" }))
  })

  it("keeps queue_item unique on (kind, key)", async () => {
    await db.insert(s.queueItem).values({ organizationId: ORG, kind: "stripe-webhook", key: "evt_1" })
    await reject(db.insert(s.queueItem).values({ organizationId: ORG, kind: "stripe-webhook", key: "evt_1" }))
    await db.insert(s.queueItem).values({ organizationId: ORG, kind: "message", key: "evt_1" })
  })

  it("allows one pass_visit per kind per pass", async () => {
    const v = { organizationId: ORG, jobId: "j1", passId: "p1", customerId: "c1", propertyId: "pr1", kind: "turn-on" as const }
    await db.insert(s.visit).values(v)
    await reject(db.insert(s.visit).values(v))
    await db.insert(s.visit).values({ ...v, kind: "blowout" })
  })

  it("needs a job on every visit, and lets a repair visit stand on its job alone", async () => {
    await reject(db.insert(s.visit).values({ organizationId: ORG, customerId: "c1", propertyId: "pr1", kind: "repair" } as never))
    await db.insert(s.visit).values({ organizationId: ORG, jobId: "j2", customerId: "c1", propertyId: "pr1", kind: "repair" })
  })

  it("cannot update a consent row, only append", async () => {
    await db.insert(s.consent).values({ id: "k1", organizationId: ORG, customerId: "c1", source: "checkout", marketingOptIn: false })
    await reject(db.update(s.consent).set({ marketingOptIn: true }).where(eq(s.consent.id, "k1")))
    await db.insert(s.consent).values({ organizationId: ORG, customerId: "c1", source: "admin", marketingOptIn: true })
    const rows = await db.select().from(s.consent).where(eq(s.consent.customerId, "c1"))
    expect(rows).toHaveLength(2)
  })

  it("keeps api_key hash unique", async () => {
    const k = { organizationId: ORG, name: "a", prefix: "abcdefgh", hash: "h1" }
    await db.insert(s.apiKey).values(k)
    await reject(db.insert(s.apiKey).values({ ...k, name: "b" }))
  })

  it("defaults visit status to unscheduled and message direction to out", async () => {
    const [v] = await db.select().from(s.visit).where(eq(s.visit.kind, "turn-on"))
    expect(v.status).toBe("unscheduled")
    expect(v.awaitingPick).toBe(false)
    const [m] = await db.insert(s.messageLog).values({ organizationId: ORG, customerId: "c1", channel: "email", kind: "receipt", key: "k", to: "a@b.c", body: "x" }).returning()
    expect(m.direction).toBe("out")
  })
})
