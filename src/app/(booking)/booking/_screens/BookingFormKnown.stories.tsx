import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, waitFor, within } from "storybook/test"
import { FIXTURE_HOME, FIXTURE_PLACES } from "@/lib/places/fixture"
import type { CheckoutState } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { BookingForm } from "./BookingForm"

// A CUSTOMER WE KNOW (Hannah, Nov 25 2026: "I also don't see the experience for a customer we know"). A repeat customer is recognised by the ADDRESS alone: no sign-in, no code. The three stories
// below run the whole booking, step by step at 375 and 1280, for the three people who can meet the form at an address Trailhead already holds, or not.
//
// 1. SAME EMAIL, the fast path. The customer sees: the picked address with an "On file" mark (nothing about who); the zones and the access answer already filled in from the yard, each with "On file", so Details
//    is one tap; on the contact step, once the email they type is the one on file, their name and phone fill in (with one small settle) so nothing is retyped; "Use the card on file" with its brand and last
//    four; Review marks the address "On file". The office sees: a booking linked to the existing customer and property, no duplicate, nothing to check.
// 2. DIFFERENT EMAIL, a new person at a known property. The customer sees: the same "On file" address and the same prefilled yard facts, but nothing fills in on the contact step and no card is offered:
//    the card step asks for a card as for a new customer. The office sees: the booking at the same property with the note "Email differs from the one on file" (Admin / Requests, "New, address on file, another email").
// 3. NEW ADDRESS. The customer sees: no mark, nothing filled in, "New" on Review. The office sees: a new customer and a new property.
//
// Never shown back, in any of them: a gate code, an access note, a card number beyond its brand and last four, or anything personal before the email is confirmed. Nothing is sent.
const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const
const HIDDEN = ["!dev", "!autodocs"]

const known: Partial<CheckoutState> = { address: FIXTURE_PLACES[1]!.label, place: FIXTURE_PLACES[1]!, town: "Erie" }
const fresh: Partial<CheckoutState> = { address: FIXTURE_HOME.label, place: FIXTURE_HOME, town: "Erie" }
const SAME = "andrea.dalton@example.com"
const OTHER = "jordan.lee@example.com"
// the yard as the booking holds it after Continue on the address: zones and access from the property
const yard: Partial<CheckoutState> = { zones: 10, access: "yes" }
const picked = { visit: { day: "2027-04-19", start: "10:30" } }

const meta = {
  title: "Customer/A customer we know",
  component: BookingForm,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A repeat customer is recognised by the address alone: no sign-in, no code. Three people, each as a whole booking at 375 and 1280: the same email (the fast path: the address marked On file, the yard already filled in, the name and phone filled in once the email matches, the card on file), a different email at a known address (a new person at a known property: nothing fills in, a card is asked, the office is told Email differs from the one on file), and a new address. Never shown back: a gate code, an access note, a card number beyond its brand and last four, anything personal before the email is confirmed.",
      },
    },
  },
  args: { onBooked: fn() },
} satisfies Meta<typeof BookingForm>
export default meta
type Story = StoryObj<typeof meta>

const on = (args: Story["args"], name: string, extra: Partial<Story> = {}): { phone: Story; laptop: Story } => ({
  phone: { ...phone, name: `${name}, phone`, args, ...extra },
  laptop: { ...laptop, name: `${name}, laptop`, args, ...extra },
})

