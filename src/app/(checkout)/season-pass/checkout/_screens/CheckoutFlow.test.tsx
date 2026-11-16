import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, act, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FIXTURE_HOME } from "@/lib/places/fixture"
import { choicesAfterOffer, fixtureOffers } from "./checkout-days"
import { CheckoutFlow } from "./CheckoutFlow"
import type { Pass } from "@/lib/admin/types"
import type { BeginResult, FinishResult, RenewalPrefill } from "./checkout-submit"
import type { CheckoutFields } from "./checkout-state"

// Stripe.js never loads in a test: the card form is a button that says the card was saved.
vi.mock("./StripeCard", () => ({
  StripeCard: ({ clientSecret, onComplete }: { clientSecret: string; onComplete: () => void }) => (
    <button type="button" data-secret={clientSecret} onClick={onComplete}>
      Stripe card saved
    </button>
  ),
}))

// jsdom has none of these; the Radix select reads them.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}
})

beforeEach(() => sessionStorage.clear())

const answers: Partial<CheckoutFields> = {
  address: FIXTURE_HOME.label,
  place: FIXTURE_HOME,
  town: "Erie",
  access: "yes",
  accessNote: "Gate code 4471, controller in the garage.",
  today: "2026-11-12",
  zones: 8,
  firstName: "Andrea",
  lastName: "Anderson",
  email: "andrea@example.com",
  phone: "(970) 555-0123",
  termsAccepted: true,
}

