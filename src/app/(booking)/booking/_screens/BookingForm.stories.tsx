import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, waitFor, within } from "storybook/test"
import { SERVICES, type ServiceEntry } from "@/lib/booking/services"
import { typedPlace } from "@/lib/places"
import { FIXTURE_HOME, FIXTURE_PLACES } from "@/lib/places/fixture"
import type { CheckoutState } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { BookingForm, type BookingFormProps } from "./BookingForm"

// The customer's booking form, one story per screen at 375 (Phone) and 1280 (Laptop), over fixtures; nothing is sent. Today is Wednesday, April 14, 2027, so the Season Pass, the repair and
// the request for a quote are the open choices (the turn-on opens Apr 25; "Spring turn-on, 10 zones" stories open it so zones have something to size). The order: the address first (it qualifies the
// area, Hannah, Nov 20 2026: no zip step), then services with their lengths, the service details, the day and an exact start time, then contact with how we reach you (day first, contact after, so an
// abandoned booking leaves nothing), a card (Stripe's setup form, drawn) and a confirm step: seven counted steps, four for a request for a quote.
const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const

const home: Partial<CheckoutState> = { address: FIXTURE_HOME.label, place: FIXTURE_HOME, town: "Erie" }
const person: Partial<CheckoutState> = { firstName: "Andrea", lastName: "Dalton", email: "andrea.dalton@example.com", phone: "(970) 555-0123", termsAccepted: true }
const boulder: Partial<CheckoutState> = { address: FIXTURE_PLACES[9]!.label, place: FIXTURE_PLACES[9]! }
const typed: Partial<CheckoutState> = { address: "9 Cottonwood Ln", place: typedPlace("9 Cottonwood Ln", "Lafayette", "80026"), town: "Lafayette" }
// A typed address with no city yet: the same shape the typed fields hand the step, with no city.
const noCity: Partial<CheckoutState> = { address: "9 Cottonwood Ln", place: { id: "typed:9 cottonwood ln||", label: "9 Cottonwood Ln", line1: "9 Cottonwood Ln", town: "", state: "CO", zip: "" } }
const details: Partial<CheckoutState> = { ...home, access: "yes", accessNote: "Gate code 4471, the controller is in the garage." }
const full: Partial<CheckoutState> = { ...details, ...person }
const picked = { visit: { day: "2027-04-20", start: "10:30" } }
const photos = [
  { name: "zone-3-head.jpg", src: "/images/sprinkler-spray-head-lawn.jpg" },
  { name: "garden-bed.jpg", src: "/images/micro-spray-garden-bed.jpg" },
]
const open: ServiceEntry[] = SERVICES.map(({ opens: _opens, ...e }) => e as ServiceEntry)
type Args = Partial<BookingFormProps>

