// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, customerPerson, ORG, owner } from "@/api/test-helpers"
import { accountPrincipal } from "./account-principal"

let db: TestDb
let customerId: string
beforeAll(async () => {
  db = await apiDb()
  customerId = (await db.select().from(s.customer).limit(1))[0]!.id
  await db.update(s.customer).set({ email: "Owner@Example.com" }).where(eq(s.customer.id, customerId))
})
afterAll(() => db.close())

describe("accountPrincipal", () => {
  it("gives a customer's own principal back unchanged", async () => {
    const p = customerPerson(customerId, "owner@example.com")
    expect(await accountPrincipal(db, p)).toBe(p)
  })
  it("resolves an admin whose email is also a customer's to that customer, whatever the case", async () => {
    const resolved = await accountPrincipal(db, owner)
    expect(resolved).toMatchObject({ kind: "person", type: "customer", customerId, email: "owner@example.com", organizationId: ORG })
    expect(resolved.role).toBeUndefined()
  })
  it("leaves an admin with no customer record an admin, so the account says it is for customers", async () => {
    const stranger = { ...owner, email: "nobody@example.com" }
    expect(await accountPrincipal(db, stranger)).toBe(stranger)
  })
  it("never crosses organizations", async () => {
    const other = { ...owner, organizationId: "another-org" }
    expect(await accountPrincipal(db, other)).toBe(other)
  })
})
