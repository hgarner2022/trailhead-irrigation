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
    for (const f of all.slice(0, at)) for (const stmt of migration(f)) if (stmt.trim()) await client.exec(stmt)
    const org = data.organizationId
    await seed(drizzle(client, { schema }), data, { organizationId: org, admins: [], passes: true })
    const visits = data.passes.reduce((sum, p) => sum + p.visits.length, 0)
    await client.exec(`UPDATE visit SET status = 'skipped' WHERE id = 'p9-blowout'`)
    await client.exec(`INSERT INTO customer (id, organization_id, first_name) VALUES ('c-x', '${org}', 'B')`)
    await client.exec(`INSERT INTO property (id, organization_id, customer_id, address, town) VALUES ('pr-x', '${org}', 'c-x', '2 Main', 'Erie')`)
    await client.exec(`INSERT INTO job (id, organization_id, customer_id, property_id, kind, price, source) VALUES ('j-repair', '${org}', 'c-x', 'pr-x', 'repair', 145, 'office'), ('j-other', '${org}', 'c-x', 'pr-x', 'other', NULL, 'office')`)
    await client.exec(
      `INSERT INTO visit (id, organization_id, job_id, customer_id, property_id, kind, amount, created_at) VALUES ('v-late', '${org}', 'j-repair', 'c-x', 'pr-x', 'repair', 145, '2027-03-02'), ('v-first', '${org}', 'j-repair', 'c-x', 'pr-x', 'repair', 145, '2027-03-01')`,
    )
    const statements = migration(all[at]!).filter((stmt) => stmt.trim())
    for (const stmt of statements) await client.exec(stmt)

    type Row = { visit_id: string | null; job_id: string; name: string; unit_price: number; amount: number | null; kind: string; service_key: string | null; description: string | null; cancelled: boolean; taxable: boolean; quantity: number }
    const read = async () =>
      (
        await client.query<Row>(
          `SELECT l.visit_id, l.job_id, l.name, l.unit_price, v.amount, l.quantity, l.taxable, s.key AS service_key, l.description, l.cancelled_at IS NOT NULL AS cancelled, COALESCE(v.kind::text, j.kind::text) AS kind
           FROM line_item l JOIN job j ON j.id = l.job_id LEFT JOIN visit v ON v.id = l.visit_id LEFT JOIN service s ON s.id = l.service_id ORDER BY l.id`,
        )
      ).rows
    const lines = await read()
    const passLines = lines.filter((l) => l.job_id.startsWith("job_p"))
    expect(passLines).toHaveLength(visits)
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
    expect(lines.filter((l) => l.job_id === "j-repair")).toEqual([
      { visit_id: "v-first", job_id: "j-repair", name: "Repair", unit_price: 145, amount: 145, quantity: 1, taxable: false, service_key: "repair", description: SERVICES.repair!.description, cancelled: false, kind: "repair" },
    ])
    expect(lines.filter((l) => l.job_id === "j-other")).toEqual([
      { visit_id: null, job_id: "j-other", name: "Other", unit_price: 0, amount: null, quantity: 1, taxable: false, service_key: null, description: null, cancelled: false, kind: "other" },
    ])
    expect(lines).toHaveLength(visits + 2)

    for (const stmt of statements.filter((s) => s.trimStart().startsWith("INSERT"))) await client.exec(stmt)
    expect(await read()).toEqual(lines)
    await client.close()
  })
})
