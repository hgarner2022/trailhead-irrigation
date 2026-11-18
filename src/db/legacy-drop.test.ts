// @vitest-environment node
import { PGlite } from "@electric-sql/pglite"
import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const folder = fileURLToPath(new URL("../../drizzle/", import.meta.url))
const migration = (name: string) =>
  readFileSync(folder + name, "utf8")
    .split("--> statement-breakpoint")
    .filter((stmt) => stmt.trim())
const files = () => readdirSync(folder).filter((f) => f.endsWith(".sql")).sort()
const ORG_SETTINGS = `'{"windows":[],"bufferPercentEarly":0,"bufferPercentLate":0,"fallTownOrder":[],"springTownOrder":[],"messages":[]}'`

const LEGACY_TABLES = ["admin_user", "booking", "pass_change", "quote_request", "season_pass", "truck"]
const LEGACY_COLUMNS = [
  "admin_alert.pass_id", "charge.pass_id", "job.kind", "job.status", "job.price", "job.notes", "jobber_visit.truck_id", "person.legacy_truck_id",
  "visit.pass_id", "visit.booking_id", "visit.amount", "visit.truck_id", "visit.notes", "visit.charged_at", "visit.stripe_payment_intent_id",
]
const LEGACY_TRIGGERS = ["legacy_job_sold_on_insert", "legacy_job_sold_on_update", "legacy_season_pass_job_insert", "legacy_season_pass_job_update"]
const LEGACY_TYPES = ["admin_role", "job_kind", "job_status", "pass_status"]

/** Migration 0022's statements, a database built through 0021 first. */
async function through0021() {
  const client = new PGlite()
  const all = files()
  const at = all.findIndex((f) => f.startsWith("0022_legacy_drop"))
  expect(at).toBeGreaterThan(0)
  for (const f of all.slice(0, at)) for (const stmt of migration(f)) await client.exec(stmt)
  return { client, drop: migration(all[at]!) }
}

/** The way drizzle's migrator runs a migration: every statement in one transaction, rolled back whole when one throws. */
async function applyInOneTransaction(client: PGlite, statements: string[]) {
  await client.exec("BEGIN")
  try {
    for (const stmt of statements) await client.exec(stmt)
    await client.exec("COMMIT")
  } catch (error) {
    await client.exec("ROLLBACK")
    throw error
  }
}

