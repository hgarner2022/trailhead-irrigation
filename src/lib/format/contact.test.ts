import { describe, expect, it } from "vitest"
import { cleanEmail, cleanName, cleanText, formatPhone, normalizePhone } from "./contact"

describe("cleanName", () => {
  it("capitalises each part and trims", () => {
    expect(cleanName("  hannah   garner ")).toBe("Hannah Garner")
    expect(cleanName("RYAN")).toBe("Ryan")
    expect(cleanName("mary-kate o'brien")).toBe("Mary-Kate O'Brien")
    expect(cleanName("ronald mcdonald")).toBe("Ronald McDonald")
    expect(cleanName("ludwig van beethoven")).toBe("Ludwig van Beethoven")
  })
  it("keeps a deliberate inner capital", () => {
    expect(cleanName("DeShawn")).toBe("DeShawn")
  })
})

describe("cleanEmail", () => {
  it("lower-cases and trims", () => {
    expect(cleanEmail(" Hannahn.Garner@Gmail.com ")).toBe("hannahn.garner@gmail.com")
  })
})

describe("phones", () => {
  it("stores ten US digits as E.164 whatever the typing", () => {
    for (const typed of ["3038196133", "(303) 819-6133", "303.819.6133", "+1 303 819 6133", "1-303-819-6133"]) expect(normalizePhone(typed)).toBe("+13038196133")
  })
  it("refuses anything that is not ten digits", () => {
    expect(normalizePhone("819-6133")).toBeNull()
    expect(normalizePhone("")).toBeNull()
    expect(normalizePhone(null)).toBeNull()
  })
  it("prints as (303) 819-6133 and leaves odd numbers as typed", () => {
    expect(formatPhone("+13038196133")).toBe("(303) 819-6133")
    expect(formatPhone("3038196133")).toBe("(303) 819-6133")
    expect(formatPhone("+44 20 7946 0958")).toBe("+44 20 7946 0958")
    expect(formatPhone(null)).toBe("")
  })
})

describe("cleanText", () => {
  it("collapses whitespace", () => {
    expect(cleanText("  Gate code\n 4411   dog in yard ")).toBe("Gate code 4411 dog in yard")
  })
})
