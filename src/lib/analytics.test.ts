import { afterEach, describe, expect, it, vi } from "vitest"
import { fireEvent, fireSeasonPassPurchase } from "./analytics"

afterEach(() => vi.unstubAllGlobals())

describe("fireEvent", () => {
  it("sends the event to gtag when it is loaded", () => {
    const gtag = vi.fn()
    vi.stubGlobal("gtag", gtag)
    expect(fireEvent("phone_click", { phone_number: "9706927270" })).toBe(true)
    expect(gtag).toHaveBeenCalledWith("event", "phone_click", { phone_number: "9706927270" })
  })
  it("does nothing, and says so, when gtag is not there", () => {
    expect(fireEvent("phone_click")).toBe(false)
  })
})

describe("fireSeasonPassPurchase", () => {
  it("fires season_pass_purchase with the pass number as the transaction and the price as the value", () => {
    const gtag = vi.fn()
    vi.stubGlobal("gtag", gtag)
    fireSeasonPassPurchase({ number: "TH-2027-0007", zones: 8, value: 260, inspection: false })
    expect(gtag).toHaveBeenCalledWith("event", "season_pass_purchase", { transaction_id: "TH-2027-0007", value: 260, currency: "USD", zones: 8, inspection: false })
  })
})
