// @vitest-environment node
import { describe, expect, it } from "vitest"
import { createSetupSession, paymentMethodFromSession } from "./checkout"
import { completeSession, stubStripe } from "./test-stripe"

describe("createSetupSession", () => {
  it("makes an embedded setup session that never redirects, with the pass id and the 30 minute expiry", async () => {
    const { stripe, calls } = stubStripe()
    const out = await createSetupSession(stripe, { passId: "p1", email: "a@example.com", name: "Andrea", expiresAt: 1_800_000_000 })
    expect(out).toEqual({ id: "cs_1", clientSecret: "cs_secret" })
    expect(calls.sessionCreate.mock.calls[0]![0]).toMatchObject({ mode: "setup", ui_mode: "embedded_page", redirect_on_completion: "never", expires_at: 1_800_000_000, customer_email: "a@example.com", metadata: { purpose: "pass-setup", passId: "p1" } })
  })
  it("reuses a known Stripe customer instead of an email", async () => {
    const { stripe, calls } = stubStripe()
    await createSetupSession(stripe, { passId: "p1", customerId: "cus_9", email: "a@example.com", name: "Andrea", expiresAt: 1 })
    const params = calls.sessionCreate.mock.calls[0]![0]
    expect(params).toMatchObject({ customer: "cus_9" })
    expect(params).not.toHaveProperty("customer_email")
  })
})

describe("paymentMethodFromSession", () => {
  it("reads the saved card", async () => {
    const { stripe } = stubStripe({ sessions: { cs_1: completeSession("cs_1", { passId: "p1", purpose: "pass-setup" }, { last4: "9424", expMonth: 3, expYear: 2029 }) } })
    expect(await paymentMethodFromSession(stripe, "cs_1")).toEqual({ customerId: "cus_1", paymentMethodId: "pm_new", brand: "visa", last4: "9424", expires: "2029-03", passId: "p1", purpose: "pass-setup" })
  })
  it("refuses an unfinished session", async () => {
    const { stripe } = stubStripe({ sessions: { cs_2: { ...completeSession("cs_2", {}), status: "open" } } })
    await expect(paymentMethodFromSession(stripe, "cs_2")).rejects.toThrow("not complete")
  })
})
