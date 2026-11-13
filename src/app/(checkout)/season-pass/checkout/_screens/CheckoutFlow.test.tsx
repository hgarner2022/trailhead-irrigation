import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { BlowoutWeek } from "@/lib/admin/types"
import { CheckoutFlow } from "./CheckoutFlow"
import type { CheckoutFields } from "./checkout-state"

// jsdom has none of these; the Radix select reads them.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}
})

const weeks = snapshot.blowoutWeeks as BlowoutWeek[]
const oneFull = weeks.map((w, i) => (i === 1 ? { ...w, taken: w.capacity } : w))
const answers: Partial<CheckoutFields> = {
  address: "123 Trailhead Way",
  town: "Erie",
  zones: 8,
  weekStart: "2027-10-18",
  firstName: "Andrea",
  email: "andrea@example.com",
  phone: "(970) 555-0123",
}

const continueButton = () => screen.getByRole("button", { name: "Continue" })
const progress = () => document.querySelector('[role="progressbar"]') as HTMLElement
const live = () => document.querySelector('[aria-live="polite"]') as HTMLElement
const section = () => document.querySelector("section") as HTMLElement

/** Stubs matchMedia so the reduced-motion query answers `reduce`. */
function stubMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({ matches: reduce && query.includes("reduce"), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
}

describe("CheckoutFlow", () => {
  it("opens on the address question with Continue disabled", () => {
    render(<CheckoutFlow weeks={weeks} season={2027} />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Where is the yard?")
    expect(continueButton()).toBeDisabled()
    expect(screen.getByRole("progressbar", { name: "Checkout progress" })).toHaveAttribute("aria-valuenow", "1")
    expect(live()).toHaveTextContent("Step 1 of 6, Where is the yard?")
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument()
    expect(screen.getByLabelText("Street address")).toHaveFocus()
  })

  it("enables Continue once the address and the town are set", async () => {
    const user = userEvent.setup()
    render(<CheckoutFlow weeks={weeks} season={2027} />)
    await user.type(screen.getByLabelText("Street address"), "123 Trailhead Way")
    expect(continueButton()).toBeDisabled()
    await user.click(screen.getByRole("combobox", { name: "Town" }))
    await user.click(await screen.findByRole("option", { name: "Longmont" }))
    expect(continueButton()).toBeEnabled()
    await user.click(continueButton())
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("How many zones does your system have?")
  })

  it("advances on Enter when the step is valid and goes back on Back", () => {
    render(<CheckoutFlow weeks={weeks} season={2027} prefill={answers} />)
    fireEvent.keyDown(screen.getByLabelText("Street address"), { key: "Enter" })
    expect(progress()).toHaveAttribute("aria-valuenow", "2")
    expect(live()).toHaveTextContent("Step 2 of 6, How many zones does your system have?")
    expect(screen.getByText("2 of 6")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "8 zones", pressed: true })).toHaveFocus()
    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(progress()).toHaveAttribute("aria-valuenow", "1")
    expect(live()).toHaveTextContent("Step 1 of 6")
  })

  it("moves with the arrow keys and ignores Enter on an empty step", () => {
    render(<CheckoutFlow weeks={weeks} season={2027} />)
    fireEvent.keyDown(screen.getByLabelText("Street address"), { key: "Enter" })
    expect(progress()).toHaveAttribute("aria-valuenow", "1")
    fireEvent.keyDown(section(), { key: "ArrowUp" })
    expect(progress()).toHaveAttribute("aria-valuenow", "1")
    render(<CheckoutFlow weeks={weeks} season={2027} prefill={answers} initialStep={2} />)
    const zones = screen.getByRole("button", { name: "8 zones", pressed: true })
    fireEvent.keyDown(zones, { key: "ArrowDown" })
    expect(screen.getAllByRole("progressbar")[1]).toHaveAttribute("aria-valuenow", "3")
    fireEvent.keyDown(screen.getAllByRole("heading", { level: 1 })[1], { key: "ArrowUp" })
    expect(screen.getAllByRole("progressbar")[1]).toHaveAttribute("aria-valuenow", "2")
  })

  it("leaves the arrow keys to a text input and Enter to the town select and an unpressed pill", () => {
    render(<CheckoutFlow weeks={weeks} season={2027} prefill={answers} />)
    const address = screen.getByLabelText("Street address")
    fireEvent.keyDown(address, { key: "ArrowDown" })
    expect(progress()).toHaveAttribute("aria-valuenow", "1")
    const town = screen.getByRole("combobox", { name: "Town" })
    fireEvent.keyDown(town, { key: "Enter" })
    expect(progress()).toHaveAttribute("aria-valuenow", "1")
    fireEvent.keyDown(town, { key: "Escape" })
    fireEvent.keyDown(address, { key: "Enter", isComposing: true })
    expect(progress()).toHaveAttribute("aria-valuenow", "1")
    fireEvent.keyDown(address, { key: "Enter" })
    expect(progress()).toHaveAttribute("aria-valuenow", "2")
    fireEvent.keyDown(screen.getByRole("button", { name: "12 zones", pressed: false }), { key: "Enter" })
    expect(progress()).toHaveAttribute("aria-valuenow", "2")
    fireEvent.keyDown(screen.getByRole("button", { name: "8 zones", pressed: true }), { key: "Enter" })
    expect(progress()).toHaveAttribute("aria-valuenow", "3")
  })

  it("shows the live price for the chosen zones", () => {
    render(<CheckoutFlow weeks={weeks} season={2027} prefill={answers} initialStep={2} />)
    expect(screen.getByText("$405")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "12 zones" }))
    expect(screen.getByText("$525")).toBeInTheDocument()
    expect(screen.getByText("Turn-on $185 · Inspection $185 · Blowout $155")).toBeInTheDocument()
  })

  it("does not let a full week be chosen", () => {
    render(<CheckoutFlow weeks={oneFull} season={2027} prefill={{ ...answers, weekStart: null }} initialStep={3} />)
    expect(continueButton()).toBeDisabled()
    const full = screen.getByRole("group", { name: "Week of October 11, full" })
    expect(full).toHaveAttribute("aria-disabled", "true")
    expect(full.querySelector("button")).toBeNull()
    expect(screen.getByText("That week is full")).toBeInTheDocument()
    fireEvent.click(full.querySelector('[data-slot="week-card"]') as HTMLElement)
    expect(continueButton()).toBeDisabled()
    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(3)
    fireEvent.click(screen.getByRole("button", { name: /Week of Oct 18/ }))
    expect(continueButton()).toBeEnabled()
  })

  it("asks kindly for the contact details it is missing", () => {
    render(<CheckoutFlow weeks={weeks} season={2027} prefill={{ ...answers, email: "andrea.example.com", phone: "" }} initialStep={4} />)
    expect(continueButton()).toBeDisabled()
    expect(screen.queryByText("We need an email for the receipt.")).not.toBeInTheDocument()
    fireEvent.keyDown(screen.getByLabelText("First name"), { key: "Enter" })
    expect(screen.getByText("We need an email for the receipt.")).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("We need a ten-digit phone number for the day-of text.")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "andrea@example.com" } })
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "970-555-0123" } })
    expect(continueButton()).toBeEnabled()
  })

  it("reaches Done and shows the pass card with the chosen name", () => {
    const onComplete = vi.fn()
    render(<CheckoutFlow weeks={weeks} season={2027} prefill={answers} initialStep={5} onComplete={onComplete} />)
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Save card and reserve" }))
    })
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0]).toMatchObject({ firstName: "Andrea", zones: 8, blowoutWeek: "2027-10-18", cardLast4: "4242" })
    expect(screen.getByRole("article", { name: /Season Pass 2027 for Andrea, Erie, blowout reserved for the week of October 18/ })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your season is reserved")
    expect(screen.getByText(/blowout the week of October 18\. We'll email the details to andrea@example\.com\./)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument()
    expect(progress()).toHaveAttribute("aria-valuenow", "6")
  })

  it("treats Done as the end: no Back, no arrow up, so the card is saved once", () => {
    const onComplete = vi.fn()
    render(<CheckoutFlow weeks={weeks} season={2027} prefill={answers} initialStep={5} onComplete={onComplete} />)
    fireEvent.keyDown(screen.getByRole("button", { name: "Save card and reserve" }), { key: "ArrowDown" })
    expect(progress()).toHaveAttribute("aria-valuenow", "6")
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument()
    fireEvent.keyDown(section(), { key: "ArrowUp" })
    fireEvent.keyDown(section(), { key: "Enter" })
    expect(progress()).toHaveAttribute("aria-valuenow", "6")
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(screen.getByText("6 of 6")).toHaveAttribute("aria-hidden", "true")
  })

  describe("reveal", () => {
    afterEach(() => {
      vi.unstubAllGlobals()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (HTMLElement.prototype as any).animate
    })

    it("rises the pass card into view on Done, and holds still under reduced motion", () => {
      const animate = vi.fn<(frames: Keyframe[], options: KeyframeAnimationOptions) => { cancel: () => void }>(() => ({ cancel: vi.fn() }))
      HTMLElement.prototype.animate = animate as unknown as typeof HTMLElement.prototype.animate
      stubMotion(false)
      const { unmount } = render(<CheckoutFlow weeks={weeks} season={2027} prefill={answers} initialStep={6} />)
      expect(animate).toHaveBeenCalledTimes(1)
      expect(animate.mock.calls[0][1]).toMatchObject({ duration: 600, fill: "backwards" })
      unmount()
      stubMotion(true)
      render(<CheckoutFlow weeks={weeks} season={2027} prefill={answers} initialStep={6} />)
      expect(animate).toHaveBeenCalledTimes(1)
    })

    it("does not animate the first question on open, only the move to the next one", () => {
      const animate = vi.fn<(frames: Keyframe[], options: KeyframeAnimationOptions) => { cancel: () => void }>(() => ({ cancel: vi.fn() }))
      HTMLElement.prototype.animate = animate as unknown as typeof HTMLElement.prototype.animate
      stubMotion(false)
      render(<CheckoutFlow weeks={weeks} season={2027} prefill={answers} />)
      expect(animate).not.toHaveBeenCalled()
      fireEvent.keyDown(screen.getByLabelText("Street address"), { key: "Enter" })
      expect(animate).toHaveBeenCalledTimes(1)
      expect(animate.mock.calls[0][1]).toMatchObject({ duration: 300 })
    })
  })
})
