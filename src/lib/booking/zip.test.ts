import { describe, expect, it } from "vitest"
import { cleanZip, zipCheck, zipOutside } from "./zip"

describe("the zip check", () => {
  it("keeps five digits and drops the rest", () => {
    expect(cleanZip("80516-1234")).toBe("80516")
    expect(cleanZip("8 0 5a")).toBe("805")
  })
  it("reads a town from a zip we serve, and says no to the others", () => {
    expect(zipCheck("")).toEqual({ state: "idle" })
    expect(zipCheck("805")).toEqual({ state: "partial" })
    expect(zipCheck("80516")).toEqual({ state: "ok", town: "Erie", zip: "80516" })
    expect(zipCheck("80302")).toEqual({ state: "outside", zip: "80302" })
    expect(zipOutside("80302")).toContain("We work in Erie, Longmont")
  })
})