const meta = {
  title: "Customer/Booking form",
  component: BookingForm,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The booking form a customer sees at Book Online, every step at 375 (Phone) and 1280 (Laptop). Click Continue through a Sprinkler repair: the address (one box; the city and zip come from it; one outside the six cities shows the way out at once), the service, the details (zones, access, the questions that belong to the service, a note, photos), a day and an exact start time, then who we reach and how, then a card (Stripe's form, drawn; \"Not now\" for a one-off), then Confirm and book, where each answer has its Change link. Nothing is kept until the contact step is submitted. Close (top right) leaves, and asks first only once something is entered; the browser's Back button goes to the previous step. \"Need a quote? Request one\" lists what we do not book online (Christmas lights, larger repairs) and has no day. Nothing is sent. The whole clickable customer path is under Customer / Walkthrough (clickable).",
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

/** 1. The address, the first question: one box with type-ahead and a plain "Type it instead" link under it, and nothing else until it is needed. The city and zip come from the address picked, so there is no zip step. */
const address = on({}, "Address")
export const AddressPhone: Story = { ...address.phone, name: "Address, phone" }
export const AddressLaptop: Story = { ...address.laptop, name: "Address, laptop" }
/** A picked address in the six cities: Continue goes on. */
const addressPicked = on({ initial: { fields: home } }, "Address picked")
export const AddressPickedPhone: Story = { ...addressPicked.phone, name: "Address picked, phone" }
export const AddressPickedLaptop: Story = { ...addressPicked.laptop, name: "Address picked, laptop" }
/** A Boulder address: the "we don't come to you yet" line under the box with the six cities and Ryan's number, and Continue stays off. */
const outsideAddress = on({ initial: { fields: boulder } }, "Address outside the area")
export const AddressOutsideAreaPhone: Story = { ...outsideAddress.phone, name: "Address outside the area, phone" }
export const AddressOutsideAreaLaptop: Story = { ...outsideAddress.laptop, name: "Address outside the area, laptop" }
export const AddressOutsideAreaTest: Story = {
  ...phone,
  name: "Address outside the area (test)",
  tags: HIDDEN,
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByRole("combobox", { name: "Street address" }), "1200 Pe")
    await userEvent.click(await canvas.findByRole("option", { name: /Boulder/ }))
    await expect(await canvas.findByText(/We don't serve Boulder yet/)).toBeInTheDocument()
    await expect(canvas.getByRole("link", { name: /\(970\) 692-7270/ })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeDisabled()
  },
}
/** "Type it instead": Street, City and ZIP, filled in. They work with no lookup at all. */
const addressTyped = on({ initial: { fields: typed } }, "Address typed")
export const AddressTypedPhone: Story = { ...addressTyped.phone, name: "Address typed, phone" }
export const AddressTypedLaptop: Story = { ...addressTyped.laptop, name: "Address typed, laptop" }
export const AddressTypedTest: Story = {
  ...phone,
  name: "Address typed (test)",
  tags: HIDDEN,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.queryByLabelText("City")).toBeNull()
    await userEvent.click(await canvas.findByRole("button", { name: "Type it instead" }))
    await userEvent.type(await canvas.findByLabelText("Street address"), "9 Cottonwood Ln")
    await userEvent.type(canvas.getByLabelText("City"), "Lafayette")
    await expect(canvas.getByLabelText("ZIP (optional)")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await expect(await canvas.findByRole("radio", { name: /Sprinkler repair/ })).toBeInTheDocument()
  },
}
/** A typed city outside the six: the same line as a picked one, with the six cities and Ryan's number, and Continue stays off. */
export const AddressTypedOutsideTest: Story = {
  ...phone,
  name: "Address typed outside the area (test)",
  tags: HIDDEN,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Type it instead" }))
    await userEvent.type(await canvas.findByLabelText("Street address"), "1200 Pearl St")
    await userEvent.type(canvas.getByLabelText("City"), "Boulder")
    await userEvent.tab()
    await expect(await canvas.findByText(/We don't serve Boulder yet/)).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeDisabled()
  },
}
/** An address with no city we can read asks for the city, in the words beside the field, instead of turning the customer away. */
const cityMissing = on({ initial: { fields: noCity, attempted: true } }, "Address, city missing")
export const AddressCityMissingPhone: Story = { ...cityMissing.phone, name: "Address, city missing, phone" }
export const AddressCityMissingLaptop: Story = { ...cityMissing.laptop, name: "Address, city missing, laptop" }
export const AddressCityMissingTest: Story = {
  ...phone,
  name: "Address, city missing (test)",
  tags: HIDDEN,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Type it instead" }))
    await userEvent.type(await canvas.findByLabelText("Street address"), "9 Cottonwood Ln")
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await expect((await canvas.findAllByText("Add your city.")).length).toBe(2)
    await expect(canvas.getByLabelText("City")).toHaveFocus()
  },
}
/** A pick the lookup could not give a city for opens the typed fields with the street filled in and the city asked for. */
export const AddressNoCityPickTest: Story = {
  ...phone,
  name: "Address, a pick with no city (test)",
  tags: HIDDEN,
  args: { places: async () => [{ id: "rural-1", label: "9 Cottonwood Ln", line1: "9 Cottonwood Ln", town: "", state: "CO", zip: "" }] },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByRole("combobox", { name: "Street address" }), "9 Cot")
    await userEvent.click(await canvas.findByRole("option", { name: /Cottonwood/ }))
    await waitFor(() => expect(canvas.getByLabelText("City")).toHaveFocus())
    await expect(canvas.getByLabelText("Street address")).toHaveValue("9 Cottonwood Ln")
    await expect(canvas.getByText("Add your city.")).toBeInTheDocument()
  },
}