/** Realistic legacy data, every guard satisfied. */
async function cleanData(client: PGlite) {
  const x = (sql: string) => client.exec(sql)
  await x(`INSERT INTO organization (id, name, terms_version, settings) VALUES ('o', 'Trailhead', '1', ${ORG_SETTINGS})`)
  await x(`INSERT INTO customer (id, organization_id, first_name) VALUES ('c', 'o', 'Andrea'), ('c2', 'o', 'Bo'), ('c3', 'o', 'Cy')`)
  await x(`INSERT INTO property (id, organization_id, customer_id, address, town) VALUES ('pr', 'o', 'c', '1 Main', 'Erie'), ('pr2', 'o', 'c2', '2 Main', 'Erie'), ('pr3', 'o', 'c3', '3 Main', 'Erie')`)
  // Guard 4: an admin user in mixed case with its person (migration 0010 and 0011 made them).
  await x(`INSERT INTO admin_user (id, organization_id, email, name, initials) VALUES ('admin1', 'o', 'Ryan@Example.com', 'Ryan Garner', 'RG')`)
  await x(`INSERT INTO person (id, organization_id, name, initials, email, role, truck, legacy_truck_id) VALUES ('person_admin1', 'o', 'Ryan Garner', 'RG', 'ryan@example.com', 'owner', 'Truck 1', 'truck-1')`)
  await x(`INSERT INTO truck (id, organization_id, name, working_days, capacity_by_kind) VALUES ('truck-1', 'o', 'Truck 1', '[]', '{}')`)
  // A pass job with its season_pass row (the 0021 trigger sets legacy_pass_id), a charged visit with its payment and line, a priced visit with its line, notes with their events.
  await x(
    `INSERT INTO job (id, organization_id, customer_id, property_id, kind, status, source, season, pass_number, notes) VALUES
      ('job_p', 'o', 'c', 'pr', 'pass', 'active', 'checkout', 2027, 'TH-2027-0001', 'Pays by check '),
      ('job_rep', 'o', 'c2', 'pr2', 'repair', 'active', 'office', NULL, NULL, NULL),
      ('job_empty', 'o', 'c3', 'pr3', 'other', 'active', 'office', NULL, NULL, '   ')`,
  )
  await x(`INSERT INTO season_pass (id, organization_id, job_id, number, season, customer_id, property_id, zones, status) VALUES ('p', 'o', 'job_p', 'TH-2027-0001', 2027, 'c', 'pr', 8, 'active')`)
  await x(
    `INSERT INTO visit (id, organization_id, job_id, pass_id, customer_id, property_id, kind, amount, status, notes, charged_at, stripe_payment_intent_id) VALUES
      ('p-turn-on', 'o', 'job_p', 'p', 'c', 'pr', 'turn-on', 145, 'completed', NULL, '2027-04-02T05:30:00Z', 'pi_paid'),
      ('p-blowout', 'o', 'job_p', 'p', 'c', 'pr', 'blowout', 115, 'unscheduled', ' Gate sticks ', NULL, NULL),
      ('p-insp', 'o', 'job_p', 'p', 'c', 'pr', 'inspection', 0, 'unscheduled', '   ', NULL, NULL),
      ('v-rep', 'o', 'job_rep', NULL, 'c2', 'pr2', 'repair', 145, 'completed', NULL, '2027-05-03T05:30:00Z', 'pi_rep')`,
  )
  await x(
    `INSERT INTO line_item (id, organization_id, job_id, visit_id, name, unit_price, cancelled_at) VALUES
      ('line_p-turn-on', 'o', 'job_p', 'p-turn-on', 'Spring turn-on', 145, NULL),
      ('line_p-blowout', 'o', 'job_p', 'p-blowout', 'Fall blowout', 115, NULL),
      ('line_v-rep', 'o', 'job_rep', 'v-rep', 'Repair', 145, NULL)`,
  )
  await x(
    `INSERT INTO charge (id, organization_id, job_id, customer_id, visit_id, attempt, amount, status, stripe_payment_intent_id, method, paid_on) VALUES
      ('ch-paid', 'o', 'job_p', 'c', 'p-turn-on', 1, 145, 'succeeded', 'pi_paid', 'card_on_file', '2027-04-01'),
      ('ch-refund', 'o', 'job_p', 'c', 'p-turn-on', 2, -20, 'succeeded', NULL, 'card_on_file', '2027-04-02'),
      ('ch-rep', 'o', 'job_rep', 'c2', 'v-rep', 1, 145, 'succeeded', 'pi_rep', 'card_on_file', '2027-05-03')`,
  )
  // Guard 3: a booking with its job and a quote request with its job.
  await x(`INSERT INTO booking (id, organization_id, customer_id, property_id, source, status) VALUES ('b1', 'o', 'c2', 'pr2', 'admin', 'booked')`)
  await x(`INSERT INTO job (id, organization_id, customer_id, property_id, kind, status, source) VALUES ('job_b1', 'o', 'c2', 'pr2', 'repair', 'active', 'office')`)
  await x(`UPDATE visit SET truck_id = 'truck-1', booking_id = 'b1' WHERE id = 'v-rep'`)
  await x(`INSERT INTO quote_request (id, organization_id, customer_id, property_id, notes, status) VALUES ('q1', 'o', 'c3', 'pr3', 'Valve leaks', 'new')`)
  await x(`INSERT INTO job (id, organization_id, customer_id, property_id, kind, status, source) VALUES ('job_qr_q1', 'o', 'c3', 'pr3', 'other', 'active', 'site')`)
  // Guards 5 and 6: events. evt_pc_pc1 is the copy migration 0020 made; pc2 is a row written since step 5, whose event recordChange wrote 3 seconds away.
  await x(
    `INSERT INTO pass_change (id, organization_id, customer_id, pass_id, visit_id, kind, by_principal, at) VALUES
      ('pc1', 'o', 'c', 'p', NULL, 'sold', 'ryan@example.com', '2027-03-01T15:00:00Z'),
      ('pc2', 'o', 'c', 'p', 'p-blowout', 'visit-edited', 'ryan@example.com', '2027-03-02T15:00:00Z')`,
  )
  await x(
    `INSERT INTO event (id, organization_id, about, about_id, customer_id, job_id, visit_id, kind, detail, who, at) VALUES
      ('evt_pc_pc1', 'o', 'job', 'job_p', 'c', 'job_p', NULL, 'job.sold', '{}', 'ryan@example.com', '2027-03-01T15:00:00Z'),
      ('evt_new_1', 'o', 'visit', 'p-blowout', 'c', 'job_p', 'p-blowout', 'visit.edited', '{}', 'ryan@example.com', '2027-03-02T15:00:03Z'),
      ('evt_note_visit_p-blowout', 'o', 'visit', 'p-blowout', 'c', 'job_p', 'p-blowout', 'note', '{"text":"Gate sticks"}', 'system', '2027-03-03T12:00:00Z'),
      ('evt_note_job_job_p', 'o', 'job', 'job_p', 'c', 'job_p', NULL, 'note', '{"text":"Pays by check"}', 'system', '2027-03-04T12:00:00Z')`,
  )
}

