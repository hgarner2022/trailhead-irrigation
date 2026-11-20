import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { SERVICES, type ServiceEntry } from "@/lib/booking/services"
import { FIXTURE_HOME } from "@/lib/places/fixture"
import type { CheckoutState } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { BookingForm, type BookingFormProps } from "./BookingForm"

// The customer's booking form, one story per screen at 375 (Phone) and 1280 (Laptop), over fixtures; nothing is sent. Today is Wednesday, April 14, 2027, so the Season Pass, the repair and
// the request for a quote are the open choices (the turn-on opens Apr 25; "Spring turn-on, 10 zones" stories open it so zones have something to size). The order is Jobber's for the first
// screens: zip code, then services with their lengths, then the address, the service details, the day and an exact start time, then contact with how we reach you (day first, contact after, so an
// abandoned booking leaves nothing), and a confirm step.
const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const

const home: Partial<CheckoutState> = { address: FIXTURE_HOME.label, place: FIXTURE_HOME, town: "Erie" }
const person: Partial<CheckoutState> = { firstName: "Andrea", lastName: "Dalton", email: "andrea.dalton@example.com", phone: "(970) 555-0123", termsAccepted: true }
const details: Partial<CheckoutState> = { ...home, access: "yes", accessNote: "Gate code 4471, the controller is in the garage." }
const full: Partial<CheckoutState> = { ...details, ...person }
const picked = { visit: { day: "2027-04-20", start: "10:30" } }
const photos = [
  { name: "zone-3-head.jpg", src: "/images/sprinkler-spray-head-lawn.jpg" },
  { name: "garden-bed.jpg", src: "/images/micro-spray-garden-bed.jpg" },
]
const open: ServiceEntry[] = SERVICES.map(({ opens: _opens, ...e }) => e as ServiceEntry)
const pass = snapshot.passes[0] as Pass
type Args = Partial<BookingFormProps>

const meta = {
  title: "Customer/Booking form",
  component: BookingForm,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The booking form a customer sees at Book Online, every step at 375 (Phone) and 1280 (Laptop). Click Continue through a Sprinkler repair: zip code 80516, the service, the address, the details (zones, access, a note, photos), a day and an exact start time, then who we reach and how, then Confirm and book. Nothing is kept until the contact step is submitted. Zip 80302 shows the way out; \"Need a quote? Request one\" shows the request path, which has no day. Nothing is sent. The whole clickable customer path is under Customer / Walkthrough (clickable).",
      },
    },
  },
} satisfies Meta<typeof BookingForm>
export default meta
type Story = StoryObj<typeof meta>

// A story that plays a whole path is two: the visible one opens still on its first step; its hidden twin (`!dev`, `!autodocs`: not in the sidebar, still run by `test:stories`) holds the play.
const HIDDEN = ["!dev", "!autodocs"]

const on = (args: Args, name: string, extra: Partial<Story> = {}): { phone: Story; laptop: Story } => ({
  phone: { ...phone, name: `${name}, phone`, args, ...extra },
  laptop: { ...laptop, name: `${name}, laptop`, args, ...extra },
})

/** 1. Zip code, the first question (Jobber starts here too). */
const zip = on({}, "Zip code")
export const ZipPhone: Story = { ...zip.phone, name: "Zip code, phone" }
export const ZipLaptop: Story = { ...zip.laptop, name: "Zip code, laptop" }
/** A zip we serve says so in one green line and Continue goes on. */
const zipServed = on({ initial: { zip: "80516" } }, "Zip code served")
export const ZipServedPhone: Story = { ...zipServed.phone, name: "Zip code served, phone" }
export const ZipServedLaptop: Story = { ...zipServed.laptop, name: "Zip code served, laptop" }
/** A zip we do not serve: the six towns, Call Ryan, and Continue stays off. */
const zipOut = on({ initial: { zip: "80302" } }, "Zip code not served, the way out", {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/We don't serve 80302 yet/)).toBeInTheDocument()
    await expect(canvas.getByRole("link", { name: /Call \(970\) 692-7270/ })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeDisabled()
  },
})
export const ZipNotServedPhone: Story = { ...zipOut.phone, name: "Zip code not served, the way out, phone" }
export const ZipNotServedLaptop: Story = { ...zipOut.laptop, name: "Zip code not served, the way out, laptop" }

/** 2. Services with their lengths: only what we book online; the turn-on and blowout show when they open. */
const services = on({ initial: { step: "service", zip: "80516" } }, "Services")
export const ServicesPhone: Story = { ...services.phone, name: "Services, phone" }
export const ServicesLaptop: Story = { ...services.laptop, name: "Services, laptop" }
/** The repair chosen: Continue is on. */
const serviceChosen = on({ initial: { step: "service", zip: "80516", service: "repair" } }, "Service chosen")
export const ServiceChosenPhone: Story = { ...serviceChosen.phone, name: "Service chosen, phone" }

