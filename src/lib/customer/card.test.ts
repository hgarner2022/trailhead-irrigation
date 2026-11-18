import { describe, expect, it } from "vitest"
import { customerHasCard } from "./card"

describe("customerHasCard", () => {
  it("needs a payment method Stripe holds: a last four alone is not a card", () => {
    expect(customerHasCard({ stripePaymentMethodId: "pm_1", cardLast4: "4242" })).toBe(true)
    expect(customerHasCard({ stripePaymentMethodId: "pm_1" })).toBe(true)
    expect(customerHasCard({ cardLast4: "4242" })).toBe(false)
    expect(customerHasCard({ stripePaymentMethodId: null, cardLast4: "4242" })).toBe(false)
    expect(customerHasCard({})).toBe(false)
  })
})