// ------------------------------------------------------------------------------------------------ 1. same email
/** 1a. The address is a property we hold: it is marked On file, and nothing about the customer shows. */
const sameAddress = on({ initial: { step: "address", fields: known } }, "Same email, 1 Address", {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("On file")).toBeInTheDocument()
    await expect(canvas.queryByText(/Andrea|Dalton|4242|\(970\)/)).toBeNull()
  },
})
export const SameEmailAddressPhone: Story = { ...sameAddress.phone }
export const SameEmailAddressLaptop: Story = { ...sameAddress.laptop }
/** 1b. Details: the zones and the access answer are already filled in from the yard, each marked On file. The customer confirms and goes on. */
const sameDetails = on({ initial: { step: "details", service: "spring-turn-on", fields: { ...known, ...yard } } }, "Same email, 2 Details", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "10 zones" })).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getAllByText("On file")).toHaveLength(2)
    await expect(canvas.getByRole("radio", { name: /^Yes/ })).toBeChecked()
    await expect(canvas.queryByText(/gate|code 4471/i)).toBeNull()
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeEnabled()
  },
})
export const SameEmailDetailsPhone: Story = { ...sameDetails.phone }
export const SameEmailDetailsLaptop: Story = { ...sameDetails.laptop }
/** 1c. Contact: only the email is typed; the name and phone fill in once it is the one on file, and settle in once. */
const sameContact = on({ initial: { step: "contact", service: "repair", fields: { ...known, ...yard, email: SAME }, picks: picked } }, "Same email, 3 Contact", {
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByLabelText("First name")).toHaveValue("Andrea"))
    await expect(canvas.getByLabelText("Last name")).toHaveValue("Dalton")
    await expect(canvas.getByLabelText("Phone")).toHaveValue("(970) 555-0123")
  },
})
export const SameEmailContactPhone: Story = { ...sameContact.phone }
export const SameEmailContactLaptop: Story = { ...sameContact.laptop }
/** 1d. Card: the card on file, with its brand and last four, is offered. */
const sameCard = on({ initial: { step: "card", service: "repair", fields: { ...known, ...yard, email: SAME, firstName: "Andrea", lastName: "Dalton", phone: "(970) 555-0123" }, picks: picked } }, "Same email, 4 Card", {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Use the card on file")).toBeInTheDocument()
    await expect(canvas.getByText("Visa ending 4242")).toBeInTheDocument()
  },
})
export const SameEmailCardPhone: Story = { ...sameCard.phone }
export const SameEmailCardLaptop: Story = { ...sameCard.laptop }
/** 1e. Review: the address is marked On file and the card on file is named. */
const sameReview = on({ initial: { step: "confirm", service: "repair", fields: { ...known, ...yard, email: SAME, firstName: "Andrea", lastName: "Dalton", phone: "(970) 555-0123", termsAccepted: true }, picks: picked, card: "file" } }, "Same email, 5 Review", {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("On file")).toBeInTheDocument()
    await expect(canvas.getByText("Visa ending 4242")).toBeInTheDocument()
  },
})
export const SameEmailReviewPhone: Story = { ...sameReview.phone }
export const SameEmailReviewLaptop: Story = { ...sameReview.laptop }

// ------------------------------------------------------------------------------------------------ 2. different email
/** 2a. The same known address: marked On file, the yard filled in, exactly as for the same email. */
const otherDetails = on({ initial: { step: "details", service: "spring-turn-on", fields: { ...known, ...yard } } }, "Different email, 1 Details")
export const DifferentEmailDetailsPhone: Story = { ...otherDetails.phone }
export const DifferentEmailDetailsLaptop: Story = { ...otherDetails.laptop }
/** 2b. Contact: a different email, so nothing fills in. */
const otherContact = on({ initial: { step: "contact", service: "repair", fields: { ...known, ...yard, email: OTHER }, picks: picked } }, "Different email, 2 Contact", {
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("First name")).toHaveValue("")
    await expect(canvas.getByLabelText("Phone")).toHaveValue("")
  },
})
export const DifferentEmailContactPhone: Story = { ...otherContact.phone }
export const DifferentEmailContactLaptop: Story = { ...otherContact.laptop }
/** 2c. Card: the card on file is not offered; the step asks for a card as for a new customer. */
const otherCard = on({ initial: { step: "card", service: "repair", fields: { ...known, ...yard, email: OTHER, firstName: "Jordan", lastName: "Lee", phone: "(970) 555-0166" }, picks: picked } }, "Different email, 3 Card", {
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/Use the card on file|4242/)).toBeNull()
    await expect(canvas.getByText("Card information")).toBeInTheDocument()
  },
})
export const DifferentEmailCardPhone: Story = { ...otherCard.phone }
export const DifferentEmailCardLaptop: Story = { ...otherCard.laptop }
/** 2d. Review: still On file, a new card. The office sees "Email differs from the one on file" (Admin / Requests). */
const otherReview = on({ initial: { step: "confirm", service: "repair", fields: { ...known, ...yard, email: OTHER, firstName: "Jordan", lastName: "Lee", phone: "(970) 555-0166", termsAccepted: true }, picks: picked, card: "saved" } }, "Different email, 4 Review")
export const DifferentEmailReviewPhone: Story = { ...otherReview.phone }
export const DifferentEmailReviewLaptop: Story = { ...otherReview.laptop }

// ------------------------------------------------------------------------------------------------ 3. new address
/** 3a. A new address: no mark. */
const newAddress = on({ initial: { step: "address", fields: fresh } }, "New address, 1 Address", {
  play: async ({ canvas }) => {
    await expect(canvas.queryByText("On file")).toBeNull()
  },
})
export const NewAddressAddressPhone: Story = { ...newAddress.phone }
export const NewAddressAddressLaptop: Story = { ...newAddress.laptop }
/** 3b. Details: nothing filled in, the access question waits to be answered. */
const newDetails = on({ initial: { step: "details", service: "spring-turn-on", fields: fresh } }, "New address, 2 Details", {
  play: async ({ canvas }) => {
    await expect(canvas.queryByText("On file")).toBeNull()
    await expect(canvas.getByRole("radio", { name: /^Yes/ })).not.toBeChecked()
  },
})
export const NewAddressDetailsPhone: Story = { ...newDetails.phone }
export const NewAddressDetailsLaptop: Story = { ...newDetails.laptop }
/** 3c. Review: the address reads New. The office sees a new customer and a new property. */
const newReview = on({ initial: { step: "confirm", service: "repair", fields: { ...fresh, access: "yes", email: SAME, firstName: "Andrea", lastName: "Dalton", phone: "(970) 555-0123", termsAccepted: true }, picks: picked, card: "saved" } }, "New address, 3 Review", {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("New")).toBeInTheDocument()
    await expect(canvas.queryByText("On file")).toBeNull()
  },
})
export const NewAddressReviewPhone: Story = { ...newReview.phone }
export const NewAddressReviewLaptop: Story = { ...newReview.laptop }

