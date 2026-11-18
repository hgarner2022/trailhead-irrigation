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
    // The seed also writes the old pass id and the job dates, columns migration 0021 adds, and no longer writes `job.kind` (0021 makes it nullable); only those job column statements run here.
    for (const stmt of migration(all.find((f) => f.startsWith("0021_legacy_expand"))!)) if (/^ALTER TABLE "job" (ADD COLUMN|ALTER COLUMN "kind" DROP NOT NULL)/.test(stmt.trim())) await client.exec(stmt)
    const org = data.organizationId
    await seed(drizzle(client, { schema }), data, { organizationId: org, admins: [], passes: true })
    // The database here is the one the 0014 backfill ran on, where a pass job carried its kind and a `season_pass` row carried its zones: write them by hand, as the old code did (the seed no longer does).
    await client.exec(`UPDATE job SET kind = 'pass' WHERE organization_id = '${org}'`)
    for (const p of data.passes) {
      await client.exec(
        `INSERT INTO season_pass (id, organization_id, job_id, number, season, customer_id, property_id, zones, status) VALUES ('${p.id}', '${org}', 'job_${p.id}', '${p.number}', ${p.season}, '${p.clientId}', 'property-${p.clientId}', ${p.zones}, 'active')`,
      )
    }
    // The seed writes the fixture's lines itself, and no longer the visit's old amount column; the backfill is for a database that had no lines, whose visits carried their amounts.
    await client.exec(`UPDATE visit SET amount = (SELECT unit_price FROM line_item WHERE line_item.visit_id = visit.id LIMIT 1)`)
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
    await client.exec(`INSERT INTO job (id, organization_id, customer_id, property_id, kind, source, notes, updated_at) VALUES ('job_p', 'o', 'c', 'pr', 'pass', 'checkout', 'Pays by check', '2027-03-02T12:00:00Z'), ('job_one', 'o', 'c', 'pr', 'repair', 'office', NULL, now()), ('job_dup', 'o', 'c', 'pr', 'repair', 'office', 'Call first', '2027-03-04T12:00:00Z')`)
    await client.exec(`INSERT INTO season_pass (id, organization_id, job_id, number, season, customer_id, property_id, zones, status) VALUES ('p', 'o', 'job_p', 'TH-2027-0001', 2027, 'c', 'pr', 8, 'active')`)
    await client.exec(
      `INSERT INTO visit (id, organization_id, job_id, pass_id, customer_id, property_id, kind, amount, notes, updated_at) VALUES
        ('v1', 'o', 'job_p', 'p', 'c', 'pr', 'turn-on', 145, 'Gate sticks', '2027-03-03T12:00:00Z'),
        ('v2', 'o', 'job_p', 'p', 'c', 'pr', 'blowout', 115, '   ', now())`,
    )
    await client.exec(`INSERT INTO visit (id, organization_id, job_id, customer_id, property_id, kind, amount, notes, updated_at) VALUES ('v3', 'o', 'job_one', 'c', 'pr', 'repair', 145, NULL, now()), ('v4', 'o', 'job_dup', 'c', 'pr', 'repair', 145, 'Call first', '2027-03-04T12:00:00Z')`)
    await client.exec(
      `INSERT INTO pass_change (id, organization_id, customer_id, pass_id, visit_id, kind, detail, by_principal, at) VALUES
        ('pc1', 'o', 'c', 'p', 'v1', 'day-picked', '{"day":"2027-05-05"}', 'andrea@example.com', '2027-04-01T15:00:00Z'),
        ('pc2', 'o', 'c', 'p', NULL, 'cancelled', '{"reason":"moving"}', 'owner@example.com', '2027-04-02T15:00:00Z'),
        ('pc3', 'o', 'c', 'p', NULL, 'renewed', '{"from":"old","season":2027}', 'public:checkout', '2027-04-03T15:00:00Z'),
        ('pc4', 'o', 'c', NULL, 'v3', 'visit-created', '{"kind":"repair"}', 'owner@example.com', '2027-04-04T15:00:00Z'),
        ('pc5', 'o', 'c', NULL, NULL, 'consent-snapshot', '{"source":"admin"}', 'api-key:system', '2027-04-05T15:00:00Z'),
        ('pc6', 'o', 'c', 'p', 'v1', 'sold', '{}', 'owner@example.com', '2027-04-06T15:00:00Z'),
        ('pc7', 'o', 'c', 'p', 'v2', 'brand-new-kind', '{}', 'api-key:abc', '2027-04-07T15:00:00Z'),
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
    expect(pc(3)).toMatchObject({ about: "job", about_id: "job_p", kind: "job.sold", who: "customer", detail: { from: "old", season: 2027, source: "renewal" } })
    // a visit-created row is about its job, not its visit, and still carries the visit; its job comes through the visit
    expect(pc(4)).toMatchObject({ about: "job", about_id: "job_one", job_id: "job_one", visit_id: "v3", kind: "job.sold" })
    expect(pc(5)).toMatchObject({ about: "customer", about_id: "c", customer_id: "c", job_id: null, visit_id: null, kind: "consent", who: "system" })
    expect(pc(6)).toMatchObject({ about: "job", kind: "job.sold", visit_id: "v1", detail: { source: "office" } })
    expect(pc(7)).toMatchObject({ about: "job", about_id: "job_p", kind: "brand-new-kind", who: "api" })
    expect(pc(8)).toMatchObject({ about: "visit", about_id: "v2", kind: "visit.skipped" })

    const notes = rows.filter((r) => r.kind === "note")
    // job_dup's note is the same text as its visit's (visits.create writes both): one note event, the visit's; job_p's differs, so it keeps its own.
    expect(notes.map((n) => n.id).sort()).toEqual(["evt_note_job_job_p", "evt_note_property_pr", "evt_note_visit_v1", "evt_note_visit_v4"])
    expect(notes.find((n) => n.id === "evt_note_visit_v1")).toEqual({ id: "evt_note_visit_v1", about: "visit", about_id: "v1", customer_id: "c", job_id: "job_p", visit_id: "v1", kind: "note", detail: { text: "Gate sticks" }, who: "system", at: "2027-03-03T12:00:00Z" })
    expect(notes.find((n) => n.id === "evt_note_job_job_p")).toMatchObject({ about: "job", about_id: "job_p", job_id: "job_p", visit_id: null, detail: { text: "Pays by check" }, at: "2027-03-02T12:00:00Z" })
    expect(notes.find((n) => n.id === "evt_note_property_pr")).toMatchObject({ about: "property", about_id: "pr", customer_id: "c", job_id: null, visit_id: null, detail: { text: "Dog in the yard" }, at: "2027-03-01T12:00:00Z" })
    expect(rows).toHaveLength(8 + 4)
    expect((await client.query(`SELECT 1 FROM event WHERE organization_id IS NULL`)).rows).toHaveLength(0)

    // The data statements are the inserts; a second run leaves every row as it was.
    for (const stmt of statements.filter((x) => /^\s*insert into "event"/i.test(x))) await client.exec(stmt)
    expect(await read()).toEqual(rows)
    await client.close()
  })
})

const ORG_SETTINGS = `'{"windows":[],"bufferPercentEarly":0,"bufferPercentLate":0,"fallTownOrder":[],"springTownOrder":[],"messages":[]}'`
/** A statement without the comment lines that lead it. */
const bare = (stmt: string) => stmt.replace(/^(\s*--[^\n]*\n)+/, "").trim()

describe("migration 0021: the expand step", () => {
  async function before() {
    const client = new PGlite()
    const all = files()
    const at = all.findIndex((f) => f.startsWith("0021_legacy_expand"))
    expect(at).toBeGreaterThan(0)
    for (const f of all.slice(0, at)) for (const stmt of migration(f)) if (stmt.trim()) await client.exec(stmt)
    await client.exec(`INSERT INTO organization (id, name, terms_version, settings) VALUES ('o', 'T', '1', ${ORG_SETTINGS}), ('o2', 'Two', '1', ${ORG_SETTINGS})`)
    await client.exec(`INSERT INTO customer (id, organization_id, first_name) VALUES ('c', 'o', 'A'), ('c2', 'o', 'B'), ('c3', 'o', 'C'), ('c4', 'o', 'D')`)
    await client.exec(
      `INSERT INTO property (id, organization_id, customer_id, address, town, created_at) VALUES
        ('pr', 'o', 'c', '1 Main', 'Erie', '2027-01-01'), ('pr-new', 'o', 'c', '2 Main', 'Erie', '2027-02-01'), ('pr3', 'o', 'c3', '3 Main', 'Erie', now()), ('pr4', 'o', 'c4', '4 Main', 'Erie', now())`,
    )
    await client.exec(`INSERT INTO service (id, organization_id, key, name, kind, slot_minutes, price, description, taxable) VALUES ('s-repair', 'o', 'repair', 'Sprinkler repair', 'repair', 60, 145, 'Find it and fix it', true), ('s-aer', 'o', 'aeration', 'Lawn aeration', 'aeration', 60, 100, NULL, false)`)
    return { client, all, at }
  }

  it("fills the legacy ids, sold days, alert and message keys, and every straggler a drop would lose, and a re-run changes nothing", async () => {
    const { client, all, at } = await before()
    // Two passes: an active one sold at 21:00 on the 4th in Denver, a pending one that is not sold yet.
    await client.exec(
      `INSERT INTO job (id, organization_id, customer_id, property_id, kind, status, source, season, pass_number, created_at, notes, updated_at) VALUES
        ('job_p', 'o', 'c', 'pr', 'pass', 'active', 'checkout', 2027, 'TH-2027-0001', '2027-03-05T04:00:00Z', 'Pays by check', '2027-03-06T12:00:00Z'),
        ('job_pp', 'o', 'c3', 'pr3', 'pass', 'pending', 'checkout', 2027, 'TH-2027-0002', '2027-03-05T04:00:00Z', NULL, now()),
        ('job_rep', 'o', 'c', 'pr', 'repair', 'active', 'office', NULL, NULL, '2027-04-10T18:00:00Z', 'Same as visit', '2027-04-11T12:00:00Z'),
        ('job_chg', 'o', 'c', 'pr', 'repair', 'active', 'office', NULL, NULL, '2027-04-10T18:00:00Z', 'Gate sticks too', now()),
        ('job_aer', 'o', 'c', 'pr', 'other', 'cancelled', 'office', NULL, NULL, '2027-04-10T18:00:00Z', NULL, now()),
        ('job_blank', 'o', 'c', 'pr', 'repair', 'active', 'office', NULL, NULL, now(), '   ', now()),
        ('job_qr_q-have', 'o', 'c4', 'pr4', 'other', 'active', 'site', NULL, NULL, now(), NULL, now()),
        ('job_b-has', 'o', 'c4', 'pr4', 'repair', 'active', 'office', NULL, NULL, now(), NULL, now())`,
    )
    await client.exec(
      `INSERT INTO season_pass (id, organization_id, job_id, number, season, customer_id, property_id, zones, status) VALUES
        ('p', 'o', 'job_p', 'TH-2027-0001', 2027, 'c', 'pr', 8, 'active'),
        ('pp', 'o', 'job_pp', 'TH-2027-0002', 2027, 'c3', 'pr3', 6, 'pending')`,
    )
    await client.exec(
      `INSERT INTO admin_alert (id, organization_id, kind, key, pass_id, message) VALUES
        ('a1', 'o', 'new-pass', 'p', 'p', 'New Season Pass'),
        ('a2', 'o', 'card-expiring', 'p@2027-05', 'p', 'Card expiring'),
        ('a3', 'o', 'new-pass', 'pp', 'pp', 'New Season Pass (taken)'),
        ('a4', 'o', 'new-pass', 'job_pp', NULL, 'The same alert, already on the job id'),
        ('a5', 'o', 'other', 'pig', NULL, 'Not a pass id'),
        ('a6', 'o2', 'new-pass', 'p', NULL, 'Another organization with the same key')`,
    )
    await client.exec(
      `INSERT INTO message_log (id, organization_id, customer_id, channel, kind, key, "to", body) VALUES
        ('m1', 'o', 'c', 'email', 'purchase-confirmation', 'p', 'a@example.com', 'Thanks'),
        ('m2', 'o', 'c', 'email', 'cancelled', 'p', 'a@example.com', 'Cancelled'),
        ('m3', 'o', 'c', 'sms', 'day-before', 'p', '+1', 'Tomorrow'),
        ('m4', 'o', 'c3', 'email', 'purchase-confirmation', 'pp', 'c@example.com', 'Taken'),
        ('m5', 'o', 'c3', 'email', 'purchase-confirmation', 'job_pp', 'c@example.com', 'Already on the job id')`,
    )
    await client.exec(
      `INSERT INTO visit (id, organization_id, job_id, pass_id, customer_id, property_id, kind, amount, status, notes, charged_at, stripe_payment_intent_id, service_id, created_at, updated_at) VALUES
        ('p-turn-on', 'o', 'job_p', 'p', 'c', 'pr', 'turn-on', 145, 'completed', NULL, '2027-04-02T05:30:00Z', 'pi_paid', NULL, '2027-03-05', now()),
        ('p-blowout', 'o', 'job_p', 'p', 'c', 'pr', 'blowout', 115, 'unscheduled', 'Gate sticks', NULL, NULL, NULL, '2027-03-05', '2027-03-07T12:00:00Z'),
        ('p-insp', 'o', 'job_p', 'p', 'c', 'pr', 'inspection', 145, 'skipped', '   ', NULL, NULL, NULL, '2027-03-05', '2027-03-08T12:00:00Z')`,
    )
    await client.exec(
      `INSERT INTO visit (id, organization_id, job_id, customer_id, property_id, kind, amount, status, notes, charged_at, stripe_payment_intent_id, service_id, created_at, updated_at) VALUES
        ('v-rep', 'o', 'job_rep', 'c', 'pr', 'repair', 145, 'unscheduled', 'Same as visit', NULL, NULL, 's-repair', '2027-04-10', '2027-04-11T12:00:00Z'),
        ('v-chg', 'o', 'job_chg', 'c', 'pr', 'repair', 145, 'completed', 'Gate sticks too', '2027-05-03T05:30:00Z', 'pi_straggler', 's-repair', '2027-04-10', '2027-05-03T12:00:00Z'),
        ('v-retry', 'o', 'job_chg', 'c', 'pr', 'repair', 90, 'completed', NULL, '2027-05-04T15:00:00Z', 'pi_dup', NULL, '2027-04-11', now()),
        ('v-aer', 'o', 'job_aer', 'c', 'pr', 'aeration', 100, 'cancelled', NULL, NULL, NULL, 's-aer', '2027-04-10', '2027-04-12T12:00:00Z'),
        ('v-lined', 'o', 'job_rep', 'c', 'pr', 'repair', 50, 'unscheduled', NULL, NULL, NULL, NULL, '2027-04-12', now()),
        ('v-free', 'o', 'job_rep', 'c', 'pr', 'repair', 0, 'unscheduled', NULL, NULL, NULL, NULL, '2027-04-13', now())`,
    )
    await client.exec(`INSERT INTO line_item (id, organization_id, job_id, visit_id, name, unit_price) VALUES ('line_p-turn-on', 'o', 'job_p', 'p-turn-on', 'Spring turn-on', 145), ('line_custom', 'o', 'job_rep', 'v-lined', 'Custom', 50)`)
    // job_p's turn-on was charged and has its payment; job_chg's first visit was charged with no row, and its second failed once before succeeding with no row.
    await client.exec(
      `INSERT INTO charge (id, organization_id, job_id, customer_id, visit_id, attempt, amount, status, stripe_payment_intent_id, method, paid_on) VALUES
        ('ch-paid', 'o', 'job_p', 'c', 'p-turn-on', 1, 145, 'succeeded', 'pi_paid', 'card_on_file', '2027-04-01'),
        ('ch-failed', 'o', 'job_chg', 'c', 'v-retry', 1, 90, 'failed', 'pi_dup', 'card_on_file', NULL)`,
    )
    // A note typed since 0020 with its event already written (a note event about the job that carries the visit, as visits.create makes), and a note event that matches a job's note.
    await client.exec(
      `INSERT INTO event (id, organization_id, about, about_id, customer_id, job_id, visit_id, kind, detail, who) VALUES
        ('e-has', 'o', 'job', 'job_rep', 'c', 'job_rep', 'v-rep', 'note', '{"text":"Same as visit "}', 'andrea@example.com')`,
    )
    await client.exec(`INSERT INTO booking (id, organization_id, customer_id, property_id, source, status, notes, created_at, updated_at) VALUES ('b-orphan', 'o', 'c4', 'pr4', 'admin', 'booked', 'Call first', '2027-02-02T18:00:00Z', '2027-02-03T18:00:00Z'), ('b-has', 'o', 'c4', 'pr4', 'web', 'booked', NULL, now(), now())`)
    await client.exec(
      `INSERT INTO quote_request (id, organization_id, customer_id, property_id, service_id, notes, status, created_at, updated_at) VALUES
        ('q-new', 'o', 'c', 'pr', 's-repair', 'Valve leaks by the gate', 'new', '2027-03-01T18:00:00Z', '2027-03-01T18:00:00Z'),
        ('q-quoted', 'o', 'c', NULL, 's-aer', 'Aerate the back lawn', 'quoted', '2027-03-02T18:00:00Z', '2027-03-06T20:00:00Z'),
        ('q-arch', 'o', 'c2', NULL, NULL, 'Not sure what we need', 'archived', '2027-03-03T18:00:00Z', '2027-03-07T15:00:00Z'),
        ('q-arch2', 'o', 'c2', NULL, NULL, 'Second ask, same address-less customer', 'new', '2027-03-04T18:00:00Z', '2027-03-04T18:00:00Z'),
        ('q-have', 'o', 'c4', 'pr4', NULL, 'Already a job', 'new', now(), now())`,
    )

    const statements = migration(all[at]!).filter((stmt) => stmt.trim())
    for (const stmt of statements) await client.exec(stmt)

    const q = async <T>(text: string) => (await client.query<T>(text)).rows
    const jobs = await q<{ id: string; legacy_pass_id: string | null; sold_on: string | null; quote_sent_on: string | null }>(
      `SELECT id, legacy_pass_id, to_char(sold_on, 'YYYY-MM-DD') AS sold_on, to_char(quote_sent_on, 'YYYY-MM-DD') AS quote_sent_on FROM job WHERE id IN ('job_p', 'job_pp', 'job_rep', 'job_aer') ORDER BY id`,
    )
    expect(jobs).toEqual([
      { id: "job_aer", legacy_pass_id: null, sold_on: "2027-04-10", quote_sent_on: null },
      { id: "job_p", legacy_pass_id: "p", sold_on: "2027-03-04", quote_sent_on: null },
      { id: "job_pp", legacy_pass_id: "pp", sold_on: null, quote_sent_on: null },
      { id: "job_rep", legacy_pass_id: null, sold_on: "2027-04-10", quote_sent_on: null },
    ])

    // Alerts: the job on each pass alert, the keys rewritten, a key already taken left as it was, another organization untouched.
    const alerts = await q<{ id: string; key: string; job_id: string | null }>(`SELECT id, key, job_id FROM admin_alert ORDER BY id`)
    expect(alerts).toEqual([
      { id: "a1", key: "job_p", job_id: "job_p" },
      { id: "a2", key: "job_p@2027-05", job_id: "job_p" },
      { id: "a3", key: "pp", job_id: "job_pp" },
      { id: "a4", key: "job_pp", job_id: null },
      { id: "a5", key: "pig", job_id: null },
      { id: "a6", key: "p", job_id: null },
    ])
    const messages = await q<{ id: string; key: string }>(`SELECT id, key FROM message_log ORDER BY id`)
    expect(messages).toEqual([{ id: "m1", key: "job_p" }, { id: "m2", key: "job_p" }, { id: "m3", key: "p" }, { id: "m4", key: "pp" }, { id: "m5", key: "job_pp" }])

    // Lines: a priced visit with none gets one named in the words of the app, a cancelled or skipped visit's line is cancelled, a lined or free visit gets nothing.
    const lines = await q<{ id: string; job_id: string; visit_id: string | null; name: string; description: string | null; unit_price: number; taxable: boolean; cancelled: boolean; service_id: string | null }>(
      `SELECT id, job_id, visit_id, name, description, unit_price, taxable, cancelled_at IS NOT NULL AS cancelled, service_id FROM line_item WHERE id NOT LIKE 'line_job_qr_%' ORDER BY id`,
    )
    expect(lines).toEqual([
      { id: "line_custom", job_id: "job_rep", visit_id: "v-lined", name: "Custom", description: null, unit_price: 50, taxable: false, cancelled: false, service_id: null },
      { id: "line_p-blowout", job_id: "job_p", visit_id: "p-blowout", name: "Fall blowout", description: null, unit_price: 115, taxable: false, cancelled: false, service_id: null },
      { id: "line_p-insp", job_id: "job_p", visit_id: "p-insp", name: "Mid-season inspection", description: null, unit_price: 145, taxable: false, cancelled: true, service_id: null },
      { id: "line_p-turn-on", job_id: "job_p", visit_id: "p-turn-on", name: "Spring turn-on", description: null, unit_price: 145, taxable: false, cancelled: false, service_id: null },
      { id: "line_v-aer", job_id: "job_aer", visit_id: "v-aer", name: "Lawn aeration", description: null, unit_price: 100, taxable: false, cancelled: true, service_id: "s-aer" },
      { id: "line_v-chg", job_id: "job_chg", visit_id: "v-chg", name: "Repair", description: "Find it and fix it", unit_price: 145, taxable: true, cancelled: false, service_id: "s-repair" },
      { id: "line_v-rep", job_id: "job_rep", visit_id: "v-rep", name: "Repair", description: "Find it and fix it", unit_price: 145, taxable: true, cancelled: false, service_id: "s-repair" },
      { id: "line_v-retry", job_id: "job_chg", visit_id: "v-retry", name: "Repair", description: null, unit_price: 90, taxable: false, cancelled: false, service_id: null },
    ])

    // Payments: only a charged visit on a job with no succeeded payment; the next free attempt; a payment intent another row holds is not reused.
    const pay = async () =>
      q<{ id: string; job_id: string; customer_id: string; visit_id: string; attempt: number; amount: number; status: string; method: string; paid_on: string | null; stripe_payment_intent_id: string | null }>(
        `SELECT id, job_id, customer_id, visit_id, attempt, amount, status, method, to_char(paid_on, 'YYYY-MM-DD') AS paid_on, stripe_payment_intent_id FROM charge WHERE id LIKE 'ch_legacy_%' ORDER BY id`,
      )
    // job_chg has a failed attempt only, so both its charged visits get a row; the second finds attempt 1 taken by the failed one.
    expect(await pay()).toEqual([
      { id: "ch_legacy_v-chg", job_id: "job_chg", customer_id: "c", visit_id: "v-chg", attempt: 1, amount: 145, status: "succeeded", method: "card_on_file", paid_on: "2027-05-02", stripe_payment_intent_id: "pi_straggler" },
      { id: "ch_legacy_v-retry", job_id: "job_chg", customer_id: "c", visit_id: "v-retry", attempt: 2, amount: 90, status: "succeeded", method: "card_on_file", paid_on: "2027-05-04", stripe_payment_intent_id: null },
    ])
    expect((await q(`SELECT 1 FROM charge WHERE job_id = 'job_p'`)).length).toBe(1)

    // Bookings: a job for the one with none, none for the one that has one.
    expect(await q(`SELECT id, kind::text AS kind, status::text AS status, source, notes, sold_on IS NOT NULL AS sold, to_char(sold_on, 'YYYY-MM-DD') = '2027-02-02' AS sold_that_day FROM job WHERE id IN ('job_b-orphan', 'job_b-has') ORDER BY id`)).toEqual([
      { id: "job_b-has", kind: "repair", status: "active", source: "office", notes: null, sold: true, sold_that_day: false },
      { id: "job_b-orphan", kind: "other", status: "active", source: "office", notes: "Call first", sold: true, sold_that_day: true },
    ])

    // Quote requests: a job each, its property, its one unpriced line and its event; nothing for the one that already has a job.
    const quoteJobs = await q<{ id: string; customer_id: string; property_id: string; kind: string; status: string; price: number | null; source: string; sold_on: string | null; quote_sent_on: string | null; cancelled_at: string | null; created_at: string }>(
      `SELECT id, customer_id, property_id, kind::text AS kind, status::text AS status, price, source, to_char(sold_on, 'YYYY-MM-DD') AS sold_on, to_char(quote_sent_on, 'YYYY-MM-DD') AS quote_sent_on,
              to_char(cancelled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS cancelled_at, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
       FROM job WHERE id LIKE 'job_qr_%' ORDER BY id`,
    )
    expect(quoteJobs.map((j) => j.id)).toEqual(["job_qr_q-arch", "job_qr_q-arch2", "job_qr_q-have", "job_qr_q-new", "job_qr_q-quoted"])
    const job = (id: string) => quoteJobs.find((j) => j.id === id)!
    expect(job("job_qr_q-new")).toEqual({ id: "job_qr_q-new", customer_id: "c", property_id: "pr", kind: "repair", status: "active", price: null, source: "site", sold_on: null, quote_sent_on: null, cancelled_at: null, created_at: "2027-03-01T18:00:00Z" })
    // The request names no property: the customer's newest.
    expect(job("job_qr_q-quoted")).toMatchObject({ property_id: "pr-new", kind: "other", status: "active", sold_on: null, quote_sent_on: "2027-03-06", cancelled_at: null })
    // A customer with no property at all gets one "Address needed" in Erie, shared by their requests.
    expect(job("job_qr_q-arch")).toMatchObject({ customer_id: "c2", property_id: "prop_qr_q-arch", status: "cancelled", sold_on: null, quote_sent_on: null, cancelled_at: "2027-03-07T15:00:00Z" })
    expect(job("job_qr_q-arch2")).toMatchObject({ property_id: "prop_qr_q-arch", status: "active", cancelled_at: null })
    expect(await q(`SELECT id, customer_id, address, town::text AS town FROM property WHERE address = 'Address needed'`)).toEqual([{ id: "prop_qr_q-arch", customer_id: "c2", address: "Address needed", town: "Erie" }])
    expect(job("job_qr_q-have")).toMatchObject({ customer_id: "c4", kind: "other" })
    expect(await q(`SELECT id FROM event WHERE id = 'evt_qr_q-have'`)).toHaveLength(1)
    const qLines = await q<{ job_id: string; visit_id: string | null; name: string; description: string | null; quantity: number; unit_price: number; taxable: boolean; cancelled: boolean; service_id: string | null }>(
      `SELECT job_id, visit_id, name, description, quantity, unit_price, taxable, cancelled_at IS NOT NULL AS cancelled, service_id FROM line_item WHERE id LIKE 'line_job_qr_%' ORDER BY id`,
    )
    expect(qLines).toEqual([
      { job_id: "job_qr_q-arch", visit_id: null, name: "Other", description: "Not sure what we need", quantity: 1, unit_price: 0, taxable: false, cancelled: true, service_id: null },
      { job_id: "job_qr_q-arch2", visit_id: null, name: "Other", description: "Second ask, same address-less customer", quantity: 1, unit_price: 0, taxable: false, cancelled: false, service_id: null },
      { job_id: "job_qr_q-have", visit_id: null, name: "Other", description: "Already a job", quantity: 1, unit_price: 0, taxable: false, cancelled: false, service_id: null },
      { job_id: "job_qr_q-new", visit_id: null, name: "Sprinkler repair", description: "Valve leaks by the gate", quantity: 1, unit_price: 0, taxable: true, cancelled: false, service_id: "s-repair" },
      { job_id: "job_qr_q-quoted", visit_id: null, name: "Lawn aeration", description: "Aerate the back lawn", quantity: 1, unit_price: 0, taxable: false, cancelled: false, service_id: "s-aer" },
    ])
    const requested = await q<{ id: string; about: string; about_id: string; customer_id: string; job_id: string; visit_id: string | null; detail: Record<string, unknown>; who: string; at: string }>(
      `SELECT id, about, about_id, customer_id, job_id, visit_id, detail, who, to_char(at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS at FROM event WHERE kind = 'job.requested' ORDER BY id`,
    )
    expect(requested.map((e) => e.id)).toEqual(["evt_qr_q-arch", "evt_qr_q-arch2", "evt_qr_q-have", "evt_qr_q-new", "evt_qr_q-quoted"])
    expect(requested.find((e) => e.id === "evt_qr_q-new")).toEqual({
      id: "evt_qr_q-new", about: "job", about_id: "job_qr_q-new", customer_id: "c", job_id: "job_qr_q-new", visit_id: null, detail: { source: "site", notes: "Valve leaks by the gate", serviceId: "s-repair", status: "new" }, who: "system", at: "2027-03-01T18:00:00Z",
    })

    // Notes: one event per note with none of the same text under its record. The visit with a matching job-level event, the job whose visit holds the same text, a blank note and a job with no note get none.
    const notes = await q<{ id: string; about: string; about_id: string; job_id: string | null; visit_id: string | null; detail: Record<string, unknown>; who: string; at: string }>(
      `SELECT id, about, about_id, job_id, visit_id, detail, who, to_char(at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS at FROM event WHERE id LIKE 'evt_note2_%' ORDER BY id`,
    )
    expect(notes).toEqual([
      // a booking job's own note (the booking's notes became the job's)
      { id: "evt_note2_job_job_b-orphan", about: "job", about_id: "job_b-orphan", job_id: "job_b-orphan", visit_id: null, detail: { text: "Call first" }, who: "system", at: "2027-02-03T18:00:00Z" },
      { id: "evt_note2_job_job_p", about: "job", about_id: "job_p", job_id: "job_p", visit_id: null, detail: { text: "Pays by check" }, who: "system", at: "2027-03-06T12:00:00Z" },
      { id: "evt_note2_visit_p-blowout", about: "visit", about_id: "p-blowout", job_id: "job_p", visit_id: "p-blowout", detail: { text: "Gate sticks" }, who: "system", at: "2027-03-07T12:00:00Z" },
      // job_chg and its visit hold the same text (visits.create writes both): the visit keeps the one event.
      { id: "evt_note2_visit_v-chg", about: "visit", about_id: "v-chg", job_id: "job_chg", visit_id: "v-chg", detail: { text: "Gate sticks too" }, who: "system", at: "2027-05-03T12:00:00Z" },
    ])

    // The new columns and the unique index are in place.
    expect(await q(`SELECT indexname FROM pg_indexes WHERE indexname IN ('job_legacy_pass_id_unique', 'visit_job_pass_kind_unique', 'visit_pass_kind_unique') ORDER BY 1`)).toEqual([
      { indexname: "job_legacy_pass_id_unique" },
      { indexname: "visit_job_pass_kind_unique" },
      { indexname: "visit_pass_kind_unique" },
    ])

    // The data statements are the ones that update or insert; a second run leaves every table as it was.
    const snapshotOf = async () => ({
      jobs: await q(`SELECT * FROM job ORDER BY id`),
      lines: await q(`SELECT * FROM line_item ORDER BY id`),
      charges: await q(`SELECT * FROM charge ORDER BY id`),
      events: await q(`SELECT * FROM event ORDER BY id`),
      alerts: await q(`SELECT * FROM admin_alert ORDER BY id`),
      messages: await q(`SELECT * FROM message_log ORDER BY id`),
      properties: await q(`SELECT * FROM property ORDER BY id`),
    })
    const first = await snapshotOf()
    const data = statements.filter((x) => /^(update|insert into)\s/i.test(bare(x)))
    expect(data).toHaveLength(14)
    for (const stmt of data) await client.exec(stmt)
    expect(await snapshotOf()).toEqual(first)
    await client.close()
  })

  it("keeps rows the old code writes in the deploy window correct: sold day, old pass id and cancellation come from triggers", async () => {
    const { client } = await before()
    for (const f of files().slice(files().findIndex((x) => x.startsWith("0021_legacy_expand")))) for (const stmt of migration(f)) if (stmt.trim()) await client.exec(stmt)
    const q = async <T>(text: string) => (await client.query<T>(text)).rows
    const today = (await q<{ d: string }>(`SELECT to_char((now() at time zone 'America/Denver')::date, 'YYYY-MM-DD') AS d`))[0]!.d

    // Old code: the pass job with kind and status set, then the season_pass row.
    await client.exec(`INSERT INTO job (id, organization_id, customer_id, property_id, kind, status, source, season, pass_number) VALUES ('job_old', 'o', 'c', 'pr', 'pass', 'active', 'checkout', 2027, 'TH-2027-0001')`)
    await client.exec(`INSERT INTO season_pass (id, organization_id, job_id, number, season, customer_id, property_id, zones, status) VALUES ('old-pass', 'o', 'job_old', 'TH-2027-0001', 2027, 'c', 'pr', 8, 'active')`)
    expect(await q(`SELECT legacy_pass_id, to_char(sold_on, 'YYYY-MM-DD') AS sold_on, cancelled_at IS NULL AS open FROM job WHERE id = 'job_old'`)).toEqual([{ legacy_pass_id: "old-pass", sold_on: today, open: true }])
    await client.exec(`UPDATE season_pass SET cancelled_at = '2027-06-01T12:00:00Z', status = 'cancelled' WHERE id = 'old-pass'`)
    expect(await q(`SELECT to_char(cancelled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS cancelled_at FROM job WHERE id = 'job_old'`)).toEqual([{ cancelled_at: "2027-06-01T12:00:00Z" }])
    // A job that is already cancelled keeps its own day.
    await client.exec(`UPDATE job SET cancelled_at = '2027-05-01T12:00:00Z' WHERE id = 'job_old'`)
    await client.exec(`UPDATE season_pass SET cancelled_at = '2027-07-01T12:00:00Z' WHERE id = 'old-pass'`)
    expect(await q(`SELECT to_char(cancelled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS d FROM job WHERE id = 'job_old'`)).toEqual([{ d: "2027-05-01" }])

    // Old code: a pending pass is activated by moving the job off pending.
    await client.exec(`INSERT INTO job (id, organization_id, customer_id, property_id, kind, status, source, season, pass_number) VALUES ('job_pend', 'o', 'c3', 'pr3', 'pass', 'pending', 'checkout', 2027, 'TH-2027-0002')`)
    expect(await q(`SELECT sold_on FROM job WHERE id = 'job_pend'`)).toEqual([{ sold_on: null }])
    await client.exec(`UPDATE job SET status = 'active' WHERE id = 'job_pend'`)
    expect(await q(`SELECT to_char(sold_on, 'YYYY-MM-DD') AS sold_on FROM job WHERE id = 'job_pend'`)).toEqual([{ sold_on: today }])

    // New code leaves kind empty and sets its own sold day, or none: nothing is filled in.
    await client.exec(`INSERT INTO job (id, organization_id, customer_id, property_id, source) VALUES ('job_new', 'o', 'c', 'pr', 'office')`)
    await client.exec(`INSERT INTO job (id, organization_id, customer_id, property_id, source, sold_on) VALUES ('job_new2', 'o', 'c', 'pr', 'office', '2027-01-02')`)
    expect(await q(`SELECT id, to_char(sold_on, 'YYYY-MM-DD') AS sold_on FROM job WHERE id IN ('job_new', 'job_new2') ORDER BY id`)).toEqual([
      { id: "job_new", sold_on: null },
      { id: "job_new2", sold_on: "2027-01-02" },
    ])
    // A job made from a quote request stays unsold.
    await client.exec(`INSERT INTO job (id, organization_id, customer_id, property_id, kind, status, source) VALUES ('job_qr_x', 'o', 'c', 'pr', 'other', 'active', 'site')`)
    expect(await q(`SELECT sold_on FROM job WHERE id = 'job_qr_x'`)).toEqual([{ sold_on: null }])
    await client.close()
  })

  it("aborts at the guard when two visits of one pass kind share a job, and makes no unique index", async () => {
    const { client, all, at } = await before()
    await client.exec(`INSERT INTO job (id, organization_id, customer_id, property_id, kind, source) VALUES ('j', 'o', 'c', 'pr', 'repair', 'office')`)
    await client.exec(`INSERT INTO visit (id, organization_id, job_id, customer_id, property_id, kind) VALUES ('v1', 'o', 'j', 'c', 'pr', 'blowout'), ('v2', 'o', 'j', 'c', 'pr', 'blowout'), ('v3', 'o', 'j', 'c', 'pr', 'repair'), ('v4', 'o', 'j', 'c', 'pr', 'repair')`)
    const statements = migration(all[at]!).filter((stmt) => stmt.trim())
    const guard = statements.findIndex((x) => /legacy_expand: two visits of one pass kind share a job/.test(x))
    expect(guard).toBeGreaterThan(0)
    // after the guard: the unique index, then the four deploy-window triggers (a function, a drop and a create each)
    expect(guard).toBe(statements.length - 14)
    for (const stmt of statements.slice(0, guard)) await client.exec(stmt)
    await expect(client.exec(statements[guard]!)).rejects.toThrow(/two visits of one pass kind share a job/)
    expect((await client.query(`SELECT 1 FROM pg_indexes WHERE indexname = 'visit_job_pass_kind_unique'`)).rows).toHaveLength(0)
    // The migration is one transaction in production, so the abort leaves nothing behind; here, with the duplicate gone, the same statements finish.
    await client.exec(`DELETE FROM visit WHERE id = 'v2'`)
    for (const stmt of statements.slice(guard)) await client.exec(stmt)
    await expect(client.exec(`INSERT INTO visit (id, organization_id, job_id, customer_id, property_id, kind) VALUES ('v5', 'o', 'j', 'c', 'pr', 'blowout')`)).rejects.toThrow()
    await client.exec(`INSERT INTO visit (id, organization_id, job_id, customer_id, property_id, kind) VALUES ('v6', 'o', 'j', 'c', 'pr', 'repair')`)
    await client.close()
  })
})
