// @vitest-environment node
import { describe, expect, it } from "vitest"
import { chargeIdempotencyKey, chargeOffSession } from "./charge"
import { declined, stubStripe } from "./test-stripe"

const input = { customerId: "cus_1", paymentMethodId: "pm_1", amount: 145, visitId: "v1", passId: "p1", attempt: 2, description: "Season Pass" }

describe("chargeOffSession", () => {
  it("charges whole dollars as cents, off session, with a per-attempt idempotency key", async () => {
    const { stripe, calls } = stubStripe()
    expect(await chargeOffSession(stripe, input)).toEqual({ ok: true, paymentIntentId: expect.stringMatching(/^pi_ok_/), receiptUrl: "https://pay.stripe.test/receipt/1" })
    const [params, options] = calls.paymentIntentsCreate.mock.calls[0]!
    expect(params).toMatchObject({ amount: 14500, currency: "usd", off_session: true, confirm: true, customer: "cus_1", payment_method: "pm_1" })
    expect(options.idempotencyKey).toBe(chargeIdempotencyKey("v1", 2))
    expect(options.idempotencyKey).toBe("visit-v1-2")
  })
  it("returns a decline as a failure with the intent id", async () => {
    const { stripe } = stubStripe({ charge: () => { throw declined() } })
    expect(await chargeOffSession(stripe, input)).toEqual({ ok: false, paymentIntentId: expect.stringMatching(/^pi_declined_/), message: "Your card was declined." })
  })
  it("treats a payment that needs the customer as a failure", async () => {
    const { stripe } = stubStripe({ charge: () => ({ id: "pi_auth", status: "requires_action" }) })
    expect(await chargeOffSession(stripe, input)).toMatchObject({ ok: false, paymentIntentId: "pi_auth" })
  })
  it("rethrows anything that is not a decline so the queue retries", async () => {
    const { stripe } = stubStripe({ charge: () => { throw new Error("network down") } })
    await expect(chargeOffSession(stripe, input)).rejects.toThrow("network down")
  })
})