const DAYS = choicesAfterOffer(fixtureOffers(2027, ["turn-on", "blowout"]), [])
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
  it("opens on the address question with Continue enabled", () => {
    render(<CheckoutFlow season={2027} />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Where is the yard?")
    expect(continueButton()).toBeEnabled()
    expect(screen.getByRole("progressbar", { name: "Checkout progress" })).toHaveAttribute("aria-valuenow", "1")
    expect(live()).toHaveTextContent("Step 1 of 7, Where is the yard?")
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument()
    expect(screen.getByLabelText("Street address")).toHaveFocus()
  })

  it("moves on once an address in the six towns is picked from the list", async () => {
    const user = userEvent.setup()
    render(<CheckoutFlow season={2027} />)
    const box = screen.getByRole("combobox", { name: "Street address" })
    await user.type(box, "123 Tr")
    expect(continueButton()).toBeEnabled()
    await user.click(await screen.findByRole("option", { name: /123 Trailhead Way/ }))
    expect(box).toHaveValue("123 Trailhead Way, Erie, CO 80516")
    expect(continueButton()).toBeEnabled()
    await user.click(screen.getByRole("button", { name: /^Yes/ }))
    expect(screen.getByLabelText("How we get in")).toBeInTheDocument()
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
    expect(continueButton()).toBeEnabled()
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
    expect(live()).toHaveTextContent("Step 2 of 7, How many zones does your system have?")
    expect(screen.getByText("2 of 7")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "8 zones", pressed: true })).toHaveFocus()
    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(progress()).toHaveAttribute("aria-valuenow", "1")
    expect(live()).toHaveTextContent("Step 1 of 7")
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
    expect(screen.getAllByRole("heading", { level: 1 })[1]).toHaveTextContent("Add a mid-season inspection?")
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
    render(<CheckoutFlow season={2027} prefill={{ ...answers, email: "" }} initialStep={5} />)
    const email = screen.getByLabelText("Email")
    await user.type(email, "andrea@gmail.con")
    await user.click(screen.getByRole("button", { name: "andrea@gmail.com" }))
    expect(email).toHaveValue("andrea@gmail.com")
    expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument()
  })

  it("offers the July inspection as an add-on, off by default, and prices it for the zones", () => {
    render(<CheckoutFlow season={2027} prefill={answers} initialStep={3} />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Add a mid-season inspection?")
    expect(screen.getByRole("button", { name: /No, just the two/, pressed: true })).toHaveFocus()
    expect(continueButton()).toBeEnabled()
    fireEvent.click(screen.getByRole("button", { name: /Yes, add July/ }))
    expect(screen.getByRole("button", { name: /Yes, add July/ })).toHaveTextContent("$145 after the visit")
    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(screen.getByText("$405")).toBeInTheDocument()
    expect(screen.getByText("Turn-on $145 · Inspection $145 · Blowout $115")).toBeInTheDocument()
  })

  it("shows the live price for the chosen zones", () => {
    render(<CheckoutFlow season={2027} prefill={answers} initialStep={2} />)
    expect(screen.getByText("$260")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "12 zones" }))
    expect(screen.getByText("$340")).toBeInTheDocument()
    expect(screen.getByText("Turn-on $185 · Blowout $155")).toBeInTheDocument()
  })

  it("offers three days for each visit with the first selected, and the line about changing it later", async () => {
    render(<CheckoutFlow season={2027} initialStep={4} prefill={{ address: "9 Elm St", town: "Erie", inspection: true }} />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Pick your days")
    const radios = await screen.findAllByRole("radio")
    expect(radios).toHaveLength(9)
    const turnOn = screen.getByRole("group", { name: "Your spring turn-on" })
    expect(within(turnOn).getAllByRole("radio")).toHaveLength(3)
    expect(within(turnOn).getAllByRole("radio")[0]).toBeChecked()
    expect(within(turnOn).getAllByRole("radio")[0]).toHaveFocus()
    expect(turnOn).toHaveTextContent("Tuesday, May 4")
    expect(turnOn).toHaveTextContent("between 8 and 10 am")
    expect(screen.getByRole("group", { name: "Your July inspection" })).toBeInTheDocument()
    expect(screen.getByText("Change it later from your pass page.")).toBeInTheDocument()
    expect(continueButton()).toBeEnabled()
    expect(document.body.textContent).not.toMatch(/early|mid |late |recommended|capacity/i)
  })

  it("holds the day picked and carries each held day to the pass", async () => {
    const onComplete = vi.fn()
    render(<CheckoutFlow season={2027} initialStep={4} prefill={answers} onComplete={onComplete} />)
    const radios = await screen.findAllByRole("radio")
    fireEvent.click(radios[2]!)
    expect(radios[2]).toBeChecked()
    expect(radios[0]).not.toBeChecked()
    fireEvent.keyDown(radios[2]!, { key: "Enter" })
    expect(progress()).toHaveAttribute("aria-valuenow", "5")
    fireEvent.keyDown(screen.getByLabelText("First name"), { key: "Enter" })
    fireEvent.click(screen.getByRole("button", { name: "Save card and reserve" }))
    expect(onComplete.mock.calls[0][0].visits[0]).toMatchObject({ kind: "turn-on", scheduledOn: "2027-05-25", startTime: "08:00" })
  })

  it("asks the server for the days when it is wired, and says Ryan sets a day it has none for", async () => {
    const onOffer = vi.fn().mockResolvedValue({ "turn-on": [], blowout: [{ day: "2027-10-05", truckId: "truck-1", start: "08:00", window: "8 to 10 am" }] })
    render(<CheckoutFlow season={2027} initialStep={4} prefill={answers} onOffer={onOffer} />)
    expect(await screen.findByText(/Ryan sets this one and we text it to you/)).toBeInTheDocument()
    expect(onOffer).toHaveBeenCalledWith({ town: "Erie", zones: 8, inspection: false, season: 2027, today: "2026-11-12" })
    expect(screen.getAllByRole("radio")).toHaveLength(1)
    expect(continueButton()).toBeEnabled()
  })

  it("moves on with no days when the lookup fails, rather than stopping the purchase", async () => {
    render(<CheckoutFlow season={2027} initialStep={4} prefill={answers} onOffer={() => Promise.reject(new Error("down"))} />)
    expect(await screen.findAllByText(/Ryan sets this one/)).toHaveLength(2)
    expect(continueButton()).toBeEnabled()
  })

  it("ends the contact step with the terms box: Continue holds until it is ticked, says so beside the box, and records each marketing channel", () => {
    const onComplete = vi.fn()
    render(<CheckoutFlow season={2027} initialStep={5} prefill={{ ...answers, termsAccepted: false }} onComplete={onComplete} />)
    const terms = screen.getByRole("checkbox", { name: /I accept the Season Pass terms.* and the Trailhead terms of service/ })
    const email = screen.getByRole("checkbox", { name: "Seasonal tips and offers by email" })
    const sms = screen.getByRole("checkbox", { name: "Seasonal tips and offers by text" })
    expect(terms).not.toBeChecked()
    expect(email).not.toBeChecked()
    expect(sms).not.toBeChecked()
    expect(email).toHaveAccessibleDescription("You can stop any time. We send visit reminders and receipts either way.")
    expect(sms).toHaveAccessibleDescription("Message frequency varies. Msg and data rates may apply. Reply STOP to opt out. Consent is not a condition of purchase.")
    const links = screen.getAllByRole("link", { name: /terms/ })
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/terms#season-pass", "/terms"])
    expect(links.every((l) => l.getAttribute("target") === "_blank")).toBe(true)
    const next = continueButton()
    expect(screen.queryByText("Accept the terms to continue.")).not.toBeInTheDocument()
    fireEvent.click(next)
    expect(screen.getByRole("heading", { name: "Who should we reach?" })).toBeInTheDocument()
    expect(screen.getByText("Accept the terms to continue.")).toBeInTheDocument()
    expect(next).toHaveAccessibleDescription("Accept the terms to continue.")
    expect(terms).toHaveAttribute("aria-invalid", "true")
    expect(terms).toHaveFocus()
    fireEvent.click(sms)
    fireEvent.click(terms)
    expect(terms).toBeChecked()
    expect(screen.queryByText("Accept the terms to continue.")).not.toBeInTheDocument()
    expect(next).not.toHaveAttribute("aria-describedby")
    fireEvent.click(next)
    expect(screen.getByRole("heading", { name: /Save a card for after each visit/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Save card and reserve" }))
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0].consent).toMatchObject({ termsVersion: "2026-11", marketingOptIn: true, marketingChannels: ["sms"], source: "checkout" })
    expect(onComplete.mock.calls[0][0].consent.termsAcceptedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it("asks kindly for the contact details it is missing", () => {
    render(<CheckoutFlow season={2027} prefill={{ ...answers, email: "andrea.example.com", phone: "" }} initialStep={5} />)
    expect(continueButton()).toBeEnabled()
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
    render(<CheckoutFlow season={2027} prefill={{ ...answers, days: DAYS }} initialStep={6} onComplete={onComplete} />)
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Save card and reserve" }))
    })
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0]).toMatchObject({ firstName: "Andrea", zones: 8, cardLast4: "4242" })
    expect(onComplete.mock.calls[0][0].consent).toMatchObject({ marketingOptIn: false, marketingChannels: [] })
    expect(screen.getByRole("article", { name: /Season Pass 2027 for Andrea, Erie/ })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your season is reserved")
    expect(screen.getByRole("region", { name: "What happens next" })).toHaveTextContent(/Tuesday, May 4.*Tuesday, October 5.*Before each visit.*What you pay/)
    expect(screen.getByText(/We emailed your pass and a link to/)).toHaveTextContent("andrea@example.com")
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument()
    expect(progress()).toHaveAttribute("aria-valuenow", "7")
  })

  it("treats Done as the end: no Back, no arrow up, so the card is saved once", () => {
    const onComplete = vi.fn()
    render(<CheckoutFlow season={2027} prefill={answers} initialStep={6} onComplete={onComplete} />)
    fireEvent.keyDown(screen.getByRole("button", { name: "Save card and reserve" }), { key: "ArrowDown" })
    expect(progress()).toHaveAttribute("aria-valuenow", "7")
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument()
    fireEvent.keyDown(section(), { key: "ArrowUp" })
    fireEvent.keyDown(section(), { key: "Enter" })
    expect(progress()).toHaveAttribute("aria-valuenow", "7")
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(screen.getByText("7 of 7")).toHaveAttribute("aria-hidden", "true")
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
      const { unmount } = render(<CheckoutFlow season={2027} prefill={answers} initialStep={7} />)
      expect(animate).toHaveBeenCalledTimes(1)
      expect(animate.mock.calls[0][1]).toMatchObject({ duration: 600, fill: "backwards" })
      unmount()
      stubMotion(true)
      render(<CheckoutFlow season={2027} prefill={answers} initialStep={7} />)
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

describe("CheckoutFlow wired to the server actions", () => {
  const realPass = { id: "p-real", number: "TH-2027-0042", season: 2027, clientId: "c1", firstName: "Andrea", town: "Erie", zones: 8, turnOnPreference: "earlier", blowoutPreference: "recommended", status: "active", visits: [{ kind: "turn-on", window: "May", amount: 145 }, { kind: "blowout", window: "October", amount: 115 }], stripeUrl: "", jobberUrl: "", cardLast4: "4242" } as Pass
  const begun: BeginResult = { ok: true, passId: "p-real", sessionId: "cs_1", clientSecret: "secret_1" }
  const saved: FinishResult = { ok: true, pass: realPass }
  const setup = (over: { begin?: BeginResult; finish?: FinishResult } = {}) => {
    const onBegin = vi.fn(async () => over.begin ?? begun)
    const onFinish = vi.fn(async () => over.finish ?? saved)
    const onComplete = vi.fn()
    render(<CheckoutFlow season={2027} initialStep={5} prefill={answers} stripeKey="pk_test_x" onBegin={onBegin} onFinish={onFinish} onComplete={onComplete} />)
    return { onBegin, onFinish, onComplete }
  }

  it("makes the pending pass when the contact step passes and opens the card step on its session", async () => {
    const { onBegin } = setup()
    fireEvent.click(continueButton())
    await screen.findByRole("heading", { name: /Save a card for after each visit/ })
    expect(onBegin).toHaveBeenCalledTimes(1)
    expect(onBegin.mock.calls[0]).toEqual([expect.objectContaining({ firstName: "Andrea", lastName: "Anderson", email: "andrea@example.com", town: "Erie", zones: 8, needsCustomerHome: false, accessNote: "Gate code 4471, controller in the garage." }), undefined])
  })
  it("keeps Continue on the contact step and says why when the server refuses", async () => {
    setup({ begin: { ok: false, problem: "email-unreachable", message: "We can't find that email's mail server. Check the spelling." } })
    fireEvent.click(continueButton())
    expect(await screen.findByRole("alert")).toHaveTextContent("mail server")
    expect(screen.getByRole("heading", { name: "Who should we reach?" })).toBeInTheDocument()
  })
  it("opens the card form straight away, then activates the pass on Stripe's completion and shows the real pass", async () => {
    const { onFinish, onComplete } = setup()
    fireEvent.click(continueButton())
    await screen.findByRole("heading", { name: /Save a card for after each visit/ })
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Save card and reserve" })).not.toBeInTheDocument()
    fireEvent.keyDown(section(), { key: "Enter" })
    expect(screen.getByRole("heading", { name: "Save a card for after each visit." })).toBeInTheDocument()
    const card = screen.getByRole("button", { name: "Stripe card saved" })
    expect(card).toHaveAttribute("data-secret", "secret_1")
    fireEvent.click(card)
    await screen.findByRole("heading", { name: "Your season is reserved" })
    expect(onFinish).toHaveBeenCalledWith("p-real", "cs_1", { termsAccepted: true, marketingEmail: false, marketingSms: false }, "Andrea")
    expect(onComplete).toHaveBeenCalledWith(realPass)
    expect(screen.getByText("TH-2027-0042")).toBeInTheDocument()
  })
  it("does not make a pass while the terms are unticked", async () => {
    const onBegin = vi.fn(async () => begun)
    render(<CheckoutFlow season={2027} initialStep={5} prefill={{ ...answers, termsAccepted: false }} stripeKey="pk_test_x" onBegin={onBegin} onFinish={vi.fn()} />)
    fireEvent.click(continueButton())
    expect(onBegin).not.toHaveBeenCalled()
    expect(screen.getByText("Accept the terms to continue.")).toBeInTheDocument()
  })
  it("stays on the card step with a message when activation fails", async () => {
    setup({ finish: { ok: false, problem: "unavailable", message: "We couldn't reach the card form just now." } })
    fireEvent.click(continueButton())
    await screen.findByRole("heading", { name: /Save a card for after each visit/ })
    fireEvent.click(screen.getByRole("button", { name: "Stripe card saved" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't reach the card form")
    expect(screen.queryByRole("heading", { name: "Your season is reserved" })).not.toBeInTheDocument()
  })
})

describe("a renewal on the card on file", () => {
  const renewal: RenewalPrefill = {
    passId: "p-last",
    season: 2028,
    token: "tok",
    firstName: "Andrea",
    email: "andrea@example.com",
    phone: "(970) 555-0123",
    place: { id: "property-1", label: "5 Pine St, Erie, CO", line1: "5 Pine St", town: "Erie", state: "CO", zip: "" },
    zones: 10,
    inspection: true,
    needsCustomerHome: false,
    accessNote: "Gate 12",
    card: { last4: "4242", expires: "2029-08" },
  }
  const reservedPass = { id: "p-new", number: "TH-2028-0001", season: 2028, clientId: "c1", firstName: "Andrea", town: "Erie", zones: 10, turnOnPreference: "recommended", blowoutPreference: "recommended", status: "active", visits: [{ kind: "turn-on", window: "May", amount: 185 }], stripeUrl: "", jobberUrl: "", cardLast4: "4242" } as Pass

  it("is filled in from the last pass and counts five steps", () => {
    render(<CheckoutFlow season={2028} today="2027-11-02" renewal={renewal} />)
    expect(screen.getByRole("combobox", { name: "Street address" })).toHaveValue("5 Pine St, Erie, CO")
    expect(progress()).toHaveAttribute("aria-valuemax", "5")
    fireEvent.click(continueButton())
    expect(screen.getByRole("button", { name: "10 zones", pressed: true })).toBeInTheDocument()
    fireEvent.click(continueButton())
    expect(screen.getByRole("button", { name: /Yes, add July/ })).toBeInTheDocument()
  })

  it("goes from the days straight to Done: the card on file with a way to change it, the terms, and Reserve 2028", async () => {
    const onRenew = vi.fn().mockResolvedValue({ ok: true, pass: reservedPass })
    render(<CheckoutFlow season={2028} today="2027-11-02" renewal={renewal} onRenew={onRenew} initialStep={4} />)
    await screen.findAllByRole("radio")
    expect(screen.getByText(/Card ending 4242 on file,/)).toHaveTextContent("Card ending 4242 on file, change it")
    expect(screen.getByRole("link", { name: /change it/ })).toHaveAttribute("href", "/account/pass")
    const reserve = screen.getByRole("button", { name: "Reserve 2028" })
    fireEvent.click(reserve)
    expect(onRenew).not.toHaveBeenCalled()
    expect(screen.getByText(/accept the terms to continue/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("checkbox", { name: /I accept the Season Pass terms/ }))
    await act(async () => {
      fireEvent.click(reserve)
    })
    expect(onRenew).toHaveBeenCalledTimes(1)
    const [who, submission] = onRenew.mock.calls[0]!
    expect(who).toEqual({ passId: "p-last", token: "tok" })
    expect(submission).toMatchObject({ zones: 10, inspection: true, email: "andrea@example.com", town: "Erie" })
    expect(submission.days.map((d: { kind: string }) => d.kind)).toEqual(["turn-on", "inspection", "blowout"])
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your season is reserved")
    expect(progress()).toHaveAttribute("aria-valuenow", "5")
  })

  it("says what went wrong and stays on the days when the server will not reserve", async () => {
    const onRenew = vi.fn().mockResolvedValue({ ok: false, problem: "invalid", message: "Your 2028 season is already reserved." })
    render(<CheckoutFlow season={2028} today="2027-11-02" renewal={renewal} onRenew={onRenew} initialStep={4} prefill={{ termsAccepted: true }} />)
    await screen.findAllByRole("radio")
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Reserve 2028" }))
    })
    expect(screen.getByRole("alert")).toHaveTextContent("Your 2028 season is already reserved.")
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Pick your days")
  })

  it("keeps the card step when there is no card on file", () => {
    render(<CheckoutFlow season={2028} today="2027-11-02" renewal={{ ...renewal, card: null }} />)
    expect(progress()).toHaveAttribute("aria-valuemax", "7")
  })
})
