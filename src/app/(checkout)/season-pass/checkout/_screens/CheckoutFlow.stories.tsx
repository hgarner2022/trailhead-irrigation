import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn } from "storybook/test"
import { savePassImage } from "@/lib/pass-card-image"
import { FIXTURE_HOME } from "@/lib/places/fixture"
import { CheckoutFlow } from "./CheckoutFlow"
import { choicesAfterOffer, fixtureOffers } from "./checkout-days"
import type { CheckoutFields } from "./checkout-state"

// The step stories open on one step with the earlier answers prefilled;
// Walkthrough answers every question from the first screen, including the
// consent boxes, and lands on the pass card. The days step opens with three days for each visit and
// recommendations preselected, so it needs nothing prefilled.
const DAYS = choicesAfterOffer(fixtureOffers(2027, ["turn-on", "blowout"]), [])
const answers: Partial<CheckoutFields> = {
  address: FIXTURE_HOME.label,
  place: FIXTURE_HOME,
  town: "Erie",
  access: "yes",
  accessNote: "Gate code 4471, controller in the garage.",
  today: "2026-11-12",
  zones: 8,
  inspection: false,
  turnOnPreference: "earlier",
  blowoutPreference: "recommended",
  firstName: "Andrea",
  email: "andrea@example.com",
  phone: "(970) 555-0123",
}

const meta = {
  title: "Screens/Checkout",
  component: CheckoutFlow,
  parameters: { layout: "fullscreen" },
  args: { season: 2027 },
} satisfies Meta<typeof CheckoutFlow>
export default meta
type Story = StoryObj<typeof meta>

/** One box; type "123" to see the fixture's matches. */
export const Address: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** Bought in August: the turn-on has passed, the pass is the blowout, and the zones step says so. */
export const MidSeason: Story = {
  args: { initialStep: 2, prefill: answers, today: "2027-08-10" },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** A Boulder address picked: the out-of-area line; Continue stays on the step. */
export const AddressOutOfArea: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByRole("combobox", { name: "Street address" }), "1200 Pe")
    await userEvent.click(await canvas.findByRole("option", { name: /Boulder/ }))
    await expect(await canvas.findByText(/We don't serve Boulder yet/)).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent("Where is the yard?")
  },
}

export const Zones: Story = {
  args: { initialStep: 2, prefill: answers },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** The July add-on, off unless the customer adds it. */
export const Inspection: Story = {
  args: { initialStep: 3, prefill: answers },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** Three open days for each visit, the first preselected, one line under them about changing it later. */
export const Days: Story = {
  args: { initialStep: 4, prefill: answers },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas }) => {
    const radios = await canvas.findAllByRole("radio")
    await expect(radios).toHaveLength(6)
    await expect(radios[0]).toBeChecked()
    await expect(canvas.getByText("Change it later from your pass page.")).toBeInTheDocument()
  },
}

/** A renewal: filled in from the last pass, no contact or card step, the card on file named under the days and the terms ticked there. */
export const Renewal: Story = {
  args: {
    season: 2028,
    today: "2027-11-02",
    initialStep: 4,
    renewal: { passId: "p-last", season: 2028, firstName: "Andrea", email: "andrea@example.com", phone: "(970) 555-0123", place: { id: "property-1", label: "123 Trailhead Way, Erie, CO", line1: "123 Trailhead Way", town: "Erie", state: "CO", zip: "80516" }, zones: 8, inspection: false, needsCustomerHome: false, accessNote: "", card: { last4: "4242", expires: "2029-08" } },
  },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Card ending 4242 on file,/)).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Reserve 2028" })).toBeInTheDocument()
  },
}

export const Contact: Story = {
  args: { initialStep: 5, prefill: { ...answers, firstName: "", email: "", phone: "" } },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** Continue pressed with nothing typed: every problem beside its field, a summary naming them, and focus on the first. */
export const ContactErrors: Story = {
  args: { initialStep: 5, prefill: { ...answers, firstName: "", email: "", phone: "", termsAccepted: true } },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Check these before you continue: First name, Email, Phone.")
    await expect(canvas.getByLabelText("First name")).toHaveFocus()
  },
}

/** The card step opens straight into the order summary and the form (the terms were accepted on the contact step). */
export const Card: Story = {
  args: { initialStep: 6, prefill: { ...answers, termsAccepted: true } },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Season total")).toBeInTheDocument()
    await expect(canvas.queryByRole("checkbox")).toBeNull()
  },
}

/** Continue with everything answered but the terms unticked: the line beside the box says what is missing and the box takes focus. */
export const ContactTermsMissing: Story = {
  args: { initialStep: 5, prefill: answers },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await expect(await canvas.findByText("Accept the terms to continue.")).toBeInTheDocument()
    await expect(canvas.getByRole("checkbox", { name: /I accept the Season Pass terms/ })).toHaveFocus()
  },
}

