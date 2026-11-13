// @vitest-environment node
import { describe, expect, it } from "vitest"
import { emailDomainReachable, failedCheckoutStep } from "./create"

const ok = { property: { address: "5 Pine St", town: "Erie", state: "CO", zip: "80516" }, zones: 8, needsCustomerHome: false, customer: { firstName: "Dana", email: "dana@example.com", phone: "3035550101" }, today: "2026-12-01" }

describe("failedCheckoutStep", () => {
  it("passes complete answers", () => expect(failedCheckoutStep(ok)).toBeNull())
  it("names the first step that fails the reducer's own rule", () => {
    expect(failedCheckoutStep({ ...ok, property: { ...ok.property, town: "Denver", zip: "80202" } })).toBe("address")
    expect(failedCheckoutStep({ ...ok, zones: 4 })).toBe("zones")
    expect(failedCheckoutStep({ ...ok, customer: { ...ok.customer, phone: "555" } })).toBe("contact")
    expect(failedCheckoutStep({ ...ok, customer: { ...ok.customer, email: "nope" } })).toBe("contact")
  })
})

describe("emailDomainReachable", () => {
  const notFound = () => Promise.reject(Object.assign(new Error("x"), { code: "ENOTFOUND" }))
  it("is true with a mail server, false on a definite miss, true on a timeout or other trouble", async () => {
    expect(await emailDomainReachable("a@gmail.com", async () => [{ exchange: "mx", priority: 1 }])).toBe(true)
    expect(await emailDomainReachable("a@nowhere.test", notFound)).toBe(false)
    expect(await emailDomainReachable("a@nowhere.test", async () => [])).toBe(false)
    expect(await emailDomainReachable("a@slow.test", () => new Promise(() => {}), 10)).toBe(true)
    expect(await emailDomainReachable("a@odd.test", () => Promise.reject(Object.assign(new Error("x"), { code: "ESERVFAIL" })))).toBe(true)
    expect(await emailDomainReachable("no-at-sign")).toBe(false)
  })
})