/** 2. Services with their lengths: only what we book online, after the address has qualified the area; the turn-on and blowout show when they open. */
const services = on({ initial: { step: "service", fields: home } }, "Services")
export const ServicesPhone: Story = { ...services.phone, name: "Services, phone" }
export const ServicesLaptop: Story = { ...services.laptop, name: "Services, laptop" }
/** The repair chosen: Continue is on. */
const serviceChosen = on({ initial: { step: "service", service: "repair", fields: home } }, "Service chosen")
export const ServiceChosenPhone: Story = { ...serviceChosen.phone, name: "Service chosen, phone" }

/** 2b. "Need a quote? Request one": what we quote, with no prices. Same first screens, no day. */
const quote = on({ initial: { step: "quote-service", quote: true, service: "lights", fields: home } }, "Request a quote, services")
export const QuotePathServicesPhone: Story = { ...quote.phone, name: "Request a quote, services, phone" }
export const QuotePathServicesLaptop: Story = { ...quote.laptop, name: "Request a quote, services, laptop" }

/** 3. Service details: zones with the price under them as it changes, access, a note for the crew, photos. */
const detailsZones = on({ entries: open, initial: { step: "details", service: "spring-turn-on", fields: { ...home, zones: 10 } } }, "Service details, zones")
export const DetailsZonesPhone: Story = { ...detailsZones.phone, name: "Service details, zones, phone" }
export const DetailsZonesLaptop: Story = { ...detailsZones.laptop, name: "Service details, zones, laptop" }
/** A repair has no zones; the access answer, a note and two photos are filled in. */
const detailsRepair = on({ initial: { step: "details", service: "repair", fields: details, photos } }, "Service details, repair with photos")
export const DetailsRepairPhone: Story = { ...detailsRepair.phone, name: "Service details, repair with photos, phone" }
export const DetailsRepairLaptop: Story = { ...detailsRepair.laptop, name: "Service details, repair with photos, laptop" }
/** Continue pressed with the access question unanswered. */
const detailsMissing = on({ initial: { step: "details", service: "repair", fields: home, attempted: true } }, "Service details, access not answered", {
  play: async ({ canvas }) => {
    await expect((await canvas.findAllByText("Tell us whether we can get to the system without you.")).length).toBe(2)
  },
})
export const DetailsAccessMissingPhone: Story = { ...detailsMissing.phone, name: "Service details, access not answered, phone" }

/** 3b. The request path's details: what to quote, in their words, and photos. */
const quoteDetails = on({ initial: { step: "details", quote: true, service: "lights", fields: { ...home, accessNote: "Lights along the front roofline." }, photos } }, "Request a quote, tell Ryan about it")
export const QuotePathDetailsPhone: Story = { ...quoteDetails.phone, name: "Request a quote, tell Ryan about it, phone" }
export const QuotePathDetailsLaptop: Story = { ...quoteDetails.laptop, name: "Request a quote, tell Ryan about it, laptop" }

/** 3c. The questions that belong to a service: the Rachio install asks the controller there now and Wi-Fi; water efficiency what to improve; the installation design visit what kind of project, the area and photos (strongly suggested). */
const detailsRachio = on({ initial: { step: "details", service: "rachio-install", fields: { ...home, zones: 10 }, extras: { brand: "Hunter", wifi: "yes" } } }, "Service details, Rachio install")
export const DetailsRachioPhone = detailsRachio.phone
export const DetailsRachioLaptop = detailsRachio.laptop
const detailsEfficiency = on({ initial: { step: "details", service: "water-efficiency", fields: home, extras: { goals: ["Dry spots", "A garden bed to put on drip"] } } }, "Service details, water efficiency and drip")
export const DetailsEfficiencyPhone = detailsEfficiency.phone
export const DetailsEfficiencyLaptop = detailsEfficiency.laptop
const detailsInstall = on({ initial: { step: "details", service: "install", fields: home, extras: { installType: "new", area: "5,000" } } }, "Service details, new system design visit")
export const DetailsInstallPhone = detailsInstall.phone
export const DetailsInstallLaptop = detailsInstall.laptop

