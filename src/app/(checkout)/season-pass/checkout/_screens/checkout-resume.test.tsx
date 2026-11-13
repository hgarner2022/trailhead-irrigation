import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { FIXTURE_HOME } from "@/lib/places/fixture"
import { CheckoutFlow } from "./CheckoutFlow"
import { STORAGE_KEY, clearCheckout, loadCheckout, saveCheckout } from "./checkout-storage"
import type { BeginResult } from "./checkout-submit"
import type { CheckoutFields } from "./checkout-state"

vi.mock("./StripeCard", () => ({ StripeCard: () => <p>Stripe form</p> }))
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}
})
beforeEach(() => sessionStorage.clear())

const fields: Partial<CheckoutFields> = { address: FIXTURE_HOME.label, place: FIXTURE_HOME, town: "Erie", access: "yes", zones: 8, firstName: "Andrea", email: "andrea@example.com", phone: "(970) 555-0123", termsAccepted: true, marketingEmail: true }
const begun: BeginResult = { ok: true, passId: "p-1", sessionId: "cs_2", clientSecret: "secret_2" }

describe("checkout storage", () => {
  it("keeps the answers and the pass but never the consent boxes", () => {
    saveCheckout({ step: 5, passId: "p-1", fields })
    const saved = loadCheckout()
    expect(saved).toMatchObject({ step: 5, passId: "p-1", fields: { firstName: "Andrea", zones: 8 } })
    expect(saved?.fields).not.toHaveProperty("termsAccepted")
    expect(saved?.fields).not.toHaveProperty("marketingEmail")
  })
  it("clears, and reads nothing from junk or a blocked store", () => {
    saveCheckout({ step: 2, fields })
    clearCheckout()
    expect(loadCheckout()).toBeNull()
    sessionStorage.setItem(STORAGE_KEY, "{nope")
    expect(loadCheckout()).toBeNull()
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step: 7, fields: {} }))
    expect(loadCheckout()).toBeNull()
    const blocked = { getItem: () => { throw new Error("blocked") }, setItem: () => { throw new Error("blocked") }, removeItem: () => { throw new Error("blocked") } }
    expect(loadCheckout(blocked)).toBeNull()
    expect(() => saveCheckout({ step: 1, fields }, blocked)).not.toThrow()
  })
})

describe("CheckoutFlow coming back", () => {
  const wired = (onBegin = vi.fn(async () => begun)) => {
    render(<CheckoutFlow season={2027} today="2026-11-12" stripeKey="pk_test_x" onBegin={onBegin} onFinish={vi.fn()} />)
    return onBegin
  }
  it("opens on the step the customer was on, with their answers", async () => {
    saveCheckout({ step: 5, passId: "p-1", fields })
    wired()
    expect(await screen.findByRole("heading", { name: "Who should we reach?" })).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveValue("andrea@example.com")
  })
  it("saves as the customer answers", async () => {
    saveCheckout({ step: 2, fields })
    wired()
    await screen.findByRole("heading", { name: /How many zones/ })
    fireEvent.click(screen.getByRole("button", { name: "10 zones" }))
    await waitFor(() => expect(loadCheckout()?.fields.zones).toBe(10))
  })
  it("reopens the card step on a fresh card form for the same pass, with the boxes unticked", async () => {
    saveCheckout({ step: 6, passId: "p-1", fields })
    const onBegin = wired()
    await screen.findByRole("heading", { name: /Save a card for after each visit/ })
    expect(onBegin).toHaveBeenCalledWith(expect.objectContaining({ email: "andrea@example.com" }), "p-1")
    expect(screen.getByRole("checkbox", { name: /I accept the Season Pass terms/ })).not.toBeChecked()
  })
  it("restarts at the contact step with a notice when the server no longer has the pass", async () => {
    saveCheckout({ step: 6, passId: "p-old", fields })
    wired()
    expect(await screen.findByText(/timed out/)).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Who should we reach?" })).toBeInTheDocument()
  })
  it("starts clean when nothing was kept", () => {
    wired()
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Where is the yard?")
  })
  it("is off without a Stripe key, so stories never share answers", () => {
    saveCheckout({ step: 3, fields })
    render(<CheckoutFlow season={2027} />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Where is the yard?")
  })
})
