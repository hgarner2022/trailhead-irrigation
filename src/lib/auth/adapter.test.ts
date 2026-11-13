// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { testDb, type TestDb } from "@/db/test-db"
import * as s from "@/db/schema"
import { authAdapter } from "./adapter"
import { findPerson } from "./people"
import { mayCompleteSignIn, personPrincipal } from "./session"
import { ADMIN, CUSTOMER, ORG, OWNER, seedAuth } from "./test-seed"

let db: TestDb
let customerId: string
beforeAll(async () => {
  db = await testDb()
  ;({ customerId } = await seedAuth(db))
})
afterAll(() => db.close())

describe("findPerson and the sign-in rule", () => {
  it("finds an owner, an admin and a customer, and refuses a stranger", async () => {
    expect((await findPerson(db, OWNER.toUpperCase()))?.classification).toEqual({ kind: "admin", role: "owner" })
    expect((await findPerson(db, ADMIN))?.classification).toEqual({ kind: "admin", role: "admin" })
    expect((await findPerson(db, CUSTOMER))?.classification).toEqual({ kind: "customer", customerId })
    expect(await findPerson(db, "stranger@example.com")).toBeNull()
    expect(await mayCompleteSignIn(db, "stranger@example.com")).toBe(false)
    expect(await mayCompleteSignIn(db, OWNER)).toBe(true)
  })
  it("builds the principal the JWT carries", async () => {
    expect(await personPrincipal(db, "u1", OWNER)).toEqual({
      kind: "person", id: "u1", email: OWNER, organizationId: ORG, type: "admin", role: "owner",
    })
    expect(await personPrincipal(db, "u2", CUSTOMER)).toMatchObject({ type: "customer", customerId })
  })
})

describe("authAdapter", () => {
  const adapter = authAdapter(() => db)

  it("creates a user with the organization from the allow-list", async () => {
    const user = await adapter.createUser!({ id: "x", email: "Andrea@Example.com", emailVerified: new Date() })
    const [row] = await db.select().from(s.authUser)
    expect(row).toMatchObject({ id: user.id, organizationId: ORG, role: "customer", customerId, email: CUSTOMER })
    expect((await adapter.getUserByEmail!("ANDREA@example.com"))?.id).toBe(user.id)
    expect((await adapter.getUser!(user.id))?.email).toBe(CUSTOMER)
  })

  it("refuses to create a user or a token for a stranger", async () => {
    await expect(adapter.createUser!({ id: "x", email: "stranger@example.com", emailVerified: null })).rejects.toThrow("AccessDenied")
    await expect(
      adapter.createVerificationToken!({ identifier: "stranger@example.com", token: "t", expires: new Date() }),
    ).rejects.toThrow("AccessDenied")
  })

  it("stores a verification token with the organization and lets it be used once", async () => {
    const expires = new Date(Date.now() + 600_000)
    await adapter.createVerificationToken!({ identifier: OWNER, token: "hashed", expires })
    const [row] = await db.select().from(s.authVerificationToken)
    expect(row?.organizationId).toBe(ORG)
    expect(await adapter.useVerificationToken!({ identifier: OWNER, token: "hashed" })).toMatchObject({ identifier: OWNER })
    expect(await adapter.useVerificationToken!({ identifier: OWNER, token: "hashed" })).toBeNull()
  })
})
