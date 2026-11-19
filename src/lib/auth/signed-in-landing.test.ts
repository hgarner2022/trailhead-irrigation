import { describe, expect, it } from "vitest"
import { signedInLanding } from "./sign-in-action"

describe("signedInLanding", () => {
  it("sends a signed-in customer to the account page they were after, else Home", () => {
    expect(signedInLanding("/account/visits/v1")).toBe("/account/visits/v1")
    expect(signedInLanding("/account")).toBe("/account")
    expect(signedInLanding(undefined)).toBe("/account")
    expect(signedInLanding(null)).toBe("/account")
  })
  it("drops anything outside /account", () => {
    for (const bad of ["/admin", "https://evil.test", "//evil.test", "/accountant", "/account//evil", "/account\\evil"]) expect(signedInLanding(bad)).toBe("/account")
  })
})
