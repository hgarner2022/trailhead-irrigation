import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { render, screen, fireEvent, act, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FIXTURE_HOME } from "@/lib/places/fixture"
import { CheckoutFlow } from "./CheckoutFlow"
import type { CheckoutFields } from "./checkout-state"

// jsdom has none of these; the Radix select reads them.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}
})

const answers: Partial<CheckoutFields> = {
  address: FIXTURE_HOME.label,
  place: FIXTURE_HOME,
  town: "Erie",
  zones: 8,
  turnOnPreference: "earlier",
  blowoutPreference: "recommended",
  firstName: "Andrea",
  email: "andrea@example.com",
  phone: "(970) 555-0123",
  termsAccepted: true,
}
const choice = (kind: string, preference: string) => document.querySelector(`[data-slot="timing-choice"][data-kind="${kind}"][data-preference="${preference}"]`) as HTMLElement

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
    render(<CheckoutFlow season={2027} />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Where is the yard?")
    expect(continueButton()).toBeDisabled()
    expect(screen.getByRole("progressbar", { name: "Checkout progress" })).toHaveAttribute("aria-valuenow", "1")
    expect(live()).toHaveTextContent("Step 1 of 6, Where is the yard?")
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument()
    expect(screen.getByLabelText("Street address")).toHaveFocus()
  })

  it("enables Continue once an address in the six towns is picked from the list", async () => {
    const user = userEvent.setup()
    render(<CheckoutFlow season={2027} />)
    const box = screen.getByRole("combobox", { name: "Street address" })
    await user.type(box, "123 Tr")
    expect(continueButton()).toBeDisabled()
    await user.click(await screen.findByRole("option", { name: /123 Trailhead Way/ }))
    expect(box).toHaveValue("123 Trailhead Way, Erie, CO 80516")
    expect(continueButton()).toBeEnabled()
    await user.click(continueButton())
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("How many zones does your system have?")
  })

  it("refuses an address outside the six towns and says so", async () => {
    const user = userEvent.setup()
    render(<CheckoutFlow season={2027} />)
    const box = screen.getByRole("combobox", { name: "Street address" })
    await user.type(box, "1200 Pe")
    await user.click(await screen.findByRole("option", { name: /Boulder/ }))
    expect(screen.getByText(/We don't serve Boulder yet/)).toBeInTheDocument()
    expect(box).toHaveAttribute("aria-invalid", "true")
    expect(continueButton()).toBeDisabled()
    fireEvent.keyDown(box, { key: "Enter" })
    expect(progress()).toHaveAttribute("aria-valuenow", "1")
  })

  it("asks for a pick when Enter comes with only typing, and picks with the arrow keys and Enter while the list is open", async () => {
    const user = userEvent.setup()
    render(<CheckoutFlow season={2027} />)
    const box = screen.getByRole("combobox", { name: "Street address" })
    await user.type(box, "123 Trailhead Way")
    await screen.findByRole("option", { name: /123 Trailhead Way/ })
    fireEvent.keyDown(box, { key: "Escape" })
    expect(box).toHaveAttribute("aria-expanded", "false")
    fireEvent.keyDown(box, { key: "Enter" })
    expect(screen.getByText("Pick your address from the list so we have it right.")).toBeInTheDocument()
    expect(progress()).toHaveAttribute("aria-valuenow", "1")
    await user.clear(box)
    await user.type(box, "Lowell")
    const options = await screen.findAllByRole("option")
    expect(options).toHaveLength(2)
    await user.keyboard("{ArrowDown}{Enter}")
    expect(box).toHaveValue("7300 Lowell Blvd, Westminster, CO 80030")
    expect(progress()).toHaveAttribute("aria-valuenow", "1")
    expect(screen.getByText(/We don't serve Westminster yet/)).toBeInTheDocument()
  })

  it("advances on Enter when the step is valid and goes back on Back", () => {
    render(<CheckoutFlow season={2027} prefill={answers} />)
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
    render(<CheckoutFlow season={2027} />)
    fireEvent.keyDown(screen.getByLabelText("Street address"), { key: "Enter" })
    expect(progress()).toHaveAttribute("aria-valuenow", "1")
    fireEvent.keyDown(section(), { key: "ArrowUp" })
    expect(progress()).toHaveAttribute("aria-valuenow", "1")
    render(<CheckoutFlow season={2027} prefill={answers} initialStep={2} />)
    const zones = screen.getByRole("button", { name: "8 zones", pressed: true })
    fireEvent.keyDown(zones, { key: "ArrowDown" })
    expect(screen.getAllByRole("progressbar")[1]).toHaveAttribute("aria-valuenow", "3")
    fireEvent.keyDown(screen.getAllByRole("heading", { level: 1 })[1], { key: "ArrowUp" })
    expect(screen.getAllByRole("progressbar")[1]).toHaveAttribute("aria-valuenow", "2")
  })

  it("leaves the arrow keys to a text input and Enter to an unpressed pill", () => {
    render(<CheckoutFlow season={2027} prefill={answers} />)
    const address = screen.getByLabelText("Street address")
    fireEvent.keyDown(address, { key: "ArrowDown" })
    expect(progress()).toHaveAttribute("aria-valuenow", "1")
    fireEvent.keyDown(address, { key: "Enter", isComposing: true })
    expect(progress()).toHaveAttribute("aria-valuenow", "1")
    fireEvent.keyDown(address, { key: "Enter" })
    expect(progress()).toHaveAttribute("aria-valuenow", "2")
    fireEvent.keyDown(screen.getByRole("button", { name: "12 zones", pressed: false }), { key: "Enter" })
    expect(progress()).toHaveAttribute("aria-valuenow", "2")
    fireEvent.keyDown(screen.getByRole("button", { name: "8 zones", pressed: true }), { key: "Enter" })
    expect(progress()).toHaveAttribute("aria-valuenow", "3")
  })

  it("offers the email on a common domain when the typed one is a slip, and takes it on a click", async () => {
    const user = userEvent.setup()
    render(<CheckoutFlow season={2027} prefill={{ ...answers, email: "" }} initialStep={4} />)
    const email = screen.getByLabelText("Email")
    await user.type(email, "andrea@gmail.con")
    await user.click(screen.getByRole("button", { name: "andrea@gmail.com" }))
    expect(email).toHaveValue("andrea@gmail.com")
    expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument()
  })

  it("shows the live price for the chosen zones", () => {
    render(<CheckoutFlow season={2027} prefill={answers} initialStep={2} />)
    expect(screen.getByText("$405")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "12 zones" }))
    expect(screen.getByText("$525")).toBeInTheDocument()
    expect(screen.getByText("Turn-on $185 · Inspection $185 · Blowout $155")).toBeInTheDocument()
  })

  it("asks both timing questions on one screen with the recommendation preselected and the reason under each", () => {
    render(<CheckoutFlow season={2027} initialStep={3} prefill={{ address: "9 Elm St", town: "Erie" }} />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("When should we turn your system on?")
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("And your fall blowout?")
    const turnOn = screen.getByRole("group", { name: "When should we turn your system on?" })
    const blowout = screen.getByRole("group", { name: "And your fall blowout?" })
    expect(within(turnOn).getAllByRole("button").map((b) => b.textContent)).toEqual(["EarlierEarly May", "RecommendedMid May", "LaterLate May"])
    expect(within(blowout).getAllByRole("button").map((b) => b.textContent)).toEqual(["EarlierEarly October", "RecommendedMid October", "LaterLate October"])
    expect(within(turnOn).getByRole("button", { pressed: true })).toHaveTextContent("Recommended")
    expect(within(blowout).getByRole("button", { pressed: true })).toHaveTextContent("Recommended")
    expect(within(turnOn).getByRole("button", { pressed: true })).toHaveFocus()
    expect(turnOn).toHaveAccessibleDescription("Mid May is the first and second week. Front Range systems are usually safe to run by early May.")
    expect(blowout).toHaveAccessibleDescription("Mid October is the second week. The first hard freeze usually arrives between mid and late October, so the second week leaves room.")
    expect(continueButton()).toBeEnabled()
    expect(document.body.textContent).not.toMatch(/full|spots|capacity/i)
  })

  it("changes a preference on click and carries it to the pass", () => {
    const onComplete = vi.fn()
    render(<CheckoutFlow season={2027} initialStep={3} prefill={answers} onComplete={onComplete} />)
    expect(choice("turn-on", "earlier")).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(choice("turn-on", "later"))
    fireEvent.click(choice("blowout", "earlier"))
    expect(choice("turn-on", "later")).toHaveAttribute("aria-pressed", "true")
    expect(choice("turn-on", "earlier")).toHaveAttribute("aria-pressed", "false")
    expect(choice("blowout", "earlier")).toHaveAttribute("aria-pressed", "true")
    expect(choice("blowout", "recommended")).toHaveAttribute("aria-pressed", "false")
    fireEvent.keyDown(choice("turn-on", "later"), { key: "Enter" })
    expect(progress()).toHaveAttribute("aria-valuenow", "4")
    fireEvent.keyDown(screen.getByLabelText("First name"), { key: "Enter" })
    fireEvent.click(screen.getByRole("button", { name: "Save card and reserve" }))
    expect(onComplete.mock.calls[0][0]).toMatchObject({ turnOnPreference: "later", blowoutPreference: "earlier" })
  })

  it("walks the two timing groups with the arrow keys before leaving the step", () => {
    render(<CheckoutFlow season={2027} initialStep={3} prefill={answers} />)
    const turnOn = choice("turn-on", "earlier")
    const blowout = choice("blowout", "recommended")
    expect(turnOn).toHaveFocus()
    fireEvent.keyDown(turnOn, { key: "ArrowDown" })
    expect(blowout).toHaveFocus()
    expect(progress()).toHaveAttribute("aria-valuenow", "3")
    fireEvent.keyDown(blowout, { key: "ArrowUp" })
    expect(turnOn).toHaveFocus()
    expect(progress()).toHaveAttribute("aria-valuenow", "3")
    fireEvent.keyDown(blowout, { key: "ArrowDown" })
    expect(progress()).toHaveAttribute("aria-valuenow", "4")
  })

  it("holds the card step until the terms are accepted, says so once tried, and records each marketing channel", () => {
    const onComplete = vi.fn()
    render(<CheckoutFlow season={2027} initialStep={5} prefill={{ ...answers, termsAccepted: false }} onComplete={onComplete} />)
    const terms = screen.getByRole("checkbox", { name: /I accept the Season Pass terms.* and the Trailhead terms of service/ })
    const email = screen.getByRole("checkbox", { name: "Seasonal tips and offers by email" })
    const sms = screen.getByRole("checkbox", { name: "Seasonal tips and offers by text" })
    expect(terms).not.toBeChecked()
    expect(email).not.toBeChecked()
    expect(sms).not.toBeChecked()
    expect(email).toHaveAccessibleDescription("You can stop any time. Visit reminders and receipts are sent either way.")
    expect(sms).toHaveAccessibleDescription("Message frequency varies. Msg and data rates may apply. Reply STOP to opt out. Consent is not a condition of purchase.")
    const links = screen.getAllByRole("link", { name: /terms/ })
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/terms", "/terms"])
    expect(links.every((l) => l.getAttribute("target") === "_blank")).toBe(true)
    const save = screen.getByRole("button", { name: "Save card and reserve" })
    expect(save).toBeDisabled()
    expect(screen.queryByText("Please accept the terms to continue")).not.toBeInTheDocument()
    fireEvent.keyDown(section(), { key: "Enter" })
    expect(screen.getByText("Please accept the terms to continue")).toBeInTheDocument()
    expect(save).toHaveAccessibleDescription("Please accept the terms to continue")
    expect(terms).toHaveAttribute("aria-invalid", "true")
    fireEvent.click(sms)
    expect(save).toBeDisabled()
    fireEvent.click(terms)
    expect(terms).toBeChecked()
    expect(save).toBeEnabled()
    expect(screen.queryByText("Please accept the terms to continue")).not.toBeInTheDocument()
    expect(save).not.toHaveAttribute("aria-describedby")
    fireEvent.click(save)
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0].consent).toMatchObject({ termsVersion: "2026-11", marketingOptIn: true, marketingChannels: ["sms"], source: "checkout" })
    expect(onComplete.mock.calls[0][0].consent.termsAcceptedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it("asks kindly for the contact details it is missing", () => {
    render(<CheckoutFlow season={2027} prefill={{ ...answers, email: "andrea.example.com", phone: "" }} initialStep={4} />)
    expect(continueButton()).toBeDisabled()
    expect(screen.queryByText("That email doesn't look complete.")).not.toBeInTheDocument()
    fireEvent.keyDown(screen.getByLabelText("First name"), { key: "Enter" })
    expect(screen.getByText("That email doesn't look complete.")).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("We need a ten-digit phone number for the day-of text.")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "andrea@example.com" } })
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "970-555-0123" } })
    expect(continueButton()).toBeEnabled()
  })

  it("reaches Done and shows the pass card with the chosen name", () => {
    const onComplete = vi.fn()
    render(<CheckoutFlow season={2027} prefill={answers} initialStep={5} onComplete={onComplete} />)
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Save card and reserve" }))
    })
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0]).toMatchObject({ firstName: "Andrea", zones: 8, turnOnPreference: "earlier", blowoutPreference: "recommended", cardLast4: "4242" })
    expect(onComplete.mock.calls[0][0].consent).toMatchObject({ marketingOptIn: false, marketingChannels: [] })
    expect(screen.getByRole("article", { name: "Season Pass 2027 for Andrea, Erie, turn-on preferred early May, blowout preferred mid October" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your season is reserved")
    expect(screen.getByText("Turn-on preferred early May, inspection in July, blowout preferred mid October. We'll email the details to andrea@example.com.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument()
    expect(progress()).toHaveAttribute("aria-valuenow", "6")
  })

  it("treats Done as the end: no Back, no arrow up, so the card is saved once", () => {
    const onComplete = vi.fn()
    render(<CheckoutFlow season={2027} prefill={answers} initialStep={5} onComplete={onComplete} />)
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
      const { unmount } = render(<CheckoutFlow season={2027} prefill={answers} initialStep={6} />)
      expect(animate).toHaveBeenCalledTimes(1)
      expect(animate.mock.calls[0][1]).toMatchObject({ duration: 600, fill: "backwards" })
      unmount()
      stubMotion(true)
      render(<CheckoutFlow season={2027} prefill={answers} initialStep={6} />)
      expect(animate).toHaveBeenCalledTimes(1)
    })

    it("does not animate the first question on open, only the move to the next one", () => {
      const animate = vi.fn<(frames: Keyframe[], options: KeyframeAnimationOptions) => { cancel: () => void }>(() => ({ cancel: vi.fn() }))
      HTMLElement.prototype.animate = animate as unknown as typeof HTMLElement.prototype.animate
      stubMotion(false)
      render(<CheckoutFlow season={2027} prefill={answers} />)
      expect(animate).not.toHaveBeenCalled()
      fireEvent.keyDown(screen.getByLabelText("Street address"), { key: "Enter" })
      expect(animate).toHaveBeenCalledTimes(1)
      expect(animate.mock.calls[0][1]).toMatchObject({ duration: 300 })
    })
  })
})
