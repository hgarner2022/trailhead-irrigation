// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq, sql } from "drizzle-orm"
import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { migrationsFolder, testDb, type TestDb } from "./test-db"
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

  it("has a person table that holds a truck's scheduling fields and an admin's sign-in, with email unique per organization ignoring case", async () => {
    const cols = await db.execute(sql`select column_name from information_schema.columns where table_name = 'person' order by 1`)
    expect(cols.rows.map((r) => r.column_name)).toEqual(expect.arrayContaining(["email", "role", "truck", "working_days", "capacity_by_kind", "season_start", "season_end", "legacy_truck_id"]))
    await db.insert(s.person).values({ id: "p-upper", organizationId: ORG, name: "Ryan", initials: "R", email: "Ryan@x.test" })
    await reject(db.insert(s.person).values({ id: "p-lower", organizationId: ORG, name: "Ryan", initials: "R", email: "ryan@x.test" }))
  })

  type Run = (q: ReturnType<typeof sql>) => Promise<{ rows: Record<string, unknown>[] }>

  type Entry = { tag: string }

  /** Applies these journal entries, and nothing after them, from a temporary copy of the migrations folder. */
  async function applyEntries(database: ReturnType<typeof drizzle>, journal: { entries: Entry[] }, entries: Entry[]) {
    const folder = mkdtempSync(join(tmpdir(), "drizzle-earlier-"))
    try {
      mkdirSync(join(folder, "meta"))
      writeFileSync(join(folder, "meta/_journal.json"), JSON.stringify({ ...journal, entries }))
      for (const e of entries) copyFileSync(join(migrationsFolder, `${e.tag}.sql`), join(folder, `${e.tag}.sql`))
      await migrate(database, { migrationsFolder: folder })
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  }

  /**
   * Commits every migration before 0010_person on a fresh database, seeds it the way a deploy finds it
   * (an admin, two trucks, visits on Truck 1, Truck 2 and none), lets the test add rows, applies 0010,
   * lets the test add what the old code wrote between the two deploys, then applies the rest of the
   * migrations and hands the database to the assertions.
   */
  async function afterMigration0010(seed: (run: Run) => Promise<void>, check: (run: Run) => Promise<void>, between: (run: Run) => Promise<void> = async () => {}) {
    const client = new PGlite()
    const database = drizzle(client)
    try {
      const journal = JSON.parse(readFileSync(join(migrationsFolder, "meta/_journal.json"), "utf8")) as { entries: Entry[] }
      const at = journal.entries.findIndex((e) => e.tag === "0010_person")
      expect(at).toBeGreaterThan(0)
      await applyEntries(database, journal, journal.entries.slice(0, at))
      const run: Run = (q) => database.execute(q)
      await run(sql`insert into "organization" ("id", "name", "settings", "terms_version") values ('o', 'Trailhead', '{}', '1')`)
      await run(sql`insert into "admin_user" ("id", "organization_id", "email", "name", "initials", "role") values ('a1', 'o', 'hannah@example.com', 'Hannah Garner', 'HG', 'owner')`)
      await run(sql`insert into "truck" ("id", "organization_id", "name", "working_days", "capacity_by_kind") values ('t1', 'o', 'Truck 1', '["mon"]', '{"blowout":10}'), ('t2', 'o', 'Truck 2', '["tue"]', '{"blowout":5}')`)
      await run(sql`insert into "customer" ("id", "organization_id", "first_name") values ('c', 'o', 'Andrea')`)
      await run(sql`insert into "property" ("id", "organization_id", "customer_id", "address", "town") values ('pr', 'o', 'c', '1 Main St', 'Erie')`)
      await run(sql`insert into "job" ("id", "organization_id", "customer_id", "property_id", "kind", "source") values ('j', 'o', 'c', 'pr', 'repair', 'office')`)
      await run(sql`insert into "visit" ("id", "organization_id", "job_id", "customer_id", "property_id", "kind", "truck_id") values ('v1', 'o', 'j', 'c', 'pr', 'repair', 't2'), ('v2', 'o', 'j', 'c', 'pr', 'repair', null), ('v3', 'o', 'j', 'c', 'pr', 'repair', 't1')`)
      await seed(run)

      await applyEntries(database, journal, journal.entries.slice(0, at + 1))
      await between(run)

      await migrate(database, { migrationsFolder })
      await check(run)
    } finally {
      await client.close()
    }
  }

  const peopleSql = sql`select "id", "name", "initials", "email", "role", "truck", "working_days", "legacy_truck_id" from "person" order by "id"`
  const visitsSql = sql`select "id", "person_id" from "visit" order by "id"`
  const hannah = { id: "person_a1", name: "Hannah Garner", initials: "HG", email: "hannah@example.com", role: "owner", truck: null, working_days: ["mon", "tue", "wed", "thu", "fri"], legacy_truck_id: null }
  // 0010 names the Truck 2 person "Second truck" (it has already run live); the fixture person is Tech Two, and the live checklist renames the row.
  const secondTruck = { id: "person_t2", name: "Second truck", initials: "T2", email: null, role: "tech", truck: "Truck 2", working_days: ["tue"], legacy_truck_id: "t2" }

  // The next two prove the backfill on committed rows, the way a deploy finds them on Neon.
  it("migrations 0010 and 0011 apply to a committed database and backfill people", async () => {
    await afterMigration0010(
      async () => {},
      async (run) => {
        expect((await run(peopleSql)).rows).toEqual([
          hannah,
          { id: "person_t1", name: "Ryan Garner", initials: "RG", email: null, role: "owner", truck: "Truck 1", working_days: ["mon"], legacy_truck_id: "t1" },
          secondTruck,
        ])
        expect((await run(visitsSql)).rows).toEqual([
          { id: "v1", person_id: "person_t2" },
          { id: "v2", person_id: null },
          { id: "v3", person_id: "person_t1" },
        ])
      },
    )
  })

  it("migrations 0010 and 0011 merge a Ryan on the admin allow-list with the Truck 1 person, so Ryan is one person", async () => {
    await afterMigration0010(
      async (run) => {
        await run(sql`insert into "admin_user" ("id", "organization_id", "email", "name", "initials", "role") values ('a2', 'o', 'ryan@example.com', 'Ryan', 'R', 'admin')`)
      },
      async (run) => {
        expect((await run(peopleSql)).rows).toEqual([
          hannah,
          { id: "person_a2", name: "Ryan Garner", initials: "RG", email: "ryan@example.com", role: "owner", truck: "Truck 1", working_days: ["mon"], legacy_truck_id: "t1" },
          secondTruck,
        ])
        const ryans = await run(sql`select count(*)::int as n from "person" where "name" = 'Ryan Garner'`)
        expect(ryans.rows[0].n).toBe(1)
        expect((await run(visitsSql)).rows).toEqual([
          { id: "v1", person_id: "person_t2" },
          { id: "v2", person_id: null },
          { id: "v3", person_id: "person_a2" },
        ])
      },
    )
  })

  // The live path: 0010 ran in its first form on Nov 16 2026 (no merge, a case-sensitive email index), the old code kept writing visits with a truck and no person, then 0011 lands.
  it("migration 0011 merges Ryan, backfills the visits the old code wrote in between, and makes the email index case-insensitive", async () => {
    await afterMigration0010(
      async (run) => {
        await run(sql`insert into "admin_user" ("id", "organization_id", "email", "name", "initials", "role") values ('a2', 'o', 'ryan@example.com', 'Ryan', 'R', 'admin')`)
      },
      async (run) => {
        expect((await run(peopleSql)).rows).toEqual([
          hannah,
          { id: "person_a2", name: "Ryan Garner", initials: "RG", email: "ryan@example.com", role: "owner", truck: "Truck 1", working_days: ["mon"], legacy_truck_id: "t1" },
          { id: "person_a3", name: "Aaron Lee", initials: "AL", email: "aaron@example.com", role: "admin", truck: null, working_days: ["mon", "tue", "wed", "thu", "fri"], legacy_truck_id: null },
          secondTruck,
        ])
        expect((await run(visitsSql)).rows).toEqual([
          { id: "v1", person_id: "person_t2" },
          { id: "v2", person_id: null },
          { id: "v3", person_id: "person_a2" },
          { id: "v4", person_id: "person_a2" },
        ])
        const index = await run(sql`select "indexdef" from pg_indexes where "indexname" = 'person_org_email_unique'`)
        expect(index.rows[0].indexdef).toMatch(/lower\(email\)/)
      },
      async (run) => {
        const before = await run(sql`select "id", "person_id" from "visit" where "id" = 'v3'`)
        expect(before.rows).toEqual([{ id: "v3", person_id: "person_t1" }])
        await run(sql`insert into "admin_user" ("id", "organization_id", "email", "name", "initials", "role") values ('a3', 'o', 'aaron@example.com', 'Aaron Lee', 'AL', 'admin')`)
        await run(sql`insert into "visit" ("id", "organization_id", "job_id", "customer_id", "property_id", "kind", "truck_id") values ('v4', 'o', 'j', 'c', 'pr', 'repair', 't1')`)
      },
    )
  })

  // The deploy seed of Nov 16 2026 put the snapshot's person_truck-1 back after 0011 had merged him away, so Truck 1 was held twice.
  it("migration 0012 folds a second person on the same truck into the one with the sign-in", async () => {
    const client = new PGlite()
    const database = drizzle(client)
    try {
      const journal = JSON.parse(readFileSync(join(migrationsFolder, "meta/_journal.json"), "utf8")) as { entries: Entry[] }
      const at = journal.entries.findIndex((e) => e.tag === "0012_person_duplicate")
      expect(at).toBeGreaterThan(0)
      await applyEntries(database, journal, journal.entries.slice(0, at))
      const run: Run = (q) => database.execute(q)
      await run(sql`insert into "organization" ("id", "name", "settings", "terms_version") values ('o', 'Trailhead', '{}', '1')`)
      await run(sql`insert into "person" ("id", "organization_id", "name", "initials", "email", "role", "truck", "legacy_truck_id") values ('person_a2', 'o', 'Ryan Garner', 'RG', 'ryan@example.com', 'owner', 'Truck 1', 't1'), ('person_t1', 'o', 'Ryan Garner', 'RG', null, 'owner', 'Truck 1', 't1'), ('person_t2', 'o', 'Tech Two', 'TT', null, 'tech', 'Truck 2', 't2')`)
      await run(sql`insert into "customer" ("id", "organization_id", "first_name") values ('c', 'o', 'Andrea')`)
      await run(sql`insert into "property" ("id", "organization_id", "customer_id", "address", "town") values ('pr', 'o', 'c', '1 Main St', 'Erie')`)
      await run(sql`insert into "job" ("id", "organization_id", "customer_id", "property_id", "kind", "source") values ('j', 'o', 'c', 'pr', 'repair', 'office')`)
      await run(sql`insert into "visit" ("id", "organization_id", "job_id", "customer_id", "property_id", "kind", "person_id") values ('v1', 'o', 'j', 'c', 'pr', 'repair', 'person_t1'), ('v2', 'o', 'j', 'c', 'pr', 'repair', 'person_a2'), ('v3', 'o', 'j', 'c', 'pr', 'repair', 'person_t2')`)

      await migrate(database, { migrationsFolder })
      expect((await run(sql`select "id" from "person" order by "id"`)).rows).toEqual([{ id: "person_a2" }, { id: "person_t2" }])
      expect((await run(visitsSql)).rows).toEqual([
        { id: "v1", person_id: "person_a2" },
        { id: "v2", person_id: "person_a2" },
        { id: "v3", person_id: "person_t2" },
      ])
    } finally {
      await client.close()
    }
  })

  it("has the yard's facts on the property", async () => {
    const cols = await db.execute(sql`select column_name from information_schema.columns where table_name = 'property' order by 1`)
    expect(cols.rows.map((r) => r.column_name)).toEqual(expect.arrayContaining(["zones", "controller", "backflow_location", "gate_code", "must_be_home", "access_note", "contact_name", "contact_phone", "notes"]))
  })
})
