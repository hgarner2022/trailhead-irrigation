// @vitest-environment node
import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import * as schema from "./schema"
import { seed } from "./seed"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { SERVICES } from "@/lib/services"

const folder = fileURLToPath(new URL("../../drizzle/", import.meta.url))
const migration = (name: string) => readFileSync(folder + name, "utf8").split("--> statement-breakpoint")
const files = () => readdirSync(folder).filter((f) => f.endsWith(".sql")).sort()
const data = snapshot as AdminData

describe("migration 0008: jobs backfill", () => {
  it("makes one job per pass and per booking and points every visit at its job", async () => {
    const db = new PGlite()
    const files = readdirSync(folder).filter((f) => f.endsWith(".sql")).sort()
    const jobs = files.findIndex((f) => f.startsWith("0008"))
    for (const f of files.slice(0, jobs)) for (const stmt of migration(f)) if (stmt.trim()) await db.exec(stmt)
    await db.exec(`INSERT INTO organization (id, name, terms_version, settings) VALUES ('o', 'T', '1', '{"windows":[],"bufferPercentEarly":0,"bufferPercentLate":0,"fallTownOrder":[],"springTownOrder":[],"messages":[]}')`)
    await db.exec(`INSERT INTO customer (id, organization_id, first_name) VALUES ('c', 'o', 'A')`)
    await db.exec(`INSERT INTO property (id, organization_id, customer_id, address, town) VALUES ('pr', 'o', 'c', '1 Main', 'Erie')`)
    await db.exec(`INSERT INTO season_pass (id, organization_id, number, season, customer_id, property_id, zones, status) VALUES ('p', 'o', 'TH-1', 2027, 'c', 'pr', 8, 'active')`)
    await db.exec(`INSERT INTO booking (id, organization_id, customer_id, property_id, source) VALUES ('b', 'o', 'c', 'pr', 'admin')`)
    await db.exec(`INSERT INTO visit (id, organization_id, pass_id, customer_id, property_id, kind, amount) VALUES ('v1', 'o', 'p', 'c', 'pr', 'turn-on', 145), ('v2', 'o', 'p', 'c', 'pr', 'blowout', 115)`)
    await db.exec(`INSERT INTO visit (id, organization_id, booking_id, customer_id, property_id, kind, amount) VALUES ('v3', 'o', 'b', 'c', 'pr', 'repair', 145)`)
    for (const stmt of migration(files[jobs]!)) if (stmt.trim()) await db.exec(stmt)

    const job = (await db.query<{ id: string; kind: string; status: string; price: number | null; source: string }>(`SELECT id, kind, status, price, source FROM job ORDER BY id`)).rows
    expect(job).toEqual([
      { id: "job_b", kind: "repair", status: "active", price: 145, source: "office" },
      { id: "job_p", kind: "pass", status: "active", price: 260, source: "checkout" },
    ])
    const visits = (await db.query<{ id: string; job_id: string }>(`SELECT id, job_id FROM visit ORDER BY id`)).rows
    expect(visits).toEqual([{ id: "v1", job_id: "job_p" }, { id: "v2", job_id: "job_p" }, { id: "v3", job_id: "job_b" }])
    expect((await db.query<{ job_id: string }>(`SELECT job_id FROM season_pass`)).rows).toEqual([{ job_id: "job_p" }])
    await db.close()
  })
})

