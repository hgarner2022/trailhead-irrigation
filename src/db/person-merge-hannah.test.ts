// @vitest-environment node
import { PGlite } from "@electric-sql/pglite"
import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const folder = fileURLToPath(new URL("../../drizzle/", import.meta.url))
const files = readdirSync(folder).filter((f) => f.endsWith(".sql")).sort()
const run = async (db: PGlite, name: string) => {
  for (const stmt of readFileSync(folder + name, "utf8").split("--> statement-breakpoint")) if (stmt.trim()) await db.exec(stmt)
}
const at = files.findIndex((f) => f.startsWith("0025_person_merge_hannah"))

const setup = async (rows: string) => {
  const db = new PGlite()
  for (const f of files.slice(0, at)) await run(db, f)
  await db.exec(`INSERT INTO organization (id, name, terms_version, settings) VALUES ('o', 'T', '1', '{}')`)
  await db.exec(`INSERT INTO person (id, organization_id, name, initials, email, role, truck, active) VALUES ${rows}`)
  return db
}
const people = async (db: PGlite) => (await db.query<{ id: string; email: string | null; role: string; truck: string | null; active: boolean }>(`SELECT id, email, role, truck, active FROM person ORDER BY id`)).rows
const log = async (db: PGlite) => (await db.query<{ field: string; from_value: string; to_value: string; by_email: string }>(`SELECT field, from_value, to_value, by_email FROM settings_change ORDER BY field`)).rows

describe("migration 0025: Hannah's login row merges into her Schedule row", () => {
  it("moves the email and the higher role, deactivates the login row, logs it, and a re-run changes nothing", async () => {
    expect(at).toBeGreaterThan(0)
    const db = await setup(`('keep', 'o', 'Hannah Garner', 'HG', NULL, 'tech', 'Truck 2', true), ('drop', 'o', 'Hannahn.garner', 'H', 'Hannahn.Garner@gmail.com', 'admin', NULL, true), ('ryan', 'o', 'Ryan Garner', 'RG', 'ryan@example.com', 'owner', 'Truck 1', true)`)
    await run(db, files[at]!)
    const after = await people(db)
    expect(after).toEqual([
      { id: "drop", email: null, role: "admin", truck: null, active: false },
      { id: "keep", email: "hannahn.garner@gmail.com", role: "admin", truck: "Truck 2", active: true },
      { id: "ryan", email: "ryan@example.com", role: "owner", truck: "Truck 1", active: true },
    ])
    expect(await log(db)).toEqual([
      { field: "Hannah Garner email", from_value: "(none)", to_value: "hannahn.garner@gmail.com", by_email: "migration" },
      { field: "Hannah Garner role", from_value: "tech", to_value: "admin", by_email: "migration" },
      { field: "Hannahn.garner deactivated", from_value: "active", to_value: "merged into Hannah Garner", by_email: "migration" },
    ])
    await run(db, files[at]!)
    expect(await people(db)).toEqual(after)
    expect((await log(db)).length).toBe(3)
    await db.close()
  })

  it("leaves a database with only one of the rows untouched", async () => {
    for (const rows of [`('keep', 'o', 'Hannah Garner', 'HG', NULL, 'tech', 'Truck 2', true)`, `('drop', 'o', 'Hannahn.garner', 'H', 'hannahn.garner@gmail.com', 'admin', NULL, true)`]) {
      const db = await setup(rows)
      const before = await people(db)
      await run(db, files[at]!)
      expect(await people(db)).toEqual(before)
      expect(await log(db)).toEqual([])
      await db.close()
    }
  })
})