/** 2b. "Need a quote? Request one": what we quote, with no prices. Same first screens, no day. */
const quote = on({ initial: { step: "quote-service", zip: "80516", quote: true, service: "new-system" } }, "Request a quote, services")
export const QuotePathServicesPhone: Story = { ...quote.phone, name: "Request a quote, services, phone" }
export const QuotePathServicesLaptop: Story = { ...quote.laptop, name: "Request a quote, services, laptop" }

/** 3. The address (type-ahead, "Can't find it? Type your address"). */
const address = on({ initial: { step: "address", zip: "80516", service: "repair" } }, "Address")
export const AddressPhone: Story = { ...address.phone, name: "Address, phone" }
export const AddressLaptop: Story = { ...address.laptop, name: "Address, laptop" }
/** A Boulder address: the out-of-area line, and Continue stays off. */
const outside = on({ initial: { step: "address", zip: "80516", service: "repair" } }, "Address outside the area", {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByRole("combobox", { name: "Street address" }), "1200 Pe")
    await userEvent.click(await canvas.findByRole("option", { name: /Boulder/ }))
    await expect(await canvas.findByText(/We don't serve Boulder yet/)).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeDisabled()
  },
})
export const AddressOutsideAreaPhone: Story = { ...outside.phone, name: "Address outside the area, phone" }
export const AddressOutsideAreaLaptop: Story = { ...outside.laptop, name: "Address outside the area, laptop" }

/** 4. Service details: zones with the price under them as it changes, access, a note for the crew, photos. */
const detailsZones = on({ entries: open, initial: { step: "details", zip: "80516", service: "spring-turn-on", fields: { ...home, zones: 10 } } }, "Service details, zones")
export const DetailsZonesPhone: Story = { ...detailsZones.phone, name: "Service details, zones, phone" }
export const DetailsZonesLaptop: Story = { ...detailsZones.laptop, name: "Service details, zones, laptop" }
/** A repair has no zones; the access answer, a note and two photos are filled in. */
const detailsRepair = on({ initial: { step: "details", zip: "80516", service: "repair", fields: details, photos } }, "Service details, repair with photos")
export const DetailsRepairPhone: Story = { ...detailsRepair.phone, name: "Service details, repair with photos, phone" }
export const DetailsRepairLaptop: Story = { ...detailsRepair.laptop, name: "Service details, repair with photos, laptop" }
/** Continue pressed with the access question unanswered. */
const detailsMissing = on({ initial: { step: "details", zip: "80516", service: "repair", fields: home, attempted: true } }, "Service details, access not answered", {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Tell us whether we can get to the system without you.")).toBeInTheDocument()
  },
})
export const DetailsAccessMissingPhone: Story = { ...detailsMissing.phone, name: "Service details, access not answered, phone" }

/** 4b. The request path's details: what to quote, in their words, and photos. */
const quoteDetails = on({ initial: { step: "details", zip: "80516", quote: true, service: "new-system", fields: { ...home, accessNote: "A new system for the back yard, about a quarter acre." }, photos } }, "Request a quote, tell Ryan about it")
export const QuotePathDetailsPhone: Story = { ...quoteDetails.phone, name: "Request a quote, tell Ryan about it, phone" }
export const QuotePathDetailsLaptop: Story = { ...quoteDetails.laptop, name: "Request a quote, tell Ryan about it, laptop" }

/** 5. Day and exact time: the best day selected ("We're already in Erie that day"), its start times under it, none selected, Continue off. */
const day = on({ initial: { step: "day", zip: "80516", service: "repair", fields: details } }, "Day and time", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radio", { name: /Tuesday, April 20/ })).toBeChecked()
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeDisabled()
  },
})
export const DayPhone: Story = { ...day.phone, name: "Day and time, phone" }
export const DayLaptop: Story = { ...day.laptop, name: "Day and time, laptop" }
/** A time tapped: Continue is on. */
const dayTapped = on({ initial: { step: "day", zip: "80516", service: "repair", fields: details, picks: picked } }, "Day and time, a time tapped")
export const DayTimeTappedPhone: Story = { ...dayTapped.phone, name: "Day and time, a time tapped, phone" }
/** "Show more days" opens the fourth and fifth day. */
const dayMore = on({ initial: { step: "day", zip: "80516", service: "repair", fields: details } }, "Day and time, more days", {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Show more days" }))
    await expect(canvas.getAllByRole("radio", { name: /day, April/ })).toHaveLength(5)
  },
})
export const DayMoreDaysPhone: Story = { ...dayMore.phone, name: "Day and time, more days, phone" }
export const DayMoreDaysLaptop: Story = { ...dayMore.laptop, name: "Day and time, more days, laptop" }
/** No open day in the window: "These days are full. We'll call you to find one." and Continue is on, ending in a call. */
const dayFull = on({ initial: { step: "day", zip: "80516", service: "repair", fields: details }, offersFor: () => [] }, "Day and time, no open day")
export const DayNoOpenDayPhone: Story = { ...dayFull.phone, name: "Day and time, no open day, phone" }
export const DayNoOpenDayLaptop: Story = { ...dayFull.laptop, name: "Day and time, no open day, laptop" }
/** The Season Pass picks a day and a time for each of its two visits. */
const passDays = on({ initial: { step: "day", zip: "80516", service: "season-pass", fields: { ...details, zones: 8 } } }, "Season Pass, two visits")
export const PassDaysPhone: Story = { ...passDays.phone, name: "Season Pass, two visits, phone" }

