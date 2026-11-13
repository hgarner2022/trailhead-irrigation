import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn } from "storybook/test"
import { savePassImage } from "@/lib/pass-card-image"
import { FIXTURE_HOME } from "@/lib/places/fixture"
import { CheckoutFlow } from "./CheckoutFlow"
import type { CheckoutFields } from "./checkout-state"

// The step stories open on one step with the earlier answers prefilled;
// Walkthrough answers every question from the first screen, including the
// consent boxes, and lands on the pass card. The timing step opens with both
// recommendations preselected, so it needs nothing prefilled.
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

/** A Boulder address picked: the out-of-area line and Continue off. */
export const AddressOutOfArea: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByRole("combobox", { name: "Street address" }), "1200 Pe")
    await userEvent.click(await canvas.findByRole("option", { name: /Boulder/ }))
    await expect(await canvas.findByText(/We don't serve Boulder yet/)).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeDisabled()
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

/** Both questions on one screen, the recommendation preselected for each. */
export const Timing: Story = {
  args: { initialStep: 4, prefill: { ...answers, turnOnPreference: "recommended" } },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const Contact: Story = {
  args: { initialStep: 5, prefill: { ...answers, firstName: "", email: "", phone: "" } },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** The consent boxes under the card form: the terms unticked, so the button waits. */
export const Card: Story = {
  args: { initialStep: 6, prefill: answers },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** Enter pressed with the terms still unticked: the line under the box says what is missing. */
export const CardTermsMissing: Story = {
  args: { initialStep: 6, prefill: answers },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("button", { name: "Save card and reserve" })
    await userEvent.keyboard("{Enter}")
    await expect(await canvas.findByText("Please accept the terms to continue")).toBeInTheDocument()
  },
}

/** Wired, before the terms: the card form waits behind the boxes (no key reaches Stripe.js, so nothing loads). */
export const CardTermsFirst: Story = {
  args: { initialStep: 6, prefill: { ...answers, termsAccepted: false, passId: "p-story", sessionId: "cs_story", clientSecret: "cs_story_secret" }, stripeKey: "pk_test_story", onBegin: fn(), onFinish: fn() },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Accept the terms above and the card form opens here/)).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Save card and reserve" })).toBeNull()
  },
}

/** The server refused the contact step: the message sits under the answers and the step stays. */
export const ContactRefused: Story = {
  args: {
    initialStep: 5,
    prefill: answers,
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

export const Done: Story = {
  args: { initialStep: 7, prefill: { ...answers, termsAccepted: true, marketingEmail: true, marketingSms: true, cardSaved: true }, onSaveImage: savePassImage },
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

    await expect(await canvas.findByRole("button", { name: "Recommended Mid May", pressed: true })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Later Late October" }))
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))

    await userEvent.type(await canvas.findByLabelText("First name"), "Andrea")
    await userEvent.type(canvas.getByLabelText("Email"), "andrea@example.com")
    await userEvent.type(canvas.getByLabelText("Phone"), "9705550123")
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))

    const save = await canvas.findByRole("button", { name: "Save card and reserve" })
    await expect(save).toBeDisabled()
    await userEvent.click(canvas.getByRole("checkbox", { name: /I accept the Season Pass terms/ }))
    await userEvent.click(canvas.getByRole("checkbox", { name: "Seasonal tips and offers by email" }))
    await userEvent.click(save)
    await expect(await canvas.findByRole("article", { name: "Season Pass 2027 for Andrea, Erie, turn-on preferred mid May, blowout preferred late October" })).toBeInTheDocument()
    await expect(args.onComplete).toHaveBeenCalledTimes(1)
  },
}

export const Phone: Story = {
  args: { initialStep: 2, prefill: answers },
  globals: { viewport: { value: "phone", isRotated: false } },
}

export const PhoneTiming: Story = {
  args: { initialStep: 4, prefill: answers },
  globals: { viewport: { value: "phone", isRotated: false } },
}

export const PhoneDone: Story = {
  args: { initialStep: 7, prefill: { ...answers, termsAccepted: true, cardSaved: true }, onSaveImage: savePassImage },
  globals: { viewport: { value: "phone", isRotated: false } },
}
