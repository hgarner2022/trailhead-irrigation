import { describe, expect, it } from "vitest"
import { gateFor } from "./gate"
import type { Principal } from "./types"

const admin: Principal = { kind: "person", id: "u", email: "a@x.com", organizationId: "o", type: "admin", role: "owner" }
const customer: Principal = { kind: "person", id: "u", email: "c@x.com", organizationId: "o", type: "customer", customerId: "c" }
const key: Principal = { kind: "api-key", id: "k", organizationId: "o", scopes: ["read"] }
const toSignIn = (to: string) => ({ action: "redirect", to })

describe("gateFor", () => {
  it("sends a signed-out visitor from /admin to the admin sign-in", () => {
    expect(gateFor("/admin", null)).toEqual(toSignIn("/admin/sign-in"))
    expect(gateFor("/admin/passes", undefined)).toEqual(toSignIn("/admin/sign-in"))
  })
  it("keeps a customer and a key out of /admin", () => {
    expect(gateFor("/admin", customer)).toEqual(toSignIn("/admin/sign-in"))
    expect(gateFor("/admin/passes", key)).toEqual(toSignIn("/admin/sign-in"))
  })
  it("lets an admin into /admin and /account", () => {
    expect(gateFor("/admin/passes", admin)).toEqual({ action: "next" })
    expect(gateFor("/account/pass", admin)).toEqual({ action: "next" })
  })
  it("lets a customer into /account but not a signed-out visitor or a key", () => {
    expect(gateFor("/account/pass", customer)).toEqual({ action: "next" })
    expect(gateFor("/account/pass", null)).toEqual(toSignIn("/account/sign-in"))
    expect(gateFor("/account/pass", key)).toEqual(toSignIn("/account/sign-in"))
  })
  it("always passes the sign-in pages", () => {
    for (const p of ["/admin/sign-in", "/admin/sign-in/sent", "/account/sign-in", "/account/sign-in/sent"]) {
      expect(gateFor(p, null)).toEqual({ action: "next" })
    }
  })
  it("passes everything else, and does not mistake a lookalike prefix", () => {
    expect(gateFor("/pricing", null)).toEqual({ action: "next" })
    expect(gateFor("/administrator", null)).toEqual({ action: "next" })
    expect(gateFor("/api/v1/passes", null)).toEqual({ action: "next" })
  })
})