/** 4. Day and exact time: the open days soonest first, the best one selected with the offer rule's label ("We're already in Erie that day."), its start times under it, none selected, Continue off. No sentence about which weekdays Ryan is where. */
const day = on({ initial: { step: "day", service: "repair", fields: details } }, "Day and time", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radio", { name: /Tuesday, April 20/ })).toBeChecked()
    await expect(canvas.getByRole("radio", { name: /Thursday, April 15.*Soonest open day\./ })).toBeInTheDocument()
    await expect(canvas.queryByText(/Tuesdays|texts you the day before|He texts/)).toBeNull()
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeDisabled()
  },
})
export const DayPhone: Story = { ...day.phone, name: "Day and time, phone" }
export const DayLaptop: Story = { ...day.laptop, name: "Day and time, laptop" }
/** A time tapped: Continue is on. */
const dayTapped = on({ initial: { step: "day", service: "repair", fields: details, picks: picked } }, "Day and time, a time tapped")
export const DayTimeTappedPhone: Story = { ...dayTapped.phone, name: "Day and time, a time tapped, phone" }
/** "Show more days" opens the fourth and fifth day. */
const dayMore = on({ initial: { step: "day", service: "repair", fields: details } }, "Day and time, more days", {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Show more days" }))
    await expect(canvas.getAllByRole("radio", { name: /day, April/ })).toHaveLength(5)
  },
})
export const DayMoreDaysPhone: Story = { ...dayMore.phone, name: "Day and time, more days, phone" }
export const DayMoreDaysLaptop: Story = { ...dayMore.laptop, name: "Day and time, more days, laptop" }
/** No open day in the window: "These days are full. We'll call you to find one.", a box for when would suit, the phone number, and Continue is on. */
const dayFull = on({ initial: { step: "day", service: "repair", fields: details }, offersFor: () => [] }, "Day and time, no open day")
export const DayNoOpenDayPhone: Story = { ...dayFull.phone, name: "Day and time, no open day, phone" }
export const DayNoOpenDayLaptop: Story = { ...dayFull.laptop, name: "Day and time, no open day, laptop" }

/** 5. Contact with how we reach you, after the day: four fields, text, email or both, the terms, and the separate unticked marketing box. */
const contact = on({ initial: { step: "contact", service: "repair", fields: details, picks: picked } }, "Contact")
export const ContactPhone: Story = { ...contact.phone, name: "Contact, phone" }
export const ContactLaptop: Story = { ...contact.laptop, name: "Contact, laptop" }
const contactFilled = on({ initial: { step: "contact", service: "repair", fields: { ...details, ...person, email: "andrea.dalton@gmail.con", termsAccepted: false }, picks: picked, channel: "both" } }, "Contact filled, a slip in the email")
export const ContactFilledPhone: Story = { ...contactFilled.phone, name: "Contact filled, a slip in the email, phone" }
/** Continue pressed with nothing filled in: each problem is written as help under its field. */
const contactMissing = on({ initial: { step: "contact", service: "repair", fields: { ...details, firstName: "Andrea", lastName: "Dalton", email: "andrea.dalton@example.com" }, picks: picked, attempted: true } }, "Contact, missing phone and terms", {
  play: async ({ canvas }) => {
    await expect((await canvas.findAllByText("Add a phone number so we can text you the day.")).length).toBe(2)
    await expect(canvas.getAllByText("Tick the box to accept the terms.")).toHaveLength(2)
  },
})
export const ContactMissingPhonePhone: Story = { ...contactMissing.phone, name: "Contact, missing phone and terms, phone" }
export const ContactMissingPhoneLaptop: Story = { ...contactMissing.laptop, name: "Contact, missing phone and terms, laptop" }

/** 5c. The card, after contact: Stripe's setup form drawn (never a real card field), one line saying when it is charged, and for a one-off a "Not now". */
const cardStep = on({ initial: { step: "card", service: "repair", fields: full, picks: picked } }, "Card", {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Charged after the visit.")).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Not now" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Save card" })).toBeEnabled()
  },
})
export const CardPhone: Story = { ...cardStep.phone, name: "Card, phone" }
export const CardLaptop: Story = { ...cardStep.laptop, name: "Card, laptop" }
/** The card kept: the form is replaced by "Visa ending 4242" and there is no "Not now". */
const cardSaved = on({ initial: { step: "card", service: "repair", fields: full, picks: picked, card: "saved" } }, "Card saved")
export const CardSavedPhone: Story = { ...cardSaved.phone, name: "Card saved, phone" }
/** "Not now" goes on with no card: the confirm step reads "No card". */
export const CardNotNowTest: Story = {
  ...phone,
  name: "Card, not now (test)",
  tags: HIDDEN,
  args: { initial: { step: "card", service: "repair", fields: full, picks: picked } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Not now" }))
    await expect(await canvas.findByText("Look it over and confirm.")).toBeInTheDocument()
    await expect(canvas.getByText("No card")).toBeInTheDocument()
  },
}

