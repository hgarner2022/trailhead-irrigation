// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq, sql } from "drizzle-orm"
import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
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

  it("has a person table that holds a truck's scheduling fields and an admin's sign-in", async () => {
    const db = await testDb()
    const cols = await db.execute(sql`select column_name from information_schema.columns where table_name = 'person' order by 1`)
    expect(cols.rows.map((r) => r.column_name)).toEqual(expect.arrayContaining(["email", "role", "truck", "working_days", "capacity_by_kind", "season_start", "season_end", "legacy_truck_id"]))
    db.close()
  })

  it("applies the latest migration on a database where the earlier ones are already committed, and backfills people from admins and trucks", async () => {
    // testDb() runs every migration from 0000 in one transaction, which hides what a deploy
    // hits on Neon: Postgres refuses a value added to an existing enum inside the transaction
    // that added it. So commit the earlier migrations first, then apply the last one alone.
    const folder = fileURLToPath(new URL("../../drizzle", import.meta.url))
    const journal = JSON.parse(readFileSync(join(folder, "meta/_journal.json"), "utf8")) as { entries: { tag: string }[] }
    const earlier = mkdtempSync(join(tmpdir(), "drizzle-earlier-"))
    mkdirSync(join(earlier, "meta"))
    const entries = journal.entries.slice(0, -1)
    writeFileSync(join(earlier, "meta/_journal.json"), JSON.stringify({ ...journal, entries }))
    for (const e of entries) copyFileSync(join(folder, `${e.tag}.sql`), join(earlier, `${e.tag}.sql`))
    const client = new PGlite()
    const database = drizzle(client)
    try {
      await migrate(database, { migrationsFolder: earlier })
      await database.execute(sql`insert into "organization" ("id", "name", "settings", "terms_version") values ('o', 'Trailhead', '{}', '1')`)
      await database.execute(sql`insert into "admin_user" ("id", "organization_id", "email", "name", "initials", "role") values ('a1', 'o', 'hannah@example.com', 'Hannah Garner', 'HG', 'owner')`)
      await database.execute(sql`insert into "truck" ("id", "organization_id", "name", "working_days", "capacity_by_kind") values ('t1', 'o', 'Truck 1', '["mon"]', '{"blowout":10}'), ('t2', 'o', 'Truck 2', '["tue"]', '{"blowout":5}')`)
      await database.execute(sql`insert into "customer" ("id", "organization_id", "first_name") values ('c', 'o', 'Andrea')`)
      await database.execute(sql`insert into "property" ("id", "organization_id", "customer_id", "address", "town") values ('pr', 'o', 'c', '1 Main St', 'Erie')`)
      await database.execute(sql`insert into "job" ("id", "organization_id", "customer_id", "property_id", "kind", "source") values ('j', 'o', 'c', 'pr', 'repair', 'office')`)
      await database.execute(sql`insert into "visit" ("id", "organization_id", "job_id", "customer_id", "property_id", "kind", "truck_id") values ('v1', 'o', 'j', 'c', 'pr', 'repair', 't2'), ('v2', 'o', 'j', 'c', 'pr', 'repair', null)`)

      await migrate(database, { migrationsFolder: folder })

      const people = await database.execute(sql`select "id", "name", "initials", "email", "role", "truck", "working_days", "legacy_truck_id" from "person" order by "id"`)
      expect(people.rows).toEqual([
        { id: "person_a1", name: "Hannah Garner", initials: "HG", email: "hannah@example.com", role: "owner", truck: null, working_days: ["mon", "tue", "wed", "thu", "fri"], legacy_truck_id: null },
        { id: "person_t1", name: "Ryan Garner", initials: "RG", email: null, role: "owner", truck: "Truck 1", working_days: ["mon"], legacy_truck_id: "t1" },
        { id: "person_t2", name: "Second truck", initials: "T2", email: null, role: "tech", truck: "Truck 2", working_days: ["tue"], legacy_truck_id: "t2" },
      ])
      const visits = await database.execute(sql`select "id", "person_id" from "visit" order by "id"`)
      expect(visits.rows).toEqual([
        { id: "v1", person_id: "person_t2" },
        { id: "v2", person_id: null },
      ])
    } finally {
      await client.close()
      rmSync(earlier, { recursive: true, force: true })
    }
  })
})