/** 6. Contact with how we reach you, after the day: four fields, text, email or both, the terms, and the separate unticked marketing box. */
const contact = on({ initial: { step: "contact", zip: "80516", service: "repair", fields: details, picks: picked } }, "Contact")
export const ContactPhone: Story = { ...contact.phone, name: "Contact, phone" }
export const ContactLaptop: Story = { ...contact.laptop, name: "Contact, laptop" }
const contactFilled = on({ initial: { step: "contact", zip: "80516", service: "repair", fields: { ...details, ...person, email: "andrea.dalton@gmail.con", termsAccepted: false }, picks: picked, channel: "both" } }, "Contact filled, a slip in the email")
export const ContactFilledPhone: Story = { ...contactFilled.phone, name: "Contact filled, a slip in the email, phone" }
/** Continue pressed with nothing filled in: each problem is written as help under its field. */
const contactMissing = on({ initial: { step: "contact", zip: "80516", service: "repair", fields: { ...details, firstName: "Andrea", lastName: "Dalton", email: "andrea.dalton@example.com" }, picks: picked, attempted: true } }, "Contact, missing phone and terms", {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Add a phone number so we can text you the day.")).toBeInTheDocument()
    await expect(canvas.getByText("Tick the box to accept the terms.")).toBeInTheDocument()
  },
})
export const ContactMissingPhonePhone: Story = { ...contactMissing.phone, name: "Contact, missing phone and terms, phone" }
export const ContactMissingPhoneLaptop: Story = { ...contactMissing.laptop, name: "Contact, missing phone and terms, laptop" }

/** 6b. The request path ends on contact: no terms line, no confirm, and the button says Send to Ryan. */
const quoteContact = on({ initial: { step: "contact", zip: "80516", quote: true, service: "new-system", fields: { ...home, accessNote: "A new system for the back yard, about a quarter acre." } } }, "Request a quote, contact")
export const QuotePathContactPhone: Story = { ...quoteContact.phone, name: "Request a quote, contact, phone" }
export const QuotePathContactLaptop: Story = { ...quoteContact.laptop, name: "Request a quote, contact, laptop" }

/** 7. Confirm, after contact: every answer with its Change link, and one sentence that says what happens. */
const confirm = on({ initial: { step: "confirm", zip: "80516", service: "repair", fields: full, picks: picked, channel: "text", photos } }, "Confirm", {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("We'll text you a confirmation to (970) 555-0123 and email a receipt when it's done.")).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Confirm and book" })).toBeEnabled()
  },
})
export const ConfirmPhone: Story = { ...confirm.phone, name: "Confirm, phone" }
export const ConfirmLaptop: Story = { ...confirm.laptop, name: "Confirm, laptop" }
const confirmBoth = on({ initial: { step: "confirm", zip: "80516", service: "repair", fields: full, picks: picked, channel: "both" } }, "Confirm, text and email")
export const ConfirmBothPhone: Story = { ...confirmBoth.phone, name: "Confirm, text and email, phone" }