describe("migration 0014: line items backfill", () => {
  it("gives a seeded pass one line per visit and a one-off job one line on its first visit, and a re-run adds none", async () => {
    const client = new PGlite()
    const all = files()
    const at = all.findIndex((f) => f.startsWith("0014_line_items"))
    expect(at).toBeGreaterThan(0)
    // 0015 to 0018 only add the property, card, pass and payment columns the seed now writes; the seed needs them to insert.
    const later = ["0015_property_fields", "0016_customer_card", "0017_job_pass", "0018_payment"].map((name) => all.find((f) => f.startsWith(name))!)
    for (const f of [...all.slice(0, at + 1), ...later]) for (const stmt of migration(f)) if (stmt.trim()) await client.exec(stmt)
    const org = data.organizationId
    await seed(drizzle(client, { schema }), data, { organizationId: org, admins: [], passes: true })
    // The seed writes the fixture's lines itself; the backfill is for a database that had none.
    await client.exec(`DELETE FROM line_item`)
    const visits = data.passes.reduce((sum, p) => sum + p.visits.length, 0)
    await client.exec(`UPDATE visit SET status = 'skipped' WHERE id = 'p9-blowout'`)
    await client.exec(`INSERT INTO customer (id, organization_id, first_name) VALUES ('c-x', '${org}', 'B')`)
    await client.exec(`INSERT INTO property (id, organization_id, customer_id, address, town) VALUES ('pr-x', '${org}', 'c-x', '2 Main', 'Erie')`)
    // One-off jobs: a repair, an unpriced other, an install, a cancelled repair, and a repair whose first visit names a blowout service.
    await client.exec(
      `INSERT INTO job (id, organization_id, customer_id, property_id, kind, price, source, status, cancelled_at) VALUES
        ('j-repair', '${org}', 'c-x', 'pr-x', 'repair', 145, 'office', 'active', NULL),
        ('j-other', '${org}', 'c-x', 'pr-x', 'other', NULL, 'office', 'active', NULL),
        ('j-install', '${org}', 'c-x', 'pr-x', 'install', 4200, 'office', 'active', NULL),
        ('j-gone', '${org}', 'c-x', 'pr-x', 'repair', 145, 'office', 'cancelled', '2027-04-01T15:00:00Z'),
        ('j-wrong', '${org}', 'c-x', 'pr-x', 'repair', 145, 'office', 'active', NULL)`,
    )
    const blowoutService = (await client.query<{ id: string }>(`SELECT id FROM service WHERE organization_id = '${org}' AND key = 'blowout'`)).rows[0]!.id
    await client.exec(
      `INSERT INTO visit (id, organization_id, job_id, customer_id, property_id, kind, amount, status, service_id, created_at) VALUES
        ('v-late', '${org}', 'j-repair', 'c-x', 'pr-x', 'repair', 145, 'unscheduled', NULL, '2027-03-02'),
        ('v-first', '${org}', 'j-repair', 'c-x', 'pr-x', 'repair', 145, 'unscheduled', NULL, '2027-03-01'),
        ('v-install', '${org}', 'j-install', 'c-x', 'pr-x', 'install', 4200, 'unscheduled', NULL, '2027-03-03'),
        ('v-gone', '${org}', 'j-gone', 'c-x', 'pr-x', 'repair', 145, 'cancelled', NULL, '2027-03-04'),
        ('v-wrong', '${org}', 'j-wrong', 'c-x', 'pr-x', 'repair', 145, 'unscheduled', '${blowoutService}', '2027-03-05')`,
    )
    // A pass of 20 zones with no service on its visit: no blowout band fits, so its line has no service.
    await client.exec(`INSERT INTO job (id, organization_id, customer_id, property_id, kind, price, source) VALUES ('job_pbig', '${org}', 'c-x', 'pr-x', 'pass', 235, 'checkout')`)
    await client.exec(`INSERT INTO season_pass (id, organization_id, job_id, number, season, customer_id, property_id, zones, status) VALUES ('pbig', '${org}', 'job_pbig', 'TH-2027-9999', 2027, 'c-x', 'pr-x', 20, 'active')`)
    await client.exec(`INSERT INTO visit (id, organization_id, job_id, pass_id, customer_id, property_id, kind, amount) VALUES ('pbig-blowout', '${org}', 'job_pbig', 'pbig', 'c-x', 'pr-x', 'blowout', 235)`)
    // A second organization offering two repair services: neither can be the line's.
    await client.exec(`INSERT INTO organization (id, name, terms_version, settings) VALUES ('o2', 'Two', '1', '{"windows":[],"bufferPercentEarly":0,"bufferPercentLate":0,"fallTownOrder":[],"springTownOrder":[],"messages":[]}')`)
    await client.exec(`INSERT INTO service (id, organization_id, key, name, kind, slot_minutes, price) VALUES ('o2-repair-a', 'o2', 'repair', 'Repair A', 'repair', 60, 145), ('o2-repair-b', 'o2', 'repair-b', 'Repair B', 'repair', 60, 165)`)
    await client.exec(`INSERT INTO customer (id, organization_id, first_name) VALUES ('c-o2', 'o2', 'C')`)
    await client.exec(`INSERT INTO property (id, organization_id, customer_id, address, town) VALUES ('pr-o2', 'o2', 'c-o2', '3 Main', 'Erie')`)
    await client.exec(`INSERT INTO job (id, organization_id, customer_id, property_id, kind, price, source) VALUES ('j-two', 'o2', 'c-o2', 'pr-o2', 'repair', 145, 'office')`)
    await client.exec(`INSERT INTO visit (id, organization_id, job_id, customer_id, property_id, kind, amount) VALUES ('v-two', 'o2', 'j-two', 'c-o2', 'pr-o2', 'repair', 145)`)
    const statements = migration(all[at]!).filter((stmt) => /INSERT INTO "line_item"/.test(stmt))
    expect(statements).toHaveLength(2)
    for (const stmt of statements) await client.exec(stmt)

    type Row = { visit_id: string | null; job_id: string; name: string; unit_price: number; amount: number | null; kind: string; service_key: string | null; description: string | null; cancelled: boolean; cancelled_at: string | null; taxable: boolean; quantity: number }
    const read = async () =>
      (
        await client.query<Row>(
          `SELECT l.visit_id, l.job_id, l.name, l.unit_price, v.amount, l.quantity, l.taxable, s.key AS service_key, l.description, l.cancelled_at IS NOT NULL AS cancelled,
                  to_char(l.cancelled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS cancelled_at, COALESCE(v.kind::text, j.kind::text) AS kind
           FROM line_item l JOIN job j ON j.id = l.job_id LEFT JOIN visit v ON v.id = l.visit_id LEFT JOIN service s ON s.id = l.service_id ORDER BY l.id`,
        )
      ).rows
    const lines = await read()
    const passLines = lines.filter((l) => l.job_id.startsWith("job_p"))
    expect(passLines).toHaveLength(visits + 1)
    expect(passLines.every((l) => l.unit_price === l.amount && l.quantity === 1 && l.taxable === false && l.job_id === `job_${l.visit_id!.split("-")[0]}`)).toBe(true)
    const names = { "turn-on": "Spring turn-on", inspection: "Mid-season inspection", blowout: "Fall blowout" }
    expect(passLines.every((l) => l.name === names[l.kind as keyof typeof names])).toBe(true)
    const p2 = passLines.filter((l) => l.job_id === "job_p2")
    expect(p2.map((l) => [l.visit_id, l.unit_price, l.service_key])).toEqual([
      ["p2-blowout", 115, "blowout"],
      ["p2-inspection", 145, "inspection-8"],
      ["p2-turn-on", 145, "turn-on-8"],
    ])
    expect(passLines.find((l) => l.visit_id === "p10-turn-on")?.service_key).toBe("turn-on-12")
    expect(p2[0]!.description).toBe(SERVICES.blowout.description)
    expect(passLines.filter((l) => l.cancelled).map((l) => l.visit_id)).toEqual(["p9-blowout"])
    expect(passLines.find((l) => l.visit_id === "pbig-blowout")).toMatchObject({ name: "Fall blowout", unit_price: 235, service_key: null, description: null })
    const oneOff = (id: string) => lines.filter((l) => l.job_id === id)
    expect(oneOff("j-repair")).toEqual([
      { visit_id: "v-first", job_id: "j-repair", name: "Repair", unit_price: 145, amount: 145, quantity: 1, taxable: false, service_key: "repair", description: SERVICES.repair!.description, cancelled: false, cancelled_at: null, kind: "repair" },
    ])
    expect(oneOff("j-other")).toEqual([
      { visit_id: null, job_id: "j-other", name: "Other", unit_price: 0, amount: null, quantity: 1, taxable: false, service_key: null, description: null, cancelled: false, cancelled_at: null, kind: "other" },
    ])
    expect(oneOff("j-install")).toMatchObject([{ visit_id: "v-install", name: "Installation", unit_price: 4200, service_key: "install", description: SERVICES.install!.description, cancelled: false }])
    expect(oneOff("j-gone")).toMatchObject([{ visit_id: "v-gone", name: "Repair", service_key: "repair", cancelled: true, cancelled_at: "2027-04-01T15:00:00Z" }])
    expect(oneOff("j-wrong")).toMatchObject([{ visit_id: "v-wrong", name: "Repair", service_key: "repair", description: SERVICES.repair!.description }])
    expect(oneOff("j-two")).toMatchObject([{ visit_id: "v-two", name: "Repair", unit_price: 145, service_key: null, description: null }])
    expect(lines).toHaveLength(visits + 1 + 6)

    for (const stmt of statements) await client.exec(stmt)
    expect(await read()).toEqual(lines)
    await client.close()
  })
})

