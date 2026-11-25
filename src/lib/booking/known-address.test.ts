import { describe, expect, it } from "vitest"
import { FIXTURE_KNOWN, accessOf, addressKey, cardToOffer, contactToFill, emailDiffers, fixtureKnown, normalizeStreet, sameEmail } from "./known-address"

// A repeat customer is recognised by the address alone (Hannah, Nov 23 2026): no sign-in, nothing personal shown back.
describe("the address key", () => {
  it("is the normalized street and the ZIP, so spellings of one street are one property", () => {
    expect(normalizeStreet("480 Briggs Street.")).toBe("480 briggs st")
    expect(addressKey({ line1: "480 BRIGGS ST", zip: "80516" })).toBe("480 briggs st|80516")
    expect(addressKey({ line1: "480 briggs street", zip: "80516-1234" })).toBe("480 briggs st|80516")
    expect(addressKey({ line1: "100 N College Ave", zip: "80524" })).toBe("100 n college ave|80524")
  })
  it("matches on a street and ZIP together, never a street alone", () => {
    expect(addressKey({ line1: "480 Briggs St", zip: "" })).toBeNull()
    expect(addressKey({ line1: "480 Briggs St", zip: "8051" })).toBeNull()
    expect(addressKey({ line1: "", zip: "80516" })).toBeNull()
    expect(fixtureKnown({ line1: "480 Briggs Street", zip: "80516" })).toBe(FIXTURE_KNOWN)
    expect(fixtureKnown({ line1: "480 Briggs St", zip: "80501" })).toBeNull()
    expect(fixtureKnown({ line1: "123 Trailhead Way", zip: "80516" })).toBeNull()
    expect(fixtureKnown(null)).toBeNull()
  })
})

describe("what a found address allows", () => {
  it("holds only non-sensitive yard facts to prefill, and nothing personal", () => {
    expect(Object.keys(FIXTURE_KNOWN).sort()).toEqual(["card", "contact", "controller", "email", "key", "mustBeHome", "zones"])
    // never a gate code or an access note
    expect(JSON.stringify(FIXTURE_KNOWN)).not.toMatch(/gate|access note/i)
    expect(FIXTURE_KNOWN.zones).toBe(10)
  })
  it("offers the card on file only to the email on file, in any case", () => {
    expect(cardToOffer(FIXTURE_KNOWN, "andrea.dalton@example.com")).toBe("Visa ending 4242")
    expect(cardToOffer(FIXTURE_KNOWN, " Andrea.Dalton@Example.com ")).toBe("Visa ending 4242")
    expect(cardToOffer(FIXTURE_KNOWN, "andrea@work.example.com")).toBeNull()
    expect(cardToOffer(FIXTURE_KNOWN, "")).toBeNull()
    expect(cardToOffer(null, "andrea.dalton@example.com")).toBeNull()
    expect(cardToOffer({ ...FIXTURE_KNOWN, card: null }, "andrea.dalton@example.com")).toBeNull()
  })
  it("fills the name and phone in only once the typed email is the one on file, and starts access from whether anyone must be home", () => {
    expect(contactToFill(FIXTURE_KNOWN, "ANDREA.dalton@example.com")).toEqual({ firstName: "Andrea", lastName: "Dalton", phone: "(970) 555-0123" })
    expect(contactToFill(FIXTURE_KNOWN, "andrea@work.example.com")).toBeNull()
    expect(contactToFill(FIXTURE_KNOWN, "")).toBeNull()
    expect(contactToFill(null, "andrea.dalton@example.com")).toBeNull()
    expect(accessOf(FIXTURE_KNOWN)).toBe("yes")
    expect(accessOf({ ...FIXTURE_KNOWN, mustBeHome: true })).toBe("no")
  })
  it("notes another email on a found address, and nothing for the same email, a new address or an empty box", () => {
    expect(emailDiffers(FIXTURE_KNOWN, "andrea@work.example.com")).toBe(true)
    expect(emailDiffers(FIXTURE_KNOWN, "andrea.dalton@example.com")).toBe(false)
    expect(emailDiffers(FIXTURE_KNOWN, "")).toBe(false)
    expect(emailDiffers(null, "andrea@work.example.com")).toBe(false)
    expect(sameEmail("", "")).toBe(false)
  })
})
