import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { FIXTURE_HOME } from "@/lib/places/fixture"
import { CheckoutClient, DONE_HREF } from "./CheckoutClient"
import { STORAGE_KEY, saveCheckout } from "./_screens/checkout-storage"

vi.mock("@/lib/analytics", () => ({ fireSeasonPassPurchase: vi.fn() }))
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}
})
afterEach(() => vi.unstubAllGlobals())

describe("CheckoutClient", () => {
  it("clears the tab's saved checkout and sends the customer to the Season Pass page on Done", () => {
    const assign = vi.fn()
    vi.stubGlobal("location", { ...window.location, assign })
    saveCheckout({ step: 3, fields: { zones: 8 } })
    expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull()
    render(<CheckoutClient season={2027} initialStep={7} prefill={{ address: FIXTURE_HOME.label, place: FIXTURE_HOME, town: "Erie", access: "yes", today: "2026-11-12", firstName: "Andrea", email: "andrea@example.com", phone: "(970) 555-0123", cardSaved: true }} />)
    fireEvent.click(screen.getByRole("button", { name: "Done" }))
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(assign).toHaveBeenCalledWith(DONE_HREF)
    expect(DONE_HREF).toBe("/season-pass?done=1")
  })
})
