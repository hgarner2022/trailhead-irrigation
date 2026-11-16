// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import type { PublicPrincipal } from "@/lib/auth/types"
import { callApi } from "../../core/call"
import { apiDb, ctxFor, ORG, readKey, writeKey } from "../../test-helpers"
import { customersCreate, customersGet, customersList, customersUpdate } from "../customers/handlers"
import { passesCreate, passesGet } from "./handlers"

// The owner's words, 13 Nov 2026: "I need normal data". The checkout asks a last name, `passes.create` and
// `customers.create/update` store it the way a name prints, and the contact fields keep the API's scope rule.

const { reachable } = vi.hoisted(() => ({ reachable: vi.fn() }))
vi.mock("@/lib/pass/server/create", async (original) => ({ ...(await original<typeof import("@/lib/pass/server/create")>()), emailDomainReachable: reachable }))

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
  reachable.mockResolvedValue(true)
})
afterAll(() => db.close())

const visitor: PublicPrincipal = { kind: "public", id: "checkout", organizationId: ORG, scopes: ["checkout"] }
const NOW = "2026-12-01T17:00:00Z"
const property = { address: "5 Pine St", town: "Erie", state: "CO", zip: "80516" } as const
const make = (customer: Record<string, unknown>, principal: Parameters<typeof ctxFor>[1] = visitor) =>
  callApi(ctxFor(db, principal, NOW), passesCreate, { customer, property, zones: 8 } as never)
const customerOf = async (email: string) => (await db.select().from(s.customer).where(sql`lower(${s.customer.email}) = ${email}`))[0]!

describe("passes.create stores the last name", () => {
  it("cleans it the way a name prints, beside the first name", async () => {
    const pass = await make({ firstName: "  hannah ", lastName: " o'BRIEN-van der berg ", email: "lastname1@example.com", phone: "3035550111" })
    const row = await customerOf("lastname1@example.com")
    expect(row).toMatchObject({ firstName: "Hannah", lastName: "O'Brien-Van der Berg" })
    // The pass and its emails keep the first name; the full name rides on the customer the admin reads.
    expect(pass.firstName).toBe("Hannah")
    expect(pass.customer).toBeUndefined()
    expect(await callApi(ctxFor(db, writeKey, NOW), passesGet, { id: pass.id })).toMatchObject({ firstName: "Hannah", customer: { firstName: "Hannah", lastName: "O'Brien-Van der Berg" } })
  })

  it("is required of the checkout: a visitor without a last name is sent back to the contact step", async () => {
    await expect(make({ firstName: "Nolast", email: "lastname2@example.com", phone: "3035550112" })).rejects.toMatchObject({ code: "invalid", issues: [{ path: "reason", message: "contact" }] })
    await expect(make({ firstName: "Nolast", lastName: "   ", email: "lastname2@example.com", phone: "3035550112" })).rejects.toMatchObject({ code: "invalid" })
    expect(await db.select().from(s.customer).where(sql`lower(${s.customer.email}) = 'lastname2@example.com'`)).toHaveLength(0)
  })

  it("is not required of a key with the write scope, for the pass an admin makes by hand", async () => {
    const pass = await make({ firstName: "Admin", email: "lastname3@example.com" }, writeKey)
    expect(pass.customer?.lastName).toBeNull()
  })

  it("fills in a last name nobody had recorded, and never rewrites one that is there", async () => {
    await make({ firstName: "Sam", email: "lastname4@example.com", phone: "3035550113" }, writeKey)
    expect((await customerOf("lastname4@example.com")).lastName).toBeNull()
    await make({ firstName: "Sam", lastName: "mason", email: "lastname4@example.com", phone: "3035550113" })
    expect((await customerOf("lastname4@example.com")).lastName).toBe("Mason")
    // Anyone can type an email: a second checkout by email alone does not rename the customer.
    await make({ firstName: "Sam", lastName: "Someoneelse", email: "lastname4@example.com", phone: "3035550113" })
    expect((await customerOf("lastname4@example.com")).lastName).toBe("Mason")
  })

  it("lets the checkout that holds the pass id correct the name it typed", async () => {
    const first = await make({ firstName: "Pat", lastName: "Tyop", email: "lastname5@example.com", phone: "3035550114" })
    await callApi(ctxFor(db, { ...visitor, passId: first.id }, NOW), passesCreate, { passId: first.id, customer: { firstName: "Pat", lastName: "Typo-fixed", email: "lastname5@example.com", phone: "3035550114" }, property, zones: 8 } as never)
    expect((await customerOf("lastname5@example.com")).lastName).toBe("Typo-Fixed")
  })

  it("shows the full name to the admin session and keeps the contact details from the visitor", async () => {
    const pass = await make({ firstName: "Quinn", lastName: "Reed", email: "lastname6@example.com", phone: "3035550115" })
    expect(pass.customer).toBeUndefined()
    const seen = await callApi(ctxFor(db, writeKey, NOW), passesGet, { id: pass.id })
    expect(seen.customer).toMatchObject({ firstName: "Quinn", lastName: "Reed", email: "lastname6@example.com" })
    const read = await callApi(ctxFor(db, readKey, NOW), passesGet, { id: pass.id })
    expect(read.customer).toBeUndefined()
    expect(JSON.stringify(read)).not.toContain("lastname6@example.com")
  })
})

describe("customers.create and customers.update store the last name", () => {
  it("cleans it on create and on update, and clears it with an empty string", async () => {
    const made = await callApi(ctxFor(db, writeKey), customersCreate, { firstName: "ana", lastName: "DE la CRUZ", email: "lastname7@example.com" })
    expect(made).toMatchObject({ firstName: "Ana", lastName: "De la Cruz" })
    const changed = await callApi(ctxFor(db, writeKey), customersUpdate, { id: made.id, lastName: "mcdonald" })
    expect(changed.lastName).toBe("McDonald")
    expect(await callApi(ctxFor(db, writeKey), customersUpdate, { id: made.id, lastName: "" })).toMatchObject({ lastName: null })
    expect((await db.select().from(s.customer).where(eq(s.customer.id, made.id)))[0]!.lastName).toBeNull()
  })

  it("lists the street and the contact for the admin session and none of it for a read key; the last name is for both", async () => {
    const made = await callApi(ctxFor(db, writeKey), customersCreate, { firstName: "Lee", lastName: "Hart", email: "lastname8@example.com", phone: "303-555-0116", property: { address: "9 Elm St", town: "Erie" } })
    const admin = (await callApi(ctxFor(db, writeKey), customersList, { limit: 100, q: "Hart" })).data.find((c) => c.id === made.id)!
    expect(admin).toMatchObject({ lastName: "Hart", address: "9 Elm St", email: "lastname8@example.com", town: "Erie" })
    const read = (await callApi(ctxFor(db, readKey), customersList, { limit: 100, q: "Hart" })).data.find((c) => c.id === made.id)!
    expect(read).toMatchObject({ lastName: "Hart", town: "Erie" })
    expect(read).not.toHaveProperty("address")
    expect(read).not.toHaveProperty("email")
    expect(read).not.toHaveProperty("phone")
    expect((await callApi(ctxFor(db, writeKey), customersGet, { id: made.id })).lastName).toBe("Hart")
  })

  it("finds a customer by last name", async () => {
    await callApi(ctxFor(db, writeKey), customersCreate, { firstName: "Rosa", lastName: "Quintanilla", email: "lastname9@example.com" })
    const found = await callApi(ctxFor(db, readKey), customersList, { limit: 100, q: "Quintan" })
    expect(found.data.map((c) => c.lastName)).toEqual(["Quintanilla"])
  })
})