/** 5b. The request path ends on contact: no terms line, no confirm, and the button says Send to Ryan. */
const quoteContact = on({ initial: { step: "contact", quote: true, service: "lights", fields: { ...home, accessNote: "Lights along the front roofline." } } }, "Request a quote, contact")
export const QuotePathContactPhone: Story = { ...quoteContact.phone, name: "Request a quote, contact, phone" }
export const QuotePathContactLaptop: Story = { ...quoteContact.laptop, name: "Request a quote, contact, laptop" }

/** 6. Confirm, after the card: every answer with its Change link, the card, and one sentence that says what happens. It is the only place the form has Change links. */
const confirm = on({ initial: { step: "confirm", service: "repair", fields: full, picks: picked, channel: "text", photos, card: "saved" } }, "Confirm", {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("We'll text you a confirmation to (970) 555-0123 and email a receipt when it's done.")).toBeInTheDocument()
    await expect(canvas.getByText("Visa ending 4242")).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Confirm and book" })).toBeEnabled()
  },
})
export const ConfirmPhone: Story = { ...confirm.phone, name: "Confirm, phone" }
export const ConfirmLaptop: Story = { ...confirm.laptop, name: "Confirm, laptop" }
const confirmBoth = on({ initial: { step: "confirm", service: "repair", fields: full, picks: picked, channel: "both", card: "saved" } }, "Confirm, text and email")
export const ConfirmBothPhone: Story = { ...confirmBoth.phone, name: "Confirm, text and email, phone" }

/** 7. Booked: the holographic card with the exact time, "You added 2 photos", what happens next, Add to calendar, your Trailhead account. */
const booked = on({ initial: { step: "done", service: "repair", fields: full, picks: picked, channel: "text", photos, card: "saved" } }, "Booked", {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("You added 2 photos.")).toBeInTheDocument()
    await expect(canvas.getByText("Visa ending 4242")).toBeInTheDocument()
    await expect(canvas.getByRole("article", { name: /booked Tuesday, April 20 at 10:30 am/ })).toBeInTheDocument()
    await expect(canvas.getByRole("link", { name: "your Trailhead account" })).toBeInTheDocument()
  },
})
export const BookedPhone: Story = { ...booked.phone, name: "Booked, phone" }
export const BookedLaptop: Story = { ...booked.laptop, name: "Booked, laptop" }
const bookedCall = on({ initial: { step: "done", service: "repair", fields: full, channel: "text" }, offersFor: () => [] }, "Request sent, no open day")
export const BookedCallPhone: Story = { ...bookedCall.phone, name: "Request sent, no open day, phone" }
const quoteDone = on({ initial: { step: "done", quote: true, service: "lights", fields: { ...home, ...person, termsAccepted: false }, photos } }, "Request sent")
export const QuotePathDonePhone: Story = { ...quoteDone.phone, name: "Request sent, phone" }
export const QuotePathDoneLaptop: Story = { ...quoteDone.laptop, name: "Request sent, laptop" }

/** The whole path on a phone, clicked: address, repair, details with the access answer and two sample photos, a time, contact with Text and email, the card, confirm, booked. */
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
    await userEvent.type(await c.findByRole("combobox", { name: "Street address" }), "123")
    await userEvent.click((await c.findAllByRole("option"))[0]!)
    await next()
    await userEvent.click(await c.findByRole("radio", { name: /Sprinkler repair/ }))
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
    await userEvent.click(await c.findByRole("button", { name: "Save card" }))
    await expect(await c.findByText(/We'll text a confirmation to \(970\) 555-0123 and email one to/)).toBeInTheDocument()
    await expect(c.getByText("Visa ending 4242")).toBeInTheDocument()
    await next("Confirm and book")
    await expect(await c.findByText("You added 2 photos.")).toBeInTheDocument()
  },
}