describe("migration 0017: the pass on the job", () => {
  it("gives a pass job its season and number, points a renewed pass's job at the old job as a renewal, and a re-run changes nothing", async () => {
    const client = new PGlite()
    const all = files()
    const at = all.findIndex((f) => f.startsWith("0017_job_pass"))
    expect(at).toBeGreaterThan(0)
    for (const f of all.slice(0, at)) for (const stmt of migration(f)) if (stmt.trim()) await client.exec(stmt)
    await client.exec(`INSERT INTO organization (id, name, terms_version, settings) VALUES ('o', 'T', '1', '{"windows":[],"bufferPercentEarly":0,"bufferPercentLate":0,"fallTownOrder":[],"springTownOrder":[],"messages":[]}')`)
    await client.exec(`INSERT INTO customer (id, organization_id, first_name) VALUES ('c', 'o', 'A')`)
    await client.exec(`INSERT INTO property (id, organization_id, customer_id, address, town) VALUES ('pr', 'o', 'c', '1 Main', 'Erie')`)
    await client.exec(`INSERT INTO job (id, organization_id, customer_id, property_id, kind, source) VALUES ('job_old', 'o', 'c', 'pr', 'pass', 'checkout'), ('job_new', 'o', 'c', 'pr', 'pass', 'checkout'), ('job_alone', 'o', 'c', 'pr', 'pass', 'office'), ('job_repair', 'o', 'c', 'pr', 'repair', 'office')`)
    await client.exec(
      `INSERT INTO season_pass (id, organization_id, job_id, number, season, customer_id, property_id, zones, status) VALUES
        ('old', 'o', 'job_old', 'TH-2026-0001', 2026, 'c', 'pr', 8, 'lapsed'),
        ('new', 'o', 'job_new', 'TH-2027-0001', 2027, 'c', 'pr', 8, 'active'),
        ('alone', 'o', 'job_alone', 'TH-2027-0002', 2027, 'c', 'pr', 6, 'active')`,
    )
    await client.exec(`INSERT INTO pass_change (id, organization_id, customer_id, pass_id, kind, detail, by_principal) VALUES ('pc1', 'o', 'c', 'new', 'renewed', '{"from":"old","season":2027}', 'public')`)
    type Row = { id: string; season: number | null; pass_number: string | null; renews_job_id: string | null; source: string }
    const read = async () => (await client.query<Row>(`SELECT id, season, pass_number, renews_job_id, source FROM job ORDER BY id`)).rows
    const statements = migration(all[at]!)
    for (const stmt of statements) if (stmt.trim()) await client.exec(stmt)
    const after = await read()
    expect(after).toEqual([
      { id: "job_alone", season: 2027, pass_number: "TH-2027-0002", renews_job_id: null, source: "office" },
      { id: "job_new", season: 2027, pass_number: "TH-2027-0001", renews_job_id: "job_old", source: "renewal" },
      { id: "job_old", season: 2026, pass_number: "TH-2026-0001", renews_job_id: null, source: "checkout" },
      { id: "job_repair", season: null, pass_number: null, renews_job_id: null, source: "office" },
    ])
    // The data statements are the ones that update; a second run leaves every row as it was.
    for (const stmt of statements.filter((x) => /^\s*update "job"/i.test(x))) await client.exec(stmt)
    expect(await read()).toEqual(after)
    await client.close()
  })
})

