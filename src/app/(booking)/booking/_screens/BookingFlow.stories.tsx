import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { SERVICES, type ServiceEntry } from "@/lib/booking/services"
import { FIXTURE_HOME } from "@/lib/places/fixture"
import type { CheckoutState } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { BookingFlow } from "./BookingFlow"

// The booking flow, one story per screen at 375 and 1280, on fixtures; nothing is sent. Today is Wednesday, April 14, 2027, so the Season Pass, the repair and the quote request are the
// open choices (the turn-on opens Apr 25). The repair is the main path: Service, Address, Day and time, Contact, Card, Done. A service we quote is not in the list; "Need a quote? Request
// one" starts a short path of its own (the Request* stories) that ends with no day and no card.
const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const

const home: Partial<CheckoutState> = { address: FIXTURE_HOME.label, place: FIXTURE_HOME, town: "Erie", access: "yes", accessNote: "Gate code 4471, controller in the garage." }
const person: Partial<CheckoutState> = { firstName: "Andrea", lastName: "Anderson", email: "andrea@example.com", phone: "(970) 555-0123" }
const picked = { visit: { day: "2027-04-20", start: "10:30" } }
const open: ServiceEntry[] = SERVICES.map(({ opens: _o, ...e }) => e as ServiceEntry)
const pass = snapshot.passes[0] as Pass

const meta = { title: "Screens/Booking", component: BookingFlow, parameters: { layout: "fullscreen" } } satisfies Meta<typeof BookingFlow>
export default meta
type Story = StoryObj<typeof meta>

/** 1. The service picker: only what we book, the Season Pass first, the turn-on and blowout shown with their opening day, and one link to request a quote. */
export const ServiceLaptop: Story = { ...laptop }
export const ServicePhone: Story = { ...phone }
/** A deep link (`/booking?service=repair`) preselects the repair; Continue is on. */
export const ServiceDeepLinkPhone: Story = { ...phone, args: { initial: { service: "repair" } } }

/** 2. Zones, only when the price depends on them (the turn-on here). */
export const ZonesLaptop: Story = { ...laptop, args: { entries: open, initial: { step: "zones", service: "spring-turn-on", fields: { zones: 10 } } } }
export const ZonesPhone: Story = { ...phone, args: { entries: open, initial: { step: "zones", service: "spring-turn-on", fields: { zones: 10 } } } }