/** The request path on a phone, clicked: address, what we quote, tell Ryan, contact, Send to Ryan. It has no day, no card and no confirm, and ends "Thanks. We've got your request." */
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
    await userEvent.type(await c.findByRole("combobox", { name: "Street address" }), "123")
    await userEvent.click((await c.findAllByRole("option"))[0]!)
    await next()
    await userEvent.click(await c.findByRole("button", { name: "Need a quote? Request one" }))
    await userEvent.click(await c.findByRole("radio", { name: /Christmas lights/ }))
    await next()
    await next()
    await userEvent.type(await c.findByLabelText("First name"), "Andrea")
    await userEvent.type(await c.findByLabelText("Last name"), "Dalton")
    await userEvent.type(await c.findByLabelText("Email"), "andrea.dalton@example.com")
    await userEvent.type(await c.findByLabelText("Phone"), "9705550123")
    await next("Send to Ryan")
    await expect(await c.findByText("Thanks. We've got your request.")).toBeInTheDocument()
  },
}

/** Confirm for the design visit: the service-specific answers are rows with their Change links, and the price reads "Price set at the visit." and nothing more. */
const confirmInstall = on({ initial: { step: "confirm", service: "install", fields: full, picks: picked, extras: { installType: "new", area: "5,000" }, photos, card: "skipped" } }, "Confirm, new system design visit", {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Price set at the visit.")).toBeInTheDocument()
    await expect(canvas.getByText("A new lawn")).toBeInTheDocument()
    await expect(canvas.getByText("No card")).toBeInTheDocument()
  },
})
export const ConfirmInstallPhone = confirmInstall.phone
export const ConfirmInstallLaptop = confirmInstall.laptop

/** Close with something entered asks first: "Leave without booking? Your answers aren't saved." */
const leave = on({ initial: { step: "service", fields: home } }, "Leave without booking", {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Close the booking form" }))
    await expect(await within(document.body).findByText("Leave without booking?")).toBeInTheDocument()
    await expect(within(document.body).getByText("Your answers aren't saved.")).toBeInTheDocument()
    await expect(within(document.body).getByRole("button", { name: "Keep booking" })).toBeInTheDocument()
  },
})
export const LeavePhone = leave.phone
export const LeaveLaptop = leave.laptop

/** Close with nothing entered just leaves: it is a link to the website, with no question. */
export const CloseWithNothingEntered: Story = {
  ...phone,
  name: "Close with nothing entered, phone",
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Close the booking form" })).toHaveAttribute("href", "/")
    await expect(canvas.queryByRole("button", { name: "Close the booking form" })).toBeNull()
  },
}

/** A failed Continue puts the summary at the top of the step and focus on the first field that is wrong. */
export const ProblemsFocusPhone: Story = {
  ...phone,
  name: "Missing details, summary and focus, phone",
  args: { initial: { step: "contact", service: "repair", fields: details, picks: picked } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await expect(await canvas.findByText("Check these before you continue")).toBeInTheDocument()
    await expect(canvas.getByLabelText("First name")).toHaveFocus()
  },
}

/** The browser's Back button goes to the previous step and never out of the form (hidden twin, not in the sidebar). */
export const HistoryBehaviour: Story = {
  ...phone,
  name: "History behaviour",
  tags: ["!dev", "!autodocs"],
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByRole("combobox", { name: "Street address" }), "123")
    await userEvent.click((await canvas.findAllByRole("option"))[0]!)
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await userEvent.click(await canvas.findByRole("radio", { name: /Sprinkler repair/ }))
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await expect(await canvas.findByText("A few details about the visit")).toBeInTheDocument()
    // the browser's Back goes to the services, then the address, with the answers kept
    window.history.back()
    await expect(await canvas.findByText("What can we do for you?")).toBeInTheDocument()
    await expect(canvas.getByRole("radio", { name: /Sprinkler repair/ })).toBeChecked()
    window.history.back()
    await expect(await canvas.findByText("Where is the yard?")).toBeInTheDocument()
    await expect(canvas.getByRole("combobox", { name: "Street address" })).toHaveValue("123 Trailhead Way, Erie, CO 80516")
    // Forward comes back, and the Back button on the screen does the same as the browser's
    window.history.forward()
    await expect(await canvas.findByText("What can we do for you?")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Back" }))
    await expect(await canvas.findByText("Where is the yard?")).toBeInTheDocument()
    // the heading takes focus on a step change and the page is named for it
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await expect(await canvas.findByText("What can we do for you?")).toBeInTheDocument()
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveFocus()
    await expect(document.title).toContain("What can we do for you?")
  },
}
