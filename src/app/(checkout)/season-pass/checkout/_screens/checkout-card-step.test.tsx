import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { FIXTURE_HOME } from "@/lib/places/fixture"
import { CheckoutFlow } from "./CheckoutFlow"
import type { Pass } from "@/lib/admin/types"
import type { BeginResult, FinishCheckout, FinishResult } from "./checkout-submit"
import type { CheckoutFields } from "./checkout-state"

vi.mock("./StripeCard", () => ({
  StripeCard: ({ clientSecret, onComplete }: { clientSecret: string; onComplete: () => void }) => (
    <button type="button" data-secret={clientSecret} onClick={onComplete}>
      Stripe card saved
    </button>
  ),
}))
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}
})
beforeEach(() => sessionStorage.clear())

const answers: Partial<CheckoutFields> = { address: FIXTURE_HOME.label, place: FIXTURE_HOME, town: "Erie", access: "yes", today: "2026-11-12", zones: 8, firstName: "Andrea", email: "andrea@example.com", phone: "(970) 555-0123" }
const pass = { id: "p-1", number: "TH-2027-0042", season: 2027, clientId: "c1", firstName: "Andrea", town: "Erie", zones: 8, turnOnPreference: "recommended", blowoutPreference: "recommended", status: "active", visits: [{ kind: "turn-on", window: "May", amount: 145 }], stripeUrl: "", jobberUrl: "" } as Pass
const begun = (n: number): BeginResult => ({ ok: true, passId: "p-1", sessionId: `cs_${n}`, clientSecret: `secret_${n}` })
const failed = (problem: "unavailable" | "expired", message: string): FinishResult => ({ ok: false, problem, message })

async function openCard(over: { begin?: BeginResult[]; finish?: FinishResult[]; consent?: boolean } = {}) {
  const begins = [...(over.begin ?? [begun(1), begun(2)])]
  const finishes = [...(over.finish ?? [{ ok: true, pass } as FinishResult])]
  const onBegin = vi.fn(async () => begins.shift() ?? begun(9))
  const onFinish = vi.fn<FinishCheckout>(async () => finishes.shift() ?? ({ ok: true, pass } as FinishResult))
  const onConsent = vi.fn(async () => {})
  render(<CheckoutFlow season={2027} initialStep={5} prefill={answers} stripeKey="pk_test_x" onBegin={onBegin} onFinish={onFinish} onConsent={over.consent === false ? undefined : onConsent} />)
  fireEvent.click(screen.getByRole("button", { name: "Continue" }))
  await screen.findByRole("heading", { name: /Save a card for after each visit/ })
  fireEvent.click(screen.getByRole("checkbox", { name: /I accept the Season Pass terms/ }))
  return { onBegin, onFinish, onConsent }
}

describe("the card step", () => {
  it("activates once however many times Stripe says complete", async () => {
    const { onFinish } = await openCard()
    const card = screen.getByRole("button", { name: "Stripe card saved" })
    fireEvent.click(card)
    fireEvent.click(card)
    fireEvent.click(card)
    await screen.findByRole("heading", { name: "Your season is reserved" })
    expect(onFinish).toHaveBeenCalledTimes(1)
  })
  it("shows Back, which returns to the contact step and unlocks the terms", async () => {
    await openCard()
    expect(screen.getByRole("checkbox", { name: /I accept the Season Pass terms/ })).toBeDisabled()
    expect(screen.getByRole("checkbox", { name: "Seasonal tips and offers by email" })).toBeEnabled()
    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(await screen.findByRole("heading", { name: "Who should we reach?" })).toBeInTheDocument()
  })
  it("sends the terms as accepted when the form opened, with the marketing boxes as they are at the end", async () => {
    const { onFinish } = await openCard()
    fireEvent.click(screen.getByRole("checkbox", { name: "Seasonal tips and offers by text" }))
    fireEvent.click(screen.getByRole("button", { name: "Stripe card saved" }))
    await screen.findByRole("heading", { name: "Your season is reserved" })
    expect(onFinish).toHaveBeenCalledWith("p-1", "cs_1", { termsAccepted: true, marketingEmail: false, marketingSms: true }, "Andrea")
  })
  it("records the boxes on the pass when the form opens, and again when a marketing box changes", async () => {
    const { onConsent } = await openCard()
    await waitFor(() => expect(onConsent).toHaveBeenCalledWith("p-1", { termsAccepted: true, marketingEmail: false, marketingSms: false }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Seasonal tips and offers by email" }))
    await waitFor(() => expect(onConsent).toHaveBeenLastCalledWith("p-1", { termsAccepted: true, marketingEmail: true, marketingSms: false }))
  })
  it("offers Try again after a failed activation and runs it on the same card form", async () => {
    const { onFinish, onBegin } = await openCard({ finish: [failed("unavailable", "We couldn't reach the card form just now."), { ok: true, pass }] })
    fireEvent.click(screen.getByRole("button", { name: "Stripe card saved" }))
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }))
    await screen.findByRole("heading", { name: "Your season is reserved" })
    expect(onFinish).toHaveBeenCalledTimes(2)
    expect(onFinish.mock.calls[1]?.[1]).toBe("cs_1")
    expect(onBegin).toHaveBeenCalledTimes(1)
  })
  it("opens a new card form when the old one expired", async () => {
    const { onBegin, onFinish } = await openCard({ finish: [failed("expired", "That card form timed out.")] })
    fireEvent.click(screen.getByRole("button", { name: "Stripe card saved" }))
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }))
    await waitFor(() => expect(screen.getByRole("button", { name: "Stripe card saved" })).toHaveAttribute("data-secret", "secret_2"))
    expect(onBegin).toHaveBeenCalledTimes(2)
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
  it("opens a new card form on Try again when the old one is past 45 minutes", async () => {
    const { onBegin } = await openCard({ finish: [failed("unavailable", "We couldn't reach the card form just now.")] })
    fireEvent.click(screen.getByRole("button", { name: "Stripe card saved" }))
    const button = await screen.findByRole("button", { name: "Try again" })
    const now = Date.now()
    vi.spyOn(Date, "now").mockReturnValue(now + 46 * 60 * 1000)
    fireEvent.click(button)
    await waitFor(() => expect(onBegin).toHaveBeenCalledTimes(2))
    vi.restoreAllMocks()
  })
})

describe("leaving the contact step", () => {
  it("offers Try again when the server could not make the card form", async () => {
    const onBegin = vi.fn<() => Promise<BeginResult>>()
    onBegin.mockResolvedValueOnce({ ok: false, problem: "unavailable", message: "We couldn't reach the card form just now." }).mockResolvedValueOnce(begun(1))
    render(<CheckoutFlow season={2027} initialStep={5} prefill={answers} stripeKey="pk_test_x" onBegin={onBegin} onFinish={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }))
    await screen.findByRole("heading", { name: /Save a card for after each visit/ })
    expect(onBegin).toHaveBeenCalledTimes(2)
  })
})