describe("migration 0018: the payment record", () => {
  it("gives a charge row its visit's job, customer and the completed day, and a re-run changes nothing", async () => {
    const client = new PGlite()
    const all = files()
    const at = all.findIndex((f) => f.startsWith("0018_payment"))
    expect(at).toBeGreaterThan(0)
    for (const f of all.slice(0, at)) for (const stmt of migration(f)) if (stmt.trim()) await client.exec(stmt)
    await client.exec(`INSERT INTO organization (id, name, terms_version, settings) VALUES ('o', 'T', '1', '{"windows":[],"bufferPercentEarly":0,"bufferPercentLate":0,"fallTownOrder":[],"springTownOrder":[],"messages":[]}')`)
    await client.exec(`INSERT INTO customer (id, organization_id, first_name) VALUES ('c', 'o', 'A')`)
    await client.exec(`INSERT INTO property (id, organization_id, customer_id, address, town) VALUES ('pr', 'o', 'c', '1 Main', 'Erie')`)
    await client.exec(`INSERT INTO job (id, organization_id, customer_id, property_id, kind, source) VALUES ('j1', 'o', 'c', 'pr', 'repair', 'office'), ('j2', 'o', 'c', 'pr', 'repair', 'office')`)
    await client.exec(
      `INSERT INTO visit (id, organization_id, job_id, customer_id, property_id, kind, amount, status, completed_on) VALUES
        ('v1', 'o', 'j1', 'c', 'pr', 'repair', 145, 'completed', '2027-04-02'),
        ('v2', 'o', 'j2', 'c', 'pr', 'repair', 145, 'unscheduled', NULL)`,
    )
    // v2 has no completed day: the day the row was made, in Denver, stands in (23:30 Mountain on the 5th is 05:30 UTC on the 6th).
    await client.exec(
      `INSERT INTO charge (id, organization_id, visit_id, attempt, amount, status, method, created_at) VALUES
        ('ch1', 'o', 'v1', 1, 145, 'succeeded', 'cash', '2027-04-03T15:00:00Z'),
        ('ch2', 'o', 'v2', 1, 145, 'failed', 'card_on_file', '2027-05-06T05:30:00Z')`,
    )
    type Row = { id: string; job_id: string | null; customer_id: string | null; paid_on: string | null }
    const read = async () => (await client.query<Row>(`SELECT id, job_id, customer_id, to_char(paid_on, 'YYYY-MM-DD') AS paid_on FROM charge ORDER BY id`)).rows
    const statements = migration(all[at]!).filter((x) => /^\s*update "charge"/i.test(x))
    expect(statements).toHaveLength(1)
    for (const stmt of migration(all[at]!)) if (stmt.trim()) await client.exec(stmt)
    const after = await read()
    expect(after).toEqual([
      { id: "ch1", job_id: "j1", customer_id: "c", paid_on: "2027-04-02" },
      { id: "ch2", job_id: "j2", customer_id: "c", paid_on: "2027-05-05" },
    ])
    for (const stmt of statements) await client.exec(stmt)
    expect(await read()).toEqual(after)
    await client.close()
  })
})