// ------------------------------------------------------------------------------------------------ the whole booking, clicked
const choose = async (c: ReturnType<typeof within>, user: { click: (e: Element) => Promise<void> }, name: RegExp, label: string) => {
  await user.click(await c.findByRole("button", { name }))
  await user.click(await c.findByRole("button", { name: label }))
}

/** The whole booking as the SAME-EMAIL customer, clicked: address (On file), the repair card, Details (access already answered), the soonest time, only the email typed, the card on file, Review, booked. */
export const WholeBookingSameEmailPhone: Story = { ...phone, name: "Same email, whole booking, phone" }
export const WholeBookingSameEmailTest: Story = {
  ...phone,
  name: "Same email, whole booking (test)",
  tags: HIDDEN,
  play: async ({ canvasElement, userEvent, args }) => {
    const c = within(canvasElement)
    const next = async (name: string | RegExp = "Continue") => userEvent.click(await c.findByRole("button", { name }))
    await userEvent.type(await c.findByRole("combobox", { name: "Street address" }), "480 Br")
    await userEvent.click(await c.findByRole("option", { name: /480 Briggs/ }))
    await expect(await c.findByText("On file")).toBeInTheDocument()
    await next()
    await choose(c, userEvent, /^Sprinkler repair/, "Choose this service")
    await next()
    // the access answer is already there, marked On file: one tap on Continue
    await expect(await c.findByRole("radio", { name: /^Yes/ })).toBeChecked()
    await next()
    await userEvent.click((await c.findAllByRole("radio", { name: /\d:\d\d [ap]m/ }))[0]!)
    await next()
    await userEvent.type(await c.findByLabelText("Email"), SAME)
    await waitFor(() => expect(c.getByLabelText("First name")).toHaveValue("Andrea"))
    await expect(c.getByLabelText("Phone")).toHaveValue("(970) 555-0123")
    await next()
    await expect(await c.findByText("Visa ending 4242")).toBeInTheDocument()
    await next()
    await expect(await c.findByText("On file")).toBeInTheDocument()
    await next("Confirm and book")
    await expect(await c.findByRole("article", { name: /booked/ })).toBeInTheDocument()
    await waitFor(() => expect(args.onBooked).toHaveBeenCalledWith(expect.objectContaining({ onFile: true, emailDiffers: false, card: "Visa ending 4242" })))
  },
}
/** The whole booking as the DIFFERENT-EMAIL customer: the same known address and yard, nothing filled in on contact, a card asked, and the booking tells the office the email differs. */
export const WholeBookingDifferentEmailPhone: Story = { ...phone, name: "Different email, whole booking, phone" }
export const WholeBookingDifferentEmailTest: Story = {
  ...phone,
  name: "Different email, whole booking (test)",
  tags: HIDDEN,
  play: async ({ canvasElement, userEvent, args }) => {
    const c = within(canvasElement)
    const next = async (name: string | RegExp = "Continue") => userEvent.click(await c.findByRole("button", { name }))
    await userEvent.type(await c.findByRole("combobox", { name: "Street address" }), "480 Br")
    await userEvent.click(await c.findByRole("option", { name: /480 Briggs/ }))
    await next()
    await choose(c, userEvent, /^Sprinkler repair/, "Choose this service")
    await next()
    await next()
    await userEvent.click((await c.findAllByRole("radio", { name: /\d:\d\d [ap]m/ }))[0]!)
    await next()
    await userEvent.type(await c.findByLabelText("Email"), OTHER)
    await expect(c.getByLabelText("First name")).toHaveValue("")
    await userEvent.type(c.getByLabelText("First name"), "Jordan")
    await userEvent.type(c.getByLabelText("Last name"), "Lee")
    await userEvent.type(c.getByLabelText("Phone"), "9705550166")
    await next()
    await expect(await c.findByText("Card information")).toBeInTheDocument()
    await expect(c.queryByText(/4242/)).toBeNull()
    await next("Save card")
    await next("Confirm and book")
    await waitFor(() => expect(args.onBooked).toHaveBeenCalledWith(expect.objectContaining({ onFile: true, emailDiffers: true })))
  },
}
