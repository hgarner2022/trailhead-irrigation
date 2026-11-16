// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { testDb, type TestDb } from "@/db/test-db"
import * as s from "@/db/schema"
import { findPerson } from "./people"
import { CUSTOMER, ORG, seedAuth } from "./test-seed"

const HANNAH = "hannah@example.com"
const TECH = "tech@example.com"
const GONE = "gone@example.com"

let db: TestDb
let customerId: string
beforeAll(async () => {
  db = await testDb()
  ;({ customerId } = await seedAuth(db))
  // People with no admin_user row: the person table is the one source of who may sign in.
  await db.insert(s.person).values([
    { organizationId: ORG, name: "Hannah Garner", initials: "HG", email: HANNAH, role: "owner" },
    { organizationId: ORG, name: "Sam Tech", initials: "ST", email: TECH, role: "tech" },
    { organizationId: ORG, name: "Gone Owner", initials: "GO", email: GONE, role: "owner", active: false },
    { organizationId: ORG, name: "No Email", initials: "NE", email: null, role: "admin" },
    // The customer's email on a person who has left: the person row no longer counts.
    { organizationId: ORG, name: "Andrea Was Staff", initials: "AW", email: CUSTOMER, role: "admin", active: false },
  ])
})
afterAll(() => db.close())

describe("findPerson reads the person table", () => {
  it("classifies a person with an email by their role, whatever the case typed", async () => {
    expect(await findPerson(db, HANNAH)).toEqual({ organizationId: ORG, classification: { kind: "admin", role: "owner" } })
    expect((await findPerson(db, "Hannah@Example.com"))?.classification).toEqual({ kind: "admin", role: "owner" })
    expect((await findPerson(db, TECH))?.classification).toEqual({ kind: "admin", role: "tech" })
  })
  it("treats an inactive person as a stranger", async () => {
    expect(await findPerson(db, GONE)).toBeNull()
  })
  it("never signs an inactive staff email in as staff: it falls through to the customer on file", async () => {
    expect((await findPerson(db, CUSTOMER))?.classification).toEqual({ kind: "customer", customerId })
  })
  it("never matches a person with no email", async () => {
    expect(await findPerson(db, "")).toBeNull()
    expect(await findPerson(db, "null")).toBeNull()
  })
  it("still finds a customer on file and refuses a stranger", async () => {
    expect((await findPerson(db, CUSTOMER))?.classification).toEqual({ kind: "customer", customerId })
    expect(await findPerson(db, "stranger@example.com")).toBeNull()
  })
})
