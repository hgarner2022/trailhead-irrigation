// @vitest-environment node
import { PGlite } from "@electric-sql/pglite"
import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const folder = fileURLToPath(new URL("../../drizzle/", import.meta.url))
const migration = (name: string) => readFileSync(folder + name, "utf8").split("--> statement-breakpoint")

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