/** 8. Booked: the holographic card with the exact time, "You added 2 photos", what happens next, Add to calendar, your Trailhead account. */
const booked = on({ initial: { step: "done", zip: "80516", service: "repair", fields: full, picks: picked, channel: "text", photos } }, "Booked", {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("You added 2 photos. Ryan sees them before the visit.")).toBeInTheDocument()
    await expect(canvas.getByRole("article", { name: /booked Tuesday, April 20 at 10:30 am/ })).toBeInTheDocument()
    await expect(canvas.getByRole("link", { name: "your Trailhead account" })).toBeInTheDocument()
  },
})
export const BookedPhone: Story = { ...booked.phone, name: "Booked, phone" }
export const BookedLaptop: Story = { ...booked.laptop, name: "Booked, laptop" }
const bookedCall = on({ initial: { step: "done", zip: "80516", service: "repair", fields: full, channel: "text" }, offersFor: () => [] }, "Booked with no open day, Ryan calls")
export const BookedCallPhone: Story = { ...bookedCall.phone, name: "Booked with no open day, Ryan calls, phone" }
const quoteDone = on({ initial: { step: "done", zip: "80516", quote: true, service: "new-system", fields: { ...home, ...person, termsAccepted: false }, photos } }, "Request sent")
export const QuotePathDonePhone: Story = { ...quoteDone.phone, name: "Request sent, phone" }
export const QuotePathDoneLaptop: Story = { ...quoteDone.laptop, name: "Request sent, laptop" }
const passBooked = on({ pass, initial: { step: "done", zip: "80516", service: "season-pass", fields: { ...full, zones: 8 } } }, "Season Pass booked")
export const PassBookedPhone: Story = { ...passBooked.phone, name: "Season Pass booked, phone" }

/** The whole path on a phone, clicked: zip, repair, address, details with the access answer and two sample photos, a time, contact with Text and email, confirm, booked. */
export const WholePathPhone: Story = {
  ...phone,
  name: "Whole path, phone",
}
export const WholePathPhoneTest: Story = {
  ...phone,
  name: "Whole path, phone (test)", tags: HIDDEN,
  play: async ({ canvasElement, userEvent }) => {
    const c = within(canvasElement)
    const next = async (name: string | RegExp = "Continue") => userEvent.click(await c.findByRole("button", { name }))
    await userEvent.type(await c.findByLabelText("Zip code"), "80516")
    await next()
    await userEvent.click(await c.findByRole("radio", { name: /Sprinkler repair/ }))
    await next()
    await userEvent.type(await c.findByRole("combobox", { name: "Street address" }), "123")
    await userEvent.click((await c.findAllByRole("option"))[0]!)
    await next()
    await userEvent.click((await c.findAllByRole("radio", { name: /^Yes/ }))[0]!)
    await userEvent.click(await c.findByRole("button", { name: "Add 2 sample photos" }))
    await next()
    await userEvent.click((await c.findAllByRole("radio", { name: /\d:\d\d [ap]m/ }))[0]!)
    await next()
    await userEvent.type(await c.findByLabelText("First name"), "Andrea")
    await userEvent.type(await c.findByLabelText("Last name"), "Dalton")
    await userEvent.type(await c.findByLabelText("Email"), "andrea.dalton@example.com")
    await userEvent.type(await c.findByLabelText("Phone"), "9705550123")
    await userEvent.click(await c.findByRole("radio", { name: "Text and email" }))
    await userEvent.click(await c.findByRole("checkbox", { name: /I accept the/ }))
    await expect(c.getByRole("checkbox", { name: "Send me tips and offers from Trailhead by email" })).not.toBeChecked()
    await next()
    await expect(await c.findByText(/We'll text a confirmation to \(970\) 555-0123 and email one to/)).toBeInTheDocument()
    await next("Confirm and book")
    await expect(await c.findByText("You added 2 photos. Ryan sees them before the visit.")).toBeInTheDocument()
  },
}

/** The request path on a phone, clicked: zip, what we quote, address, tell Ryan, contact, Send to Ryan. It has no day, no card and no confirm, and ends "Thanks, Ryan will call you by tomorrow." */
export const QuotePathPhone: Story = {
  ...phone,
  name: "Request a quote path, phone",
}
export const QuotePathPhoneTest: Story = {
  ...phone,
  name: "Request a quote path, phone (test)", tags: HIDDEN,
  play: async ({ canvasElement, userEvent }) => {
    const c = within(canvasElement)
    const next = async (name: string | RegExp = "Continue") => userEvent.click(await c.findByRole("button", { name }))
    await userEvent.type(await c.findByLabelText("Zip code"), "80516")
    await next()
    await userEvent.click(await c.findByRole("button", { name: "Need a quote? Request one" }))
    await userEvent.click(await c.findByRole("radio", { name: /New sprinkler system/ }))
    await next()
    await userEvent.type(await c.findByRole("combobox", { name: "Street address" }), "123")
    await userEvent.click((await c.findAllByRole("option"))[0]!)
    await next()
    await next()
    await userEvent.type(await c.findByLabelText("First name"), "Andrea")
    await userEvent.type(await c.findByLabelText("Last name"), "Dalton")
    await userEvent.type(await c.findByLabelText("Email"), "andrea.dalton@example.com")
    await userEvent.type(await c.findByLabelText("Phone"), "9705550123")
    await next("Send to Ryan")
    await expect(await c.findByText("Thanks, Ryan will call you by tomorrow.")).toBeInTheDocument()
  },
}
