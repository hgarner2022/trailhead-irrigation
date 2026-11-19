import { describe, expect, it } from "vitest"
import { maskEmail } from "./mask-email"

describe("maskEmail", () => {
  it("keeps the first letter and the domain", () => {
    expect(maskEmail("andrea@example.com")).toBe("a***@example.com")
    expect(maskEmail("  Ryan.Garner@trailheadirrigation.com ")).toBe("R***@trailheadirrigation.com")
  })
  it("returns what is not an address as typed", () => {
    expect(maskEmail("not an email")).toBe("not an email")
    expect(maskEmail("@example.com")).toBe("@example.com")
    expect(maskEmail("andrea@")).toBe("andrea@")
    expect(maskEmail("")).toBe("")
  })
})
