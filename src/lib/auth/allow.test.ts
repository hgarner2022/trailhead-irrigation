import { describe, expect, it } from "vitest"
import { classify } from "./allow"

const admins = [{ email: "Ryan@Example.com", role: "owner" as const }]
const customers = [{ email: "andrea@example.com", customerId: "c1" }]

describe("classify", () => {
  it("finds an admin with their role, ignoring case and spaces", () => {
    expect(classify(" ryan@example.com ", admins, customers)).toEqual({ kind: "admin", role: "owner" })
  })
  it("finds a customer", () => {
    expect(classify("ANDREA@example.com", admins, customers)).toEqual({ kind: "customer", customerId: "c1" })
  })
  it("prefers admin when an address is both", () => {
    expect(classify("andrea@example.com", [{ email: "andrea@example.com", role: "admin" }], customers)).toEqual({
      kind: "admin",
      role: "admin",
    })
  })
  it("returns null for a stranger", () => {
    expect(classify("stranger@example.com", admins, customers)).toBeNull()
  })
})
