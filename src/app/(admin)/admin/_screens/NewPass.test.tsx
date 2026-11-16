import { describe, expect, it } from "vitest"
import { priceLine } from "./NewPass"
import { choiceReady, emptyChoice, newCustomerFrom, EMPTY_PERSON } from "./CustomerPicker"
import type { Client } from "@/lib/admin/types"

const clients: Client[] = [
  { id: "c-dana", firstName: "Dana", lastName: "Reed", town: "Erie", email: "dana@example.com", jobberUrl: "", hasPass: false, app: true },
  { id: "c-joe", firstName: "Joe", lastName: "Hart", town: "Longmont", jobberUrl: "", hasPass: false, app: true },
]

describe("priceLine", () => {
  it("reads the visits on sale at the pass's zones from src/lib/season-pass.ts, with the July inspection when ticked", () => {
    expect(priceLine(8, false, "2026-11-12")).toBe("Spring turn-on $145 · Fall blowout $115 · billed after each visit")
    expect(priceLine(6, false, "2026-11-12")).toBe("Spring turn-on $145 · Fall blowout $95 · billed after each visit")
    expect(priceLine(10, true, "2026-11-12")).toBe("Spring turn-on $165 · July inspection $165 · Fall blowout $135 · billed after each visit")
    expect(priceLine(6, true, "2027-06-15")).toBe("July inspection $145 · Fall blowout $95 · billed after each visit")
  })
})

describe("choiceReady for New pass (email required)", () => {
  it("needs a chosen customer with an email on file or one typed, or a new customer with a name, a street and a well-formed email", () => {
    expect(choiceReady(emptyChoice("c-dana"), clients, true)).toBe(true)
    expect(choiceReady(emptyChoice("c-joe"), clients, true)).toBe(false)
    expect(choiceReady({ ...emptyChoice("c-joe"), email: "joe@example.com" }, clients, true)).toBe(true)
    expect(choiceReady({ ...emptyChoice("c-joe"), email: "joe@" }, clients, true)).toBe(false)
    const person = { ...EMPTY_PERSON, firstName: "Maya", lastName: "Ortiz", address: "12 Elm St" }
    expect(choiceReady({ ...emptyChoice(), isNew: true, person }, clients, true)).toBe(false)
    expect(choiceReady({ ...emptyChoice(), isNew: true, person: { ...person, email: "maya@gmail.com" } }, clients, true)).toBe(true)
    // New visit does not need the email.
    expect(choiceReady({ ...emptyChoice(), isNew: true, person }, clients)).toBe(true)
    expect(choiceReady(emptyChoice("c-joe"), clients)).toBe(true)
  })
  it("builds the API's newCustomer from what was typed, leaving out blank email and phone", () => {
    expect(newCustomerFrom({ ...EMPTY_PERSON, firstName: " Maya ", lastName: "Ortiz", address: "12 Elm St ", town: "Erie" })).toEqual({ firstName: "Maya", lastName: "Ortiz", property: { address: "12 Elm St", town: "Erie" } })
  })
})