/** The server refused the contact step: the message sits under the answers and the step stays. */
export const ContactRefused: Story = {
  args: {
    initialStep: 5,
    prefill: { ...answers, termsAccepted: true },
    stripeKey: "pk_test_story",
    onBegin: fn(async () => ({ ok: false as const, problem: "email-unreachable" as const, message: "We can't find that email's mail server. Check the spelling." })),
    onFinish: fn(),
  },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await expect(await canvas.findByRole("alert")).toHaveTextContent("mail server")
  },
}

/** The pass the customer is buying, above the card form: each visit with its price, the total, and "$0 today". */
export const CardSummary: Story = {
  args: { initialStep: 6, prefill: { ...answers, inspection: true } },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("$0 today. We charge the card after each visit.")).toBeInTheDocument()
    await expect(canvas.getByText("Season total")).toBeInTheDocument()
  },
}

/** Activation failed after the card was saved (no secret, so no Stripe.js loads in the story): the message, a Try again that re-runs it, and Back. */
export const CardFailed: Story = {
  args: {
    initialStep: 6,
    prefill: { ...answers, termsAccepted: true, passId: "p-story", failure: "We couldn't reach the card form just now. Nothing was charged. Please try again.", retry: "finish" },
    stripeKey: "pk_test_story",
    onBegin: fn(),
    onFinish: fn(),
  },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("button", { name: "Try again" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Back" })).toBeInTheDocument()
  },
}

/** The browser kept a pass the server has since swept: the checkout restarts at contact with one line saying why. */
export const RestoredExpired: Story = {
  args: { initialStep: 5, prefill: { ...answers, passId: "p-new", notice: "Your saved checkout timed out, so we started it fresh. Check your details and continue." } },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/timed out, so we started it fresh/)).toBeInTheDocument()
  },
}

export const Done: Story = {
  args: { initialStep: 7, prefill: { ...answers, days: DAYS, termsAccepted: true, marketingEmail: true, marketingSms: true, cardSaved: true }, onSaveImage: savePassImage },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** Every question answered from the first screen through to the pass card. */
export const Walkthrough: Story = {
  args: { onComplete: fn() },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.type(await canvas.findByRole("combobox", { name: "Street address" }), "123 Tr")
    await userEvent.click(await canvas.findByRole("option", { name: /123 Trailhead Way/ }))
    await userEvent.click(await canvas.findByRole("button", { name: /^Yes/ }))
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))

    await userEvent.click(await canvas.findByRole("button", { name: "8 zones" }))
    await expect(canvas.getByText("$260")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))

    await userEvent.click(await canvas.findByRole("button", { name: /Yes, add July/ }))
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))

    const radios = await canvas.findAllByRole("radio")
    await expect(radios[0]).toBeChecked()
    await userEvent.click(radios[8]!)
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))

    await userEvent.type(await canvas.findByLabelText("First name"), "Andrea")
    await userEvent.type(canvas.getByLabelText("Email"), "andrea@example.com")
    await userEvent.type(canvas.getByLabelText("Phone"), "9705550123")
    await userEvent.click(canvas.getByRole("checkbox", { name: /I accept the Season Pass terms/ }))
    await userEvent.click(canvas.getByRole("checkbox", { name: "Seasonal tips and offers by email" }))
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))

    await userEvent.click(await canvas.findByRole("button", { name: "Save card and reserve" }))
    await expect(await canvas.findByRole("article", { name: /Season Pass 2027 for Andrea, Erie/ })).toBeInTheDocument()
    await expect(args.onComplete).toHaveBeenCalledTimes(1)
  },
}

export const Phone: Story = {
  args: { initialStep: 2, prefill: answers },
  globals: { viewport: { value: "phone", isRotated: false } },
}

export const PhoneDays: Story = {
  args: { initialStep: 4, prefill: answers },
  globals: { viewport: { value: "phone", isRotated: false } },
}

/** Contact with every error showing at 375px: the sticky bar keeps Continue on screen under the summary. */
export const PhoneContactErrors: Story = {
  args: { initialStep: 5, prefill: { ...answers, firstName: "", email: "", phone: "", termsAccepted: true } },
  globals: { viewport: { value: "phone", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await expect(await canvas.findByRole("alert")).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeVisible()
  },
}

/** The card step at 375px: the summary and Back with room for Stripe's form under it. */
export const PhoneCard: Story = {
  args: { initialStep: 6, prefill: { ...answers, inspection: true } },
  globals: { viewport: { value: "phone", isRotated: false } },
}

export const PhoneDone: Story = {
  args: { initialStep: 7, prefill: { ...answers, days: DAYS, termsAccepted: true, cardSaved: true }, onSaveImage: savePassImage },
  globals: { viewport: { value: "phone", isRotated: false } },
}