describe("migration 0020: the event record", () => {
  it("gives every pass_change row one event with the new kind, its record and its job, makes a note from each non-empty notes column, and a re-run adds nothing", async () => {
    const client = new PGlite()
    const all = files()
    const at = all.findIndex((f) => f.startsWith("0020_event"))
    expect(at).toBeGreaterThan(0)
    for (const f of all.slice(0, at)) for (const stmt of migration(f)) if (stmt.trim()) await client.exec(stmt)
    await client.exec(`INSERT INTO organization (id, name, terms_version, settings) VALUES ('o', 'T', '1', '{"windows":[],"bufferPercentEarly":0,"bufferPercentLate":0,"fallTownOrder":[],"springTownOrder":[],"messages":[]}')`)
    await client.exec(`INSERT INTO customer (id, organization_id, first_name) VALUES ('c', 'o', 'A')`)
    await client.exec(`INSERT INTO property (id, organization_id, customer_id, address, town, notes, updated_at) VALUES ('pr', 'o', 'c', '1 Main', 'Erie', 'Dog in the yard', '2027-03-01T12:00:00Z'), ('pr2', 'o', 'c', '2 Main', 'Erie', '  ', now()), ('pr3', 'o', 'c', '3 Main', 'Erie', NULL, now())`)
    await client.exec(`INSERT INTO job (id, organization_id, customer_id, property_id, kind, source, notes, updated_at) VALUES ('job_p', 'o', 'c', 'pr', 'pass', 'checkout', 'Pays by check', '2027-03-02T12:00:00Z'), ('job_one', 'o', 'c', 'pr', 'repair', 'office', NULL, now())`)
    await client.exec(`INSERT INTO season_pass (id, organization_id, job_id, number, season, customer_id, property_id, zones, status) VALUES ('p', 'o', 'job_p', 'TH-2027-0001', 2027, 'c', 'pr', 8, 'active')`)
    await client.exec(
      `INSERT INTO visit (id, organization_id, job_id, pass_id, customer_id, property_id, kind, amount, notes, updated_at) VALUES
        ('v1', 'o', 'job_p', 'p', 'c', 'pr', 'turn-on', 145, 'Gate sticks', '2027-03-03T12:00:00Z'),
        ('v2', 'o', 'job_p', 'p', 'c', 'pr', 'blowout', 115, '   ', now())`,
    )
    await client.exec(`INSERT INTO visit (id, organization_id, job_id, customer_id, property_id, kind, amount, notes, updated_at) VALUES ('v3', 'o', 'job_one', 'c', 'pr', 'repair', 145, NULL, now())`)
    await client.exec(
      `INSERT INTO pass_change (id, organization_id, customer_id, pass_id, visit_id, kind, detail, by_principal, at) VALUES
        ('pc1', 'o', 'c', 'p', 'v1', 'day-picked', '{"day":"2027-05-05"}', 'andrea@example.com', '2027-04-01T15:00:00Z'),
        ('pc2', 'o', 'c', 'p', NULL, 'cancelled', '{"reason":"moving"}', 'owner@example.com', '2027-04-02T15:00:00Z'),
        ('pc3', 'o', 'c', 'p', NULL, 'renewed', '{"from":"old","season":2027}', 'public', '2027-04-03T15:00:00Z'),
        ('pc4', 'o', 'c', NULL, 'v3', 'visit-created', '{"kind":"repair"}', 'owner@example.com', '2027-04-04T15:00:00Z'),
        ('pc5', 'o', 'c', NULL, NULL, 'consent-snapshot', '{"source":"admin"}', 'owner@example.com', '2027-04-05T15:00:00Z'),
        ('pc6', 'o', 'c', 'p', 'v1', 'sold', '{}', 'owner@example.com', '2027-04-06T15:00:00Z'),
        ('pc7', 'o', 'c', 'p', 'v2', 'brand-new-kind', '{}', 'api-key:k', '2027-04-07T15:00:00Z'),
        ('pc8', 'o', 'c', 'p', 'v2', 'skipped', '{"visit":"blowout"}', 'andrea@example.com', '2027-04-08T15:00:00Z')`,
    )
    type Row = { id: string; about: string; about_id: string; customer_id: string | null; job_id: string | null; visit_id: string | null; kind: string; detail: Record<string, unknown>; who: string; at: string }
    const read = async () =>
      (await client.query<Row>(`SELECT id, about, about_id, customer_id, job_id, visit_id, kind, detail, who, to_char(at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS at FROM event ORDER BY id`)).rows
    const statements = migration(all[at]!).filter((stmt) => stmt.trim())
    for (const stmt of statements) await client.exec(stmt)

    const rows = await read()
    const pc = (n: number) => rows.find((r) => r.id === `evt_pc_pc${n}`)!
    expect(rows.filter((r) => r.id.startsWith("evt_pc_"))).toHaveLength(8)
    expect(pc(1)).toEqual({ id: "evt_pc_pc1", about: "visit", about_id: "v1", customer_id: "c", job_id: "job_p", visit_id: "v1", kind: "visit.moved", detail: { day: "2027-05-05" }, who: "andrea@example.com", at: "2027-04-01T15:00:00Z" })
    expect(pc(2)).toMatchObject({ about: "job", about_id: "job_p", job_id: "job_p", visit_id: null, kind: "pass.cancelled", detail: { reason: "moving" } })
    expect(pc(3)).toMatchObject({ about: "job", about_id: "job_p", kind: "job.sold", who: "public", detail: { from: "old", season: 2027, source: "renewal" } })
    // a visit-created row is about its job, not its visit, and still carries the visit; its job comes through the visit
    expect(pc(4)).toMatchObject({ about: "job", about_id: "job_one", job_id: "job_one", visit_id: "v3", kind: "job.sold" })
    expect(pc(5)).toMatchObject({ about: "customer", about_id: "c", customer_id: "c", job_id: null, visit_id: null, kind: "consent" })
    expect(pc(6)).toMatchObject({ about: "job", kind: "job.sold", visit_id: "v1", detail: { source: "office" } })
    expect(pc(7)).toMatchObject({ about: "job", about_id: "job_p", kind: "brand-new-kind", who: "api-key:k" })
    expect(pc(8)).toMatchObject({ about: "visit", about_id: "v2", kind: "visit.skipped" })

    const notes = rows.filter((r) => r.kind === "note")
    expect(notes.map((n) => n.id).sort()).toEqual(["evt_note_job_job_p", "evt_note_property_pr", "evt_note_visit_v1"])
    expect(notes.find((n) => n.id === "evt_note_visit_v1")).toEqual({ id: "evt_note_visit_v1", about: "visit", about_id: "v1", customer_id: "c", job_id: "job_p", visit_id: "v1", kind: "note", detail: { text: "Gate sticks" }, who: "system", at: "2027-03-03T12:00:00Z" })
    expect(notes.find((n) => n.id === "evt_note_job_job_p")).toMatchObject({ about: "job", about_id: "job_p", job_id: "job_p", visit_id: null, detail: { text: "Pays by check" }, at: "2027-03-02T12:00:00Z" })
    expect(notes.find((n) => n.id === "evt_note_property_pr")).toMatchObject({ about: "property", about_id: "pr", customer_id: "c", job_id: null, visit_id: null, detail: { text: "Dog in the yard" }, at: "2027-03-01T12:00:00Z" })
    expect(rows).toHaveLength(8 + 3)
    expect((await client.query(`SELECT 1 FROM event WHERE organization_id IS NULL`)).rows).toHaveLength(0)

    // The data statements are the inserts; a second run leaves every row as it was.
    for (const stmt of statements.filter((x) => /^\s*insert into "event"/i.test(x))) await client.exec(stmt)
    expect(await read()).toEqual(rows)
    await client.close()
  })
})
