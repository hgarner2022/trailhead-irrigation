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

describe("migration 0024: bookable dates from the windows", () => {
  it("gives a service with no dates the month and day of its kind's window, touches no service that has one, and a re-run changes nothing", async () => {
    const db = new PGlite()
    const at = files.findIndex((f) => f.startsWith("0024_backfill_bookable_from_windows"))
    expect(at).toBeGreaterThan(0)
    for (const f of files.slice(0, at)) await run(db, f)
    const windows = [
      { kind: "turn-on", opensOn: "2027-05-01", closesOn: "2027-05-31", leadWeeks: 4 },
      { kind: "blowout", opensOn: "2026-10-01", closesOn: "2026-11-15", leadWeeks: 2 },
    ]
    await db.exec(`INSERT INTO organization (id, name, terms_version, settings) VALUES ('o', 'T', '1', '${JSON.stringify({ windows })}')`)
    await db.exec(`INSERT INTO organization (id, name, terms_version, settings) VALUES ('empty', 'E', '1', '{}')`)
    await db.exec(`INSERT INTO service (id, organization_id, key, name, kind, slot_minutes, bookable_from, bookable_to) VALUES
      ('blowout', 'o', 'blowout', 'Fall blowout', 'blowout', 60, NULL, NULL),
      ('turn-on-a', 'o', 'turn-on-a', 'Spring turn-on', 'turn-on', 60, NULL, NULL),
      ('turn-on-b', 'o', 'turn-on-b', 'Spring turn-on 2', 'turn-on', 60, '04-15', NULL),
      ('inspection', 'o', 'inspection', 'Inspection', 'inspection', 90, NULL, NULL),
      ('repair', 'o', 'repair', 'Repair', 'repair', 60, NULL, NULL),
      ('other-org', 'empty', 'blowout', 'Fall blowout', 'blowout', 60, NULL, NULL)`)
    const read = async () => (await db.query<{ id: string; bookable_from: string | null; bookable_to: string | null }>(`SELECT id, bookable_from, bookable_to FROM service ORDER BY id`)).rows
    await run(db, files[at]!)
    const after = await read()
    expect(after).toEqual([
      { id: "blowout", bookable_from: "10-01", bookable_to: "11-15" },
      { id: "inspection", bookable_from: null, bookable_to: null },
      { id: "other-org", bookable_from: null, bookable_to: null },
      { id: "repair", bookable_from: null, bookable_to: null },
      { id: "turn-on-a", bookable_from: "05-01", bookable_to: "05-31" },
      { id: "turn-on-b", bookable_from: "04-15", bookable_to: null },
    ])
    await run(db, files[at]!)
    expect(await read()).toEqual(after)
    await db.close()
  })
})