async function state(client: PGlite) {
  const q = async (text: string) => (await client.query<{ name: string }>(text)).rows.map((r) => r.name).sort()
  return {
    tables: await q(`SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public'`),
    columns: await q(`SELECT table_name || '.' || column_name AS name FROM information_schema.columns WHERE table_schema = 'public'`),
    triggers: await q(`SELECT tgname AS name FROM pg_trigger WHERE NOT tgisinternal`),
    functions: await q(`SELECT proname AS name FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'`),
    types: await q(`SELECT typname AS name FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e'`),
    indexes: await q(`SELECT indexname AS name FROM pg_indexes WHERE schemaname = 'public'`),
  }
}

const rowsOf = async (client: PGlite) => ({
  job: (await client.query(`SELECT id, organization_id, customer_id, property_id, season, pass_number, legacy_pass_id, sold_on FROM job ORDER BY id`)).rows,
  visit: (await client.query(`SELECT id, job_id, customer_id, kind, status, scheduled_on FROM visit ORDER BY id`)).rows,
  charge: (await client.query(`SELECT id, job_id, visit_id, amount, status, method FROM charge ORDER BY id`)).rows,
  line: (await client.query(`SELECT id, job_id, visit_id, name, unit_price FROM line_item ORDER BY id`)).rows,
  event: (await client.query(`SELECT id, kind, job_id, visit_id, detail FROM event ORDER BY id`)).rows,
})

