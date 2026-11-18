// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { count, eq, sql } from "drizzle-orm"
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
  it("seeds the organization, people (the snapshot's and one per admin email), areas, settings and services only", async () => {
    await seed(db, data, { organizationId: org, admins: ["hannah@example.com", "ryan@example.com"] })
    const [o] = await db.select().from(s.organization).where(eq(s.organization.id, org))
    expect(o.settings.windows.map((w) => [w.kind, w.leadWeeks])).toEqual([
      ["turn-on", 4],
      ["inspection", 4],
      ["blowout", 2],
    ])
    expect(LEAD_WEEKS.blowout).toBe(2)
    expect(await n(s.person)).toBe(3)
    expect(await n(s.area)).toBe(data.settings.areas.length)
    expect(await n(s.service)).toBe(SERVICE_LIST.length)
    const services = await db.select({ key: s.service.key, description: s.service.description, taxable: s.service.taxable, active: s.service.active }).from(s.service)
    expect(services.every((v) => typeof v.description === "string" && v.description.length > 0 && !v.description.includes("$"))).toBe(true)
    expect(services.every((v) => v.taxable === false && v.active === true)).toBe(true)
    expect(services.find((v) => v.key === "blowout")?.description).toBe(SERVICE_LIST.find((v) => v.key === "blowout")?.description)
    expect(await n(s.seasonPass)).toBe(0)
    expect(await n(s.jobberClient)).toBe(0)
  })

  it("backfills in migration 0013 the description the seed writes, so a migrated database and a fresh one agree, and leaves a filled row alone", async () => {
    // The columns exist on the test database already, so only the UPDATE statements run; the file is read as the one source of them.
    const statements = readFileSync(join(process.cwd(), "drizzle/0013_service_description.sql"), "utf8")
      .split("--> statement-breakpoint")
      .map((part) => part.trim())
      .filter((part) => part && !part.startsWith("ALTER TABLE"))
    const read = () => db.select({ key: s.service.key, description: s.service.description }).from(s.service).orderBy(s.service.key)
    await db.execute(sql`update "service" set "description" = null`)
    for (const statement of statements) await db.execute(sql.raw(statement))
    const backfilled = await read()
    expect(backfilled.length).toBe(SERVICE_LIST.length)
    for (const row of backfilled) expect(row.description, row.key).toBe(SERVICE_LIST.find((v) => v.key === row.key)?.description)
    for (const statement of statements) await db.execute(sql.raw(statement))
    expect(await read()).toEqual(backfilled)
  })

  it("is idempotent", async () => {
    await seed(db, data, { organizationId: org, admins: ["hannah@example.com", "ryan@example.com"], passes: true, mirror: true })
    const counts = async () => [await n(s.person), await n(s.service), await n(s.seasonPass), await n(s.visit), await n(s.lineItem), await n(s.consent), await n(s.jobberVisit)]
    const people = () => db.select({ id: s.person.id, name: s.person.name, email: s.person.email, role: s.person.role, truck: s.person.truck }).from(s.person).orderBy(s.person.id)
    const first = await counts()
    const firstPeople = await people()
    await seed(db, data, { organizationId: org, admins: ["hannah@example.com", "ryan@example.com"], passes: true, mirror: true })
    expect(await counts()).toEqual(first)
    expect(await people()).toEqual(firstPeople)
  })

  it("seeds the snapshot's people and one person per admin email, a ryan admin merged into Ryan Garner", async () => {
    const rows = await db.select().from(s.person).orderBy(s.person.name)
    expect(rows.map((p) => ({ id: p.id.startsWith("person_truck") ? p.id : "generated", name: p.name, initials: p.initials, email: p.email, role: p.role, truck: p.truck, jobberUserId: p.jobberUserId }))).toEqual([
      { id: "generated", name: "Hannah", initials: "HA", email: "hannah@example.com", role: "owner", truck: null, jobberUserId: null },
      { id: "person_truck-1", name: "Ryan Garner", initials: "RG", email: "ryan@example.com", role: "owner", truck: "Truck 1", jobberUserId: "jobber-user-1" },
      { id: "person_truck-2", name: "Tech Two", initials: "TT", email: null, role: "tech", truck: "Truck 2", jobberUserId: "jobber-user-2" },
    ])
    const ryan = rows.find((p) => p.name === "Ryan Garner")!
    expect(ryan.workingDays).toEqual(data.settings.people[0]!.workingDays)
    expect(ryan.capacityByKind).toEqual(data.settings.people[0]!.capacityByKind)
  })

  it("adds no snapshot people to a migrated database, where Ryan is person_<admin id> and the second tech has the office's own name", async () => {
    const migrated = await testDb()
    try {
      await migrated.execute(sql`insert into "organization" ("id", "name", "settings", "terms_version") values (${org}, 'Trailhead', '{}', '1')`)
      await migrated.insert(s.person).values([
        { id: "person_a2", organizationId: org, name: "Ryan Garner", initials: "RG", email: "ryan@example.com", role: "owner", truck: "Truck 1" },
        { id: "person_truck-2", organizationId: org, name: "Second truck", initials: "ST", role: "tech", truck: "Second truck" },
      ])
      await seed(migrated, data, { organizationId: org, admins: ["ryan@example.com", "hannah@example.com"] })
      const rows = await migrated.select({ id: s.person.id, name: s.person.name, email: s.person.email }).from(s.person).orderBy(s.person.id)
      expect(rows.filter((p) => p.name === "Ryan Garner")).toEqual([{ id: "person_a2", name: "Ryan Garner", email: "ryan@example.com" }])
      expect(rows.some((p) => p.name === "Tech Two")).toBe(false)
      expect(rows).toHaveLength(3)
      expect(rows.some((p) => p.email === "hannah@example.com")).toBe(true)
      // a second run changes nothing
      await seed(migrated, data, { organizationId: org, admins: ["ryan@example.com", "hannah@example.com"] })
      expect(await migrated.select({ c: count() }).from(s.person)).toEqual([{ c: 3 }])
    } finally {
      await migrated.close()
    }
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
  it("seeds the yard on the property from the snapshot pass, and a re-seed keeps an office edit", async () => {
    const pass = data.passes[0]
    const id = `property-${pass.clientId}`
    const read = async () => (await db.select({ zones: s.property.zones, mustBeHome: s.property.mustBeHome, accessNote: s.property.accessNote }).from(s.property).where(eq(s.property.id, id)))[0]
    expect(await read()).toEqual({ zones: pass.zones, mustBeHome: pass.needsCustomerHome ?? false, accessNote: pass.accessNote ?? null })
    await db.update(s.property).set({ zones: 99 }).where(eq(s.property.id, id))
    await seed(db, data, { organizationId: org, admins: ["hannah@example.com", "ryan@example.com"], passes: true, mirror: true })
    expect((await read()).zones).toBe(99)
  })
  it("gives every seeded pass job its legacy pass id and its sold day (empty for the pending fixture), on insert only", async () => {
    const read = async () => db.select({ id: s.job.id, legacyPassId: s.job.legacyPassId, soldOn: s.job.soldOn }).from(s.job).where(eq(s.job.organizationId, org)).orderBy(s.job.id)
    const jobs = await read()
    expect(jobs).toHaveLength(data.passes.length)
    for (const pass of data.passes) {
      const job = jobs.find((j) => j.id === `job_${pass.id}`)!
      expect(job.legacyPassId, pass.id).toBe(pass.id)
      if (pass.status === "pending") expect(job.soldOn, pass.id).toBeNull()
      else expect(job.soldOn, pass.id).toBe(toMountainDay(new Date().toISOString()))
    }
    // An office edit survives a re-seed: the insert never overwrites the dates.
    await db.update(s.job).set({ soldOn: "2027-01-02" }).where(eq(s.job.id, "job_p1"))
    await db.update(s.job).set({ soldOn: "2027-03-04" }).where(eq(s.job.id, "job_p13"))
    await seed(db, data, { organizationId: org, admins: ["hannah@example.com", "ryan@example.com"], passes: true, mirror: true })
    const after = await read()
    expect(after.find((j) => j.id === "job_p1")!.soldOn).toBe("2027-01-02")
    expect(after.find((j) => j.id === "job_p13")!.soldOn).toBe("2027-03-04")
  })
  it("gives every fixture visit its line, with the backfill's id, so a seeded and a migrated database agree", async () => {
    expect(await n(s.lineItem)).toBe(data.passes.reduce((sum, p) => sum + p.visits.length, 0))
    const [line] = await db
      .select({ line: s.lineItem, serviceKey: s.service.key })
      .from(s.lineItem)
      .leftJoin(s.service, eq(s.service.id, s.lineItem.serviceId))
      .innerJoin(s.visit, eq(s.visit.id, s.lineItem.visitId))
      .where(eq(s.lineItem.id, "line_p2-turn-on"))
    expect(line).toMatchObject({ serviceKey: "turn-on-8", line: { jobId: "job_p2", visitId: "p2-turn-on", name: "Spring turn-on", unitPrice: data.passes.find((p) => p.id === "p2")!.visits.find((v) => v.kind === "turn-on")!.amount, quantity: 1, taxable: false, cancelledAt: null, description: SERVICE_LIST.find((v) => v.key === "turn-on-8")!.description } })
  })
})

describe("toMountainDay", () => {
  it("reads the Mountain calendar day, not the UTC one", () => {
    expect(toMountainDay("2027-05-04T03:00:00Z")).toBe("2027-05-03")
    expect(toMountainDay("2027-01-01T05:00:00Z")).toBe("2026-12-31")
  })
})