/** 3. Address: the type-ahead box and "Can't find it? Type your address". */
export const AddressLaptop: Story = { ...laptop, args: { initial: { step: "address", service: "repair" } } }
export const AddressPhone: Story = { ...phone, args: { initial: { step: "address", service: "repair" } } }
/** A Boulder address: the out-of-area line and Continue stays off. */
export const AddressOutOfAreaPhone: Story = {
  ...phone,
  args: { initial: { step: "address", service: "repair" } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByRole("combobox", { name: "Street address" }), "1200 Pe")
    await userEvent.click(await canvas.findByRole("option", { name: /Boulder/ }))
    await expect(await canvas.findByText(/We don't serve Boulder yet/)).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeDisabled()
  },
}

/** 4. Day and time: the best day selected ("We're already in Erie that day"), its times under it, the best marked "Best fit", no time selected, Continue off. */
export const DayLaptop: Story = {
  ...laptop,
  args: { initial: { step: "day", service: "repair", fields: home } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radio", { name: /Tuesday, April 20/ })).toBeChecked()
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeDisabled()
  },
}
export const DayPhone: Story = { ...phone, args: { initial: { step: "day", service: "repair", fields: home } } }
/** A time tapped: Continue is on and the summary line over the next step will carry it. */
export const DayTimeTappedPhone: Story = { ...phone, args: { initial: { step: "day", service: "repair", fields: home, picks: picked } } }
/** "Show more days" opens the fourth and fifth day. */
export const DayMoreDaysLaptop: Story = {
  ...laptop,
  args: { initial: { step: "day", service: "repair", fields: home } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Show more days" }))
    await expect(canvas.getAllByRole("radio", { name: /day, April/ })).toHaveLength(5)
  },
}
/** Nothing open in the window: "These days are full. We'll call you to find one." and Continue is on; the job is made for a call. */
export const DaysFullPhone: Story = { ...phone, args: { initial: { step: "day", service: "repair", fields: home }, offersFor: () => [] } }
export const DaysFullLaptop: Story = { ...laptop, args: { initial: { step: "day", service: "repair", fields: home }, offersFor: () => [] } }

/** 5. Contact: four fields and the booking terms. */
export const ContactLaptop: Story = { ...laptop, args: { initial: { step: "contact", service: "repair", fields: home, picks: picked } } }
export const ContactPhone: Story = { ...phone, args: { initial: { step: "contact", service: "repair", fields: { ...home, email: "andrea@gmail.con" }, picks: picked } } }
/** Continue pressed with nothing filled in: each problem sits by its field. */
export const ContactProblemsPhone: Story = {
  ...phone,
  args: { initial: { step: "contact", service: "repair", fields: home, picks: picked } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
  },
}

/** 6. Card: what is charged and when, Stripe's form described, "Pay another way after the visit". */
export const CardLaptop: Story = { ...laptop, args: { initial: { step: "card", service: "repair", fields: { ...home, ...person, termsAccepted: true }, picks: picked } } }
export const CardPhone: Story = { ...phone, args: { initial: { step: "card", service: "repair", fields: { ...home, ...person, termsAccepted: true }, picks: picked } } }
export const CardRefusedPhone: Story = { ...phone, args: { initial: { step: "card", service: "repair", fields: { ...home, ...person, termsAccepted: true }, picks: picked }, cardFailure: "Try another card, or call Ryan at (970) 692-7270." } }

/** 7. Done: the booked card with the day and the time, what happens next, Add to calendar, the way into the account. */
export const DoneLaptop: Story = { ...laptop, args: { initial: { step: "done", service: "repair", fields: { ...home, ...person }, picks: picked } } }
export const DonePhone: Story = { ...phone, args: { initial: { step: "done", service: "repair", fields: { ...home, ...person }, picks: picked } } }

/** The Season Pass: a day and time for each of its two visits (the same picker twice). */
export const PassDaysLaptop: Story = { ...laptop, args: { initial: { step: "day", service: "season-pass", fields: { ...home, zones: 8 } } } }
export const PassDaysPhone: Story = { ...phone, args: { initial: { step: "day", service: "season-pass", fields: { ...home, zones: 8 } } } }
export const PassDonePhone: Story = { ...phone, args: { pass, initial: { step: "done", service: "season-pass", fields: { ...home, ...person } } } }

/** Request a quote: "Need a quote? Request one" opens this list of what we quote (no prices, no days). */
export const RequestServicePhone: Story = {
  ...phone,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Need a quote? Request one" }))
    await expect(await canvas.findByRole("heading", { level: 1 })).toHaveTextContent("What do you need a quote for?")
  },
}
export const RequestServiceLaptop: Story = { ...laptop, args: { initial: { quote: true, step: "quote-service", service: "new-system" } } }
export const RequestAddressPhone: Story = { ...phone, args: { initial: { quote: true, step: "address", service: "new-system" } } }
export const RequestAddressLaptop: Story = { ...laptop, args: { initial: { quote: true, step: "address", service: "new-system", fields: home } } }
/** A few words and photos, both optional. */
export const RequestDetailsPhone: Story = { ...phone, args: { initial: { quote: true, step: "details", service: "new-system", fields: home, details: "A new system for the back yard, about a quarter acre." } } }
export const RequestDetailsLaptop: Story = { ...laptop, args: { initial: { quote: true, step: "details", service: "new-system", fields: home } } }
/** Contact on the request path: no terms box, and the button says Send to Ryan. */
export const RequestContactPhone: Story = { ...phone, args: { initial: { quote: true, step: "contact", service: "new-system", fields: { ...home, ...person } } } }
export const RequestContactLaptop: Story = { ...laptop, args: { initial: { quote: true, step: "contact", service: "new-system", fields: { ...home, ...person } } } }
/** "Thanks, Ryan will call you by tomorrow." No day, no card. */
export const RequestDonePhone: Story = { ...phone, args: { initial: { quote: true, step: "done", service: "new-system", fields: { ...home, ...person } } } }
export const RequestDoneLaptop: Story = { ...laptop, args: { initial: { quote: true, step: "done", service: "new-system", fields: { ...home, ...person } } } }