describe("migration 0022: the drops", () => {
  it("drops the triggers first and then every legacy table, column, foreign key, index and enum, and nothing else", async () => {
    const { client, drop } = await through0021()
    await cleanData(client)
    const before = await state(client)
    const rows = await rowsOf(client)
    // The things the migration is about are really there before it runs, and so are the ones that stay.
    for (const t of LEGACY_TABLES) expect(before.tables).toContain(t)
    for (const c of LEGACY_COLUMNS) expect(before.columns).toContain(c)
    expect(before.triggers).toEqual(expect.arrayContaining(LEGACY_TRIGGERS))
    expect(before.types).toEqual(expect.arrayContaining(LEGACY_TYPES))
    expect(before.indexes).toContain("visit_pass_kind_unique")
    const KEPT = ["area", "jobber_client", "jobber_job", "jobber_quote", "jobber_invoice", "jobber_visit", "invoice", "charge", "event", "line_item", "message_log", "job", "visit", "person", "property", "queue_item"]
    for (const t of KEPT) expect(before.tables).toContain(t)

    await applyInOneTransaction(client, drop)

    const after = await state(client)
    expect(after.tables).toEqual(before.tables.filter((t) => !LEGACY_TABLES.includes(t)))
    expect(after.columns.filter((c) => LEGACY_COLUMNS.includes(c) || LEGACY_TABLES.some((t) => c.startsWith(t + ".")))).toEqual([])
    // Exactly the dropped columns left the kept tables, and nothing else did.
    const droppedFromKept = before.columns.filter((c) => !after.columns.includes(c) && !LEGACY_TABLES.some((t) => c.startsWith(t + ".")))
    expect(droppedFromKept).toEqual([...LEGACY_COLUMNS].sort())
    for (const t of KEPT) expect(after.tables).toContain(t)
    for (const c of ["person.truck", "property.notes", "job.legacy_pass_id", "job.sold_on", "job.season", "job.quote_sent_on", "job.quote_accepted_on", "visit.person_id", "visit.job_id", "visit.kind", "visit.status", "admin_alert.job_id", "charge.job_id", "charge.refunds_payment_id"]) {
      expect(after.columns).toContain(c)
    }
    // The four deploy-window triggers and their functions are gone, the enum types too.
    expect(after.triggers.filter((t) => LEGACY_TRIGGERS.includes(t))).toEqual([])
    expect(after.triggers).toContain("consent_no_update")
    expect(after.functions.filter((f) => LEGACY_TRIGGERS.includes(f))).toEqual([])
    expect(after.types.filter((t) => LEGACY_TYPES.includes(t))).toEqual([])
    expect(after.types).toContain("visit_kind")
    // The indexes that went are the old pass-kind one and the dying tables' own; the new ones stay.
    expect(after.indexes).not.toContain("visit_pass_kind_unique")
    expect(after.indexes).toEqual(expect.arrayContaining(["visit_job_pass_kind_unique", "job_legacy_pass_id_unique"]))

    // job, visit, charge, line_item and event rows are untouched.
    expect(await rowsOf(client)).toEqual(rows)
    expect(rows.job).toHaveLength(5)
    expect(rows.visit).toHaveLength(4)
    expect(rows.charge).toHaveLength(3)
    expect(rows.line).toHaveLength(3)
    expect(rows.event).toHaveLength(4)
    expect(rows.job.find((j) => (j as { id: string }).id === "job_p")).toMatchObject({ legacy_pass_id: "p", season: 2027, pass_number: "TH-2027-0001" })
    // The kept uniqueness still holds and a job can be made without the dropped columns.
    await expect(client.exec(`INSERT INTO visit (id, organization_id, job_id, customer_id, property_id, kind) VALUES ('dup', 'o', 'job_p', 'c', 'pr', 'blowout')`)).rejects.toThrow()
    await client.exec(`INSERT INTO job (id, organization_id, customer_id, property_id, source) VALUES ('job_new', 'o', 'c', 'pr', 'office')`)
    await client.close()
  })

  it("passes on a database with no legacy rows at all", async () => {
    const { client, drop } = await through0021()
    await client.exec(`INSERT INTO organization (id, name, terms_version, settings) VALUES ('o', 'Trailhead', '1', ${ORG_SETTINGS})`)
    await applyInOneTransaction(client, drop)
    expect((await state(client)).tables).not.toContain("season_pass")
    await client.close()
  })

  // One test per guard: clean data, one thing broken, the migration throws with the guard's words and rolls back whole.
  const guards: { name: string; break: string; message: RegExp }[] = [
    { name: "guard 1: a season_pass row whose job does not remember its id", break: `UPDATE job SET legacy_pass_id = NULL WHERE id = 'job_p'`, message: /legacy_drop guard 1: 1 season_pass row\(s\) have no job whose legacy_pass_id equals their id/ },
    { name: "guard 2: a charged visit with no succeeded payment on its job", break: `DELETE FROM charge WHERE id = 'ch-rep'`, message: /legacy_drop guard 2: 1 charged visit\(s\) have no succeeded payment on their job/ },
    {
      name: "guard 2: a charged visit whose only payment is a refund",
      break: `UPDATE charge SET amount = -145 WHERE id = 'ch-rep'`,
      message: /legacy_drop guard 2: 1 charged visit\(s\) have no succeeded payment on their job/,
    },
    {
      name: "guard 2: a priced visit with no line item",
      break: `INSERT INTO visit (id, organization_id, job_id, customer_id, property_id, kind, amount) VALUES ('v-noline', 'o', 'job_rep', 'c2', 'pr2', 'repair', 50)`,
      message: /legacy_drop guard 2: 1 priced visit\(s\) have no line item/,
    },
    { name: "guard 3: a booking with no job", break: `UPDATE job SET id = 'job_gone' WHERE id = 'job_b1'`, message: /legacy_drop guard 3: 1 booking\(s\) have no job with id job_<booking id>/ },
    { name: "guard 3: a quote request with no job", break: `UPDATE job SET id = 'job_gone' WHERE id = 'job_qr_q1'`, message: /legacy_drop guard 3: 1 quote request\(s\) have no job with id job_qr_<request id>/ },
    { name: "guard 4: an admin user with no person", break: `UPDATE person SET email = 'someone-else@example.com' WHERE id = 'person_admin1'`, message: /legacy_drop guard 4: 1 admin user\(s\) have no person with their email in their organization/ },
    {
      name: "guard 4: an admin user whose person is in another organization",
      break: `INSERT INTO organization (id, name, terms_version, settings) VALUES ('o2', 'Two', '1', ${ORG_SETTINGS}); UPDATE person SET organization_id = 'o2' WHERE id = 'person_admin1'`,
      message: /legacy_drop guard 4: 1 admin user\(s\)/,
    },
    {
      name: "guard 5: a pass_change row with no event, the nearest one a minute away",
      break: `INSERT INTO pass_change (id, organization_id, customer_id, pass_id, kind, by_principal, at) VALUES ('pc-lost', 'o', 'c', 'p', 'cancelled', 'ryan@example.com', '2027-03-02T15:01:03Z')`,
      message: /legacy_drop guard 5: 1 pass_change row\(s\) have no matching event/,
    },
    { name: "guard 5: counts every unmatched pass_change row", break: `DELETE FROM event WHERE id IN ('evt_pc_pc1', 'evt_new_1')`, message: /legacy_drop guard 5: 2 pass_change row\(s\) have no matching event/ },
    { name: "guard 6: a visit note with no note event", break: `UPDATE visit SET notes = 'Call first' WHERE id = 'p-turn-on'`, message: /legacy_drop guard 6: 1 visit note\(s\) have no note event with their text/ },
    { name: "guard 6: a visit note whose event says something else", break: `UPDATE event SET detail = '{"text":"Gate is fine"}' WHERE id = 'evt_note_visit_p-blowout'`, message: /legacy_drop guard 6: 1 visit note\(s\)/ },
    { name: "guard 6: a job note with no note event", break: `UPDATE job SET notes = 'Dog in the yard' WHERE id = 'job_rep'`, message: /legacy_drop guard 6: 1 job note\(s\) have no note event with their text/ },
  ]
  for (const guard of guards) {
    it(`aborts and rolls back whole: ${guard.name}`, async () => {
      const { client, drop } = await through0021()
      await cleanData(client)
      await client.exec(guard.break)
      const before = await state(client)
      const rows = await rowsOf(client)
      await expect(applyInOneTransaction(client, drop)).rejects.toThrow(guard.message)
      // Nothing was dropped: every legacy table, column, trigger, function and type is still there, and so is every other thing.
      const after = await state(client)
      expect(after).toEqual(before)
      for (const t of LEGACY_TABLES) expect(after.tables).toContain(t)
      for (const c of LEGACY_COLUMNS) expect(after.columns).toContain(c)
      expect(after.triggers).toEqual(expect.arrayContaining(LEGACY_TRIGGERS))
      expect(after.functions).toEqual(expect.arrayContaining(LEGACY_TRIGGERS))
      expect(after.types).toEqual(expect.arrayContaining(LEGACY_TYPES))
      expect(await rowsOf(client)).toEqual(rows)
      await client.close()
    })
  }

  it("reports, and never raises, for a job with no season, no line and no visit that is not a quote job", async () => {
    const { client, drop } = await through0021()
    await cleanData(client)
    // job_empty in the clean data is exactly that job; the migration still completes.
    await applyInOneTransaction(client, drop)
    expect((await client.query(`SELECT 1 FROM job WHERE id = 'job_empty'`)).rows).toHaveLength(1)
    await client.close()
  })
})
