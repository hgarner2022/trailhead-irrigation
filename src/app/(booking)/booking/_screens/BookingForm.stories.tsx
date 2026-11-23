import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, waitFor, within } from "storybook/test"
import { bookingCatalogue, type Online } from "@/lib/booking/services"
import { typedPlace } from "@/lib/places"
import { FIXTURE_HOME, FIXTURE_PLACES } from "@/lib/places/fixture"
import type { CheckoutState } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { BookingForm, type BookingFormProps } from "./BookingForm"

// The customer's booking form, one story per screen at 375 (Phone) and 1280 (Laptop), over fixtures; nothing is sent. Today is Wednesday, April 14, 2027. The order (Hannah, Nov 22 2026, third pass): the
// address (the box is the type-ahead, the ZIP decides the area), then the service, whose card opens in place and holds the details, the day as a calendar with the soonest open day selected, then contact,
// a card and a review: six counted steps (it was seven), four for a request for a quote. Every heading is a plain name. The words are in docs/plans/2026-11-19-booking-form-design.md, "Words (Nov 22 2026)".
const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const

const home: Partial<CheckoutState> = { address: FIXTURE_HOME.label, place: FIXTURE_HOME, town: "Erie" }
const person: Partial<CheckoutState> = { firstName: "Andrea", lastName: "Dalton", email: "andrea.dalton@example.com", phone: "(970) 555-0123", termsAccepted: true }
const boulder: Partial<CheckoutState> = { address: FIXTURE_PLACES[9]!.label, place: FIXTURE_PLACES[9]! }
const typed: Partial<CheckoutState> = { address: "9 Cottonwood Ln", place: typedPlace("9 Cottonwood Ln", "Lafayette", "80026"), town: "Lafayette" }
const mismatch: Partial<CheckoutState> = { address: "9 Cottonwood Ln", place: typedPlace("9 Cottonwood Ln", "Longmont", "80516"), town: "Erie" }
// A typed address with no city yet: the same shape the typed fields hand the step, with no city.
const noCity: Partial<CheckoutState> = { address: "9 Cottonwood Ln", place: { id: "typed:9 cottonwood ln||", label: "9 Cottonwood Ln", line1: "9 Cottonwood Ln", town: "", state: "CO", zip: "" } }
const details: Partial<CheckoutState> = { ...home, access: "yes", accessNote: "Gate code 4471, the controller is in the garage." }
const full: Partial<CheckoutState> = { ...details, ...person }
// April 19 is a recommended day and 10:30 its best fit.
const picked = { visit: { day: "2027-04-19", start: "10:30" } }
const photos = [
  { name: "zone-3-head.jpg", src: "/images/sprinkler-spray-head-lawn.jpg" },
  { name: "garden-bed.jpg", src: "/images/micro-spray-garden-bed.jpg" },
]
type Args = Partial<BookingFormProps>

const meta = {
  title: "Customer/Booking form",
  component: BookingForm,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The booking form a customer sees at Book Online, every step at 375 (Phone) and 1280 (Laptop). Click through a Sprinkler repair: the address (one box with type-ahead; the typed fields appear only after a search finds nothing, and the ZIP decides whether we serve the yard), the service (each card opens in place to show what is included, the zones with the price, access, a note and photos, and a single turn-on or blowout offers Upgrade to a Season Pass), a calendar day with the soonest open day selected and then an exact start time, contact (someone we already have is offered a sign-in link before any saved detail shows), a card (Stripe's form, drawn; Not now for a one-off), then Review, where each answer has its Change link. Nothing is kept until the contact step is submitted. Close (top right) leaves, and asks first only once something is entered; the browser's Back button goes to the previous step. Need a quote? lists what we do not book online and has no day. Nothing is sent. The whole clickable customer path is under Customer / Walkthrough (clickable).",
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

/** 1. The address, the first question: one box with type-ahead, and nothing else. There is no "Type it instead" link. */
const address = on({}, "Address", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Address" })).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: /Type it instead/ })).toBeNull()
  },
})
export const AddressPhone: Story = { ...address.phone, name: "Address, phone" }
export const AddressLaptop: Story = { ...address.laptop, name: "Address, laptop" }
/** A picked address in the six cities' ZIP codes: Continue goes on. */
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
/** The search found nothing: "We can't find it. Enter it here." with Street, City and a required ZIP, filled in. */
const addressTyped = on({ initial: { fields: typed } }, "Address typed, nothing found", {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("We can't find it. Enter it here.")).toBeInTheDocument()
    await expect(canvas.getByLabelText("ZIP")).toHaveValue("80026")
  },
})
export const AddressTypedPhone: Story = { ...addressTyped.phone, name: "Address typed, phone" }
export const AddressTypedLaptop: Story = { ...addressTyped.laptop, name: "Address typed, laptop" }
export const AddressTypedTest: Story = {
  ...phone,
  name: "Address typed (test)",
  tags: HIDDEN,
  args: { places: async () => [] },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.queryByLabelText("City")).toBeNull()
    await userEvent.type(await canvas.findByRole("combobox", { name: "Street address" }), "9 Cottonwood Ln")
    await expect(await canvas.findByText("We can't find it. Enter it here.")).toBeInTheDocument()
    await userEvent.type(canvas.getByLabelText("City"), "Lafayette")
    await userEvent.type(canvas.getByLabelText("ZIP"), "80026")
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await expect(await canvas.findByRole("heading", { level: 1, name: "Service" })).toBeInTheDocument()
  },
}
/** A typed city outside the six ZIP codes: the same line as a picked one, with the six cities and Ryan's number, and Continue stays off. */
export const AddressTypedOutsideTest: Story = {
  ...phone,
  name: "Address typed outside the area (test)",
  tags: HIDDEN,
  args: { places: async () => [] },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByRole("combobox", { name: "Street address" }), "1200 Pearl St")
    await userEvent.type(await canvas.findByLabelText("City"), "Boulder")
    await userEvent.type(canvas.getByLabelText("ZIP"), "80302")
    await expect(await canvas.findByText(/We don't serve Boulder yet/)).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeDisabled()
  },
}
/** A typed city that is not the town of its ZIP: a quiet line under the city, and Continue does not pass. */
const addressMismatch = on({ initial: { fields: mismatch, attempted: true } }, "Address, city and ZIP disagree", {
  play: async ({ canvas }) => {
    await expect((await canvas.findAllByText("ZIP 80516 is in Erie.")).length).toBe(2)
  },
})
export const AddressMismatchPhone: Story = { ...addressMismatch.phone, name: "Address, city and ZIP disagree, phone" }
export const AddressMismatchLaptop: Story = { ...addressMismatch.laptop, name: "Address, city and ZIP disagree, laptop" }
/** An address with no city we can read asks for the city, in the words beside the field, instead of turning the customer away. */
const cityMissing = on({ initial: { fields: noCity, attempted: true } }, "Address, city missing")
export const AddressCityMissingPhone: Story = { ...cityMissing.phone, name: "Address, city missing, phone" }
export const AddressCityMissingLaptop: Story = { ...cityMissing.laptop, name: "Address, city missing, laptop" }
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
  },
}

/** 2. Service: one card per service with its price and a chevron; the whole header is the button. Nothing is open until one is pressed. */
const services = on({ initial: { step: "service", fields: home } }, "Service", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /^Sprinkler repair/ })).toHaveAttribute("aria-expanded", "false")
    await expect(canvas.queryByText(/Opens|Free consultation|What's included/)).toBeNull()
  },
})
export const ServicesPhone: Story = { ...services.phone, name: "Service, phone" }
export const ServicesLaptop: Story = { ...services.laptop, name: "Service, laptop" }
/** The repair card open: what is included, the price once, access, a note and photos, all inside the card. Continue is on once access is answered. */
const repairOpen = on({ initial: { step: "service", service: "repair", fields: details, photos } }, "Service, repair open", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /^Sprinkler repair/ })).toHaveAttribute("aria-expanded", "true")
    await expect(canvas.getByText("About $145")).toBeInTheDocument()
    await expect(canvas.queryByText("Charged after the visit.")).toBeNull()
    await expect(canvas.queryByText(/quoted separately|Larger repairs/)).toBeNull()
    await expect(canvas.queryByText(/Upgrade to a Season Pass/)).toBeNull()
  },
})
export const ServiceRepairOpenPhone: Story = { ...repairOpen.phone, name: "Service, repair open, phone" }
export const ServiceRepairOpenLaptop: Story = { ...repairOpen.laptop, name: "Service, repair open, laptop" }
/** The spring turn-on open: zones as 6 or fewer, 7 to 12 and More than 12, the price by the catalogue's per-zone rule, and Upgrade to a Season Pass, off. */
const turnOnOpen = on({ initial: { step: "service", service: "spring-turn-on", fields: { ...home, zones: 10 } } }, "Service, spring turn-on open", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "6 or fewer" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "10 zones" })).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByText("About $165")).toBeInTheDocument()
    await expect(canvas.getByRole("switch", { name: "Upgrade to a Season Pass" })).toHaveAttribute("aria-checked", "false")
  },
})
export const ServiceTurnOnOpenPhone: Story = { ...turnOnOpen.phone, name: "Service, spring turn-on open, phone" }
export const ServiceTurnOnOpenLaptop: Story = { ...turnOnOpen.laptop, name: "Service, spring turn-on open, laptop" }
/** More than 12 opens a number box; above 12 the same per-zone price, no new band. */
export const ServiceZonesManyTest: Story = {
  ...phone,
  name: "Service, more than 12 zones (test)",
  tags: HIDDEN,
  args: { initial: { step: "service", service: "spring-turn-on", fields: { ...home, zones: 8 } } },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText("About $145")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "More than 12" }))
    const box = await canvas.findByLabelText("Number of zones")
    await userEvent.clear(box)
    await userEvent.type(box, "20")
    await expect(canvas.getByText("About $265")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "6 or fewer" }))
    await expect(canvas.queryByLabelText("Number of zones")).toBeNull()
    await expect(canvas.getByText("About $145")).toBeInTheDocument()
  },
}
/** The upsell: turning on Upgrade to a Season Pass moves the booking to the pass with the same answers; turning it off goes back to the single visit. */
export const ServiceUpsellTest: Story = {
  ...phone,
  name: "Service, make it a Season Pass (test)",
  tags: HIDDEN,
  args: { initial: { step: "service", service: "spring-turn-on", fields: { ...details, zones: 10 } } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("switch", { name: "Upgrade to a Season Pass" }))
    await expect(await canvas.findByRole("button", { name: /^Season Pass 2027/ })).toHaveAttribute("aria-expanded", "true")
    await expect(canvas.getByRole("button", { name: "10 zones" })).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByRole("switch", { name: "Upgrade to a Season Pass" })).toHaveAttribute("aria-checked", "true")
    await userEvent.click(canvas.getByRole("switch", { name: "Upgrade to a Season Pass" }))
    await expect(await canvas.findByRole("button", { name: /^Spring turn-on/ })).toHaveAttribute("aria-expanded", "true")
  },
}
/** Continue pressed with the access question unanswered. */
const accessMissing = on({ initial: { step: "service", service: "repair", fields: home, attempted: true } }, "Service, access not answered", {
  play: async ({ canvas }) => {
    await expect((await canvas.findAllByText("Tell us whether we can get to the system without you.")).length).toBe(2)
  },
})
export const ServiceAccessMissingPhone: Story = { ...accessMissing.phone, name: "Service, access not answered, phone" }
/** The questions that belong to a service: the Rachio install asks the controller and Wi-Fi, water efficiency what to improve (and it is $145), the installation design visit the project, the area and photos. */
const rachioOpen = on({ initial: { step: "service", service: "rachio-install", fields: { ...details, zones: 10 }, extras: { brand: "Hunter", wifi: "yes" } } }, "Service, Rachio install open")
export const ServiceRachioPhone = rachioOpen.phone
export const ServiceRachioLaptop = rachioOpen.laptop
const efficiencyOpen = on({ initial: { step: "service", service: "water-efficiency", fields: details, extras: { goals: ["Dry spots", "A garden bed to put on drip"] } } }, "Service, water efficiency and drip open", {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("About $145")).toBeInTheDocument()
  },
})
export const ServiceEfficiencyPhone = efficiencyOpen.phone
export const ServiceEfficiencyLaptop = efficiencyOpen.laptop
// The installation is quote-only in the backend; with Settings set to Book a day it is a design visit with no price.
const INSTALL_BOOKABLE = bookingCatalogue({ install: "bookable" })
const installOpen = on({ catalogue: INSTALL_BOOKABLE, initial: { step: "service", service: "install", fields: details, extras: { installType: "new", area: "5,000" } } }, "Service, new system design visit open (set to Book a day)")
export const ServiceInstallPhone = installOpen.phone
export const ServiceInstallLaptop = installOpen.laptop

/** Settings' Online select drives the form: flip Sprinkler repair to Off and its card is gone; We quote moves it to the request path. */
function SettingsHarness(props: Args) {
  const [online, setOnline] = useState<Online>("bookable")
  return (
    <div>
      <label className="flex items-center gap-3 border-b border-border bg-stone px-4 py-2 text-sm">
        <span>Settings, Services, Sprinkler repair, Online</span>
        <select value={online} onChange={(e) => setOnline(e.target.value as Online)} className="rounded border border-border bg-background px-2 py-1">
          <option value="bookable">Book a day</option>
          <option value="quote">We quote</option>
          <option value="off">Off</option>
        </select>
      </label>
      <BookingForm key={online} {...props} catalogue={bookingCatalogue({ repair: online })} initial={{ step: "service", fields: home }} />
    </div>
  )
}
export const ServiceTurnedOffPhone: Story = {
  ...phone,
  name: "Service turned off in Settings, phone",
  render: (args) => <SettingsHarness {...args} />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("button", { name: /^Sprinkler repair/ })).toBeInTheDocument()
    await userEvent.selectOptions(canvas.getByRole("combobox"), "off")
    await waitFor(() => expect(canvas.queryByRole("button", { name: /^Sprinkler repair/ })).toBeNull())
    await userEvent.click(canvas.getByRole("button", { name: "Need a quote? Request one" }))
    await expect(canvas.queryByRole("radio", { name: /Sprinkler repair/ })).toBeNull()
  },
}
export const ServiceTurnedOffLaptop: Story = { ...ServiceTurnedOffPhone, ...laptop, name: "Service turned off in Settings, laptop" }
export const ServiceWeQuoteTest: Story = {
  ...phone,
  name: "Service set to We quote (test)",
  tags: HIDDEN,
  render: (args) => <SettingsHarness {...args} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.selectOptions(canvas.getByRole("combobox"), "quote")
    await waitFor(() => expect(canvas.queryByRole("button", { name: /^Sprinkler repair/ })).toBeNull())
    await userEvent.click(canvas.getByRole("button", { name: "Need a quote? Request one" }))
    await expect(await canvas.findByRole("radio", { name: /Sprinkler repair/ })).toBeInTheDocument()
  },
}

/** 2b. Need a quote? Request one: what we quote, with no prices. Same first screens, no day. */
const quote = on({ initial: { step: "quote-service", quote: true, service: "lights", fields: home } }, "Request a quote, service")
export const QuotePathServicesPhone: Story = { ...quote.phone, name: "Request a quote, service, phone" }
export const QuotePathServicesLaptop: Story = { ...quote.laptop, name: "Request a quote, service, laptop" }
/** 2c. The request path's details: what to quote, in their words, and photos. */
const quoteDetails = on({ initial: { step: "details", quote: true, service: "lights", fields: { ...home, accessNote: "Lights along the front roofline." }, photos } }, "Request a quote, details")
export const QuotePathDetailsPhone: Story = { ...quoteDetails.phone, name: "Request a quote, details, phone" }
export const QuotePathDetailsLaptop: Story = { ...quoteDetails.laptop, name: "Request a quote, details, laptop" }

/** 3. Day: a month calendar. The soonest open day is selected and marked, recommended days are marked, days with nothing open are greyed, and the times of the chosen day are under it, none selected. */
const day = on({ initial: { step: "day", service: "repair", fields: details } }, "Day", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Day" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: /Thursday, April 15, soonest/ })).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByRole("button", { name: /Monday, April 19, recommended/ })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: /Wednesday, April 21, no times open/ })).toHaveAttribute("aria-disabled", "true")
    await expect(canvas.queryByText(/Tuesdays|texts you the day before|already in Erie|Show more days/)).toBeNull()
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeDisabled()
  },
})
export const DayPhone: Story = { ...day.phone, name: "Day, phone" }
export const DayLaptop: Story = { ...day.laptop, name: "Day, laptop" }
/** A recommended day picked and its best time tapped: Continue is on. */
const dayTapped = on({ initial: { step: "day", service: "repair", fields: details, picks: picked } }, "Day, a time tapped")
export const DayTimeTappedPhone: Story = { ...dayTapped.phone, name: "Day, a time tapped, phone" }
export const DayTimeTappedLaptop: Story = { ...dayTapped.laptop, name: "Day, a time tapped, laptop" }
/** The month arrows replace "Show more days": the next month has its own open days. */
export const DayNextMonthTest: Story = {
  ...phone,
  name: "Day, next month (test)",
  tags: HIDDEN,
  args: { initial: { step: "day", service: "repair", fields: details } },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("button", { name: "Previous month" })).toBeDisabled()
    await userEvent.click(canvas.getByRole("button", { name: "Next month" }))
    await expect(await canvas.findByText("May 2027")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Monday, May 3" }))
    await userEvent.click(await canvas.findByRole("radio", { name: /9:00 am/ }))
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeEnabled()
  },
}
/** No open day at all: "These days are full. We'll call you to find one.", a box for when would suit, the phone number, and Continue is on. */
const dayFull = on({ initial: { step: "day", service: "repair", fields: details }, offersFor: () => [] }, "Day, no open day")
export const DayNoOpenDayPhone: Story = { ...dayFull.phone, name: "Day, no open day, phone" }
export const DayNoOpenDayLaptop: Story = { ...dayFull.laptop, name: "Day, no open day, laptop" }

/** 4. Contact with how we reach you, after the day: four fields, text, email or both, the terms, and the separate unticked marketing box. */
const contact = on({ initial: { step: "contact", service: "repair", fields: details, picks: picked } }, "Contact", {
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/Reply STOP|Message and data rates/)).toBeNull()
  },
})
export const ContactPhone: Story = { ...contact.phone, name: "Contact, phone" }
export const ContactLaptop: Story = { ...contact.laptop, name: "Contact, laptop" }
const contactFilled = on({ initial: { step: "contact", service: "repair", fields: { ...details, ...person, email: "andrea.dalton@gmail.con", phone: "(970) 555-0188", termsAccepted: false }, picks: picked, channel: "both" } }, "Contact filled, a slip in the email")
export const ContactFilledPhone: Story = { ...contactFilled.phone, name: "Contact filled, a slip in the email, phone" }
/** Continue pressed with nothing filled in: each problem is written as help under its field. */
const contactMissing = on({ initial: { step: "contact", service: "repair", fields: { ...details, firstName: "Andrea", lastName: "Dalton", email: "andrea.dalton@example.org" }, picks: picked, attempted: true } }, "Contact, missing phone and terms", {
  play: async ({ canvas }) => {
    await expect((await canvas.findAllByText("Add your phone number.")).length).toBe(2)
    await expect(canvas.getAllByText("Tick the box to accept the terms.")).toHaveLength(2)
  },
})
export const ContactMissingPhonePhone: Story = { ...contactMissing.phone, name: "Contact, missing phone and terms, phone" }
export const ContactMissingPhoneLaptop: Story = { ...contactMissing.laptop, name: "Contact, missing phone and terms, laptop" }
/** 4b. The request path ends on contact: no terms line, no review, and the button says Send to Ryan. */
const quoteContact = on({ initial: { step: "contact", quote: true, service: "lights", fields: { ...home, accessNote: "Lights along the front roofline." } } }, "Request a quote, contact")
export const QuotePathContactPhone: Story = { ...quoteContact.phone, name: "Request a quote, contact, phone" }
export const QuotePathContactLaptop: Story = { ...quoteContact.laptop, name: "Request a quote, contact, laptop" }

/** 4c. A repeat customer. The same offer for every visitor, "Booked with us before?"; it asks for the email, sends a six-digit code and takes it in the form. Nothing about her shows until the code is right. */
const returningOffer = on({ initial: { step: "contact", service: "repair", fields: details, picks: picked } }, "Contact, booked before", {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Booked with us before?")).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Use saved details" })).toBeInTheDocument()
    await expect(canvas.queryByText(/Andrea|Briggs|4242/)).toBeNull()
  },
})
export const ContactReturningPhone: Story = { ...returningOffer.phone, name: "Contact, booked before, phone" }
export const ContactReturningLaptop: Story = { ...returningOffer.laptop, name: "Contact, booked before, laptop" }
const returningSent = on({ initial: { step: "contact", service: "repair", fields: { ...details, email: "andrea.dalton@example.com" }, picks: picked, returning: "sent" } }, "Contact, code sent", {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("We sent a code to a***@example.com.")).toBeInTheDocument()
    await expect(canvas.queryByText(/Welcome back|Andrea Dalton/)).toBeNull()
  },
})
export const ContactCodeSentPhone: Story = { ...returningSent.phone, name: "Contact, code sent, phone" }
/** The code right: Welcome back, her details filled in and changeable, the card on file, and one line, Not you?. */
const returningWelcome = on({ initial: { step: "contact", service: "repair", fields: { ...details, email: "andrea.dalton@example.com" }, picks: picked, returning: "sent" } }, "Contact, welcome back", {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByLabelText("Code"), "123456")
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }))
    await expect(await canvas.findByText("Welcome back, Andrea.")).toBeInTheDocument()
    await expect(canvas.getByLabelText("First name")).toHaveValue("Andrea")
    await expect(canvas.getByText("Visa ending 4242")).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Not you?" })).toBeInTheDocument()
  },
})
export const ContactWelcomeBackPhone: Story = { ...returningWelcome.phone, name: "Contact, welcome back, phone" }
export const ContactWelcomeBackLaptop: Story = { ...returningWelcome.laptop, name: "Contact, welcome back, laptop" }
/** A wrong code says so and nothing else. */
export const ContactWrongCodeTest: Story = {
  ...phone,
  name: "Contact, wrong code (test)",
  tags: HIDDEN,
  args: { initial: { step: "contact", service: "repair", fields: { ...details, email: "andrea.dalton@example.com" }, picks: picked, returning: "sent" } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByLabelText("Code"), "000000")
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }))
    await expect(await canvas.findByText("That code isn't right.")).toBeInTheDocument()
    await expect(canvas.queryByText(/Welcome back/)).toBeNull()
  },
}
/** From the first line to the code: the email is asked for, the code is sent only when pressed. */
export const ContactAskEmailTest: Story = {
  ...phone,
  name: "Contact, asks the email (test)",
  tags: HIDDEN,
  args: { initial: { step: "contact", service: "repair", fields: details, picks: picked } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Use saved details" }))
    await userEvent.type(await canvas.findByLabelText("Email", { selector: "[name=returning-email]" }), "andrea.dalton@example.com")
    await userEvent.click(canvas.getByRole("button", { name: "Send code" }))
    await expect(await canvas.findByText("We sent a code to a***@example.com.")).toBeInTheDocument()
  },
}
/** An email with nothing saved gets the same code step; only a right code shows the difference. */
export const ContactUnknownEmailTest: Story = {
  ...phone,
  name: "Contact, email with nothing saved (test)",
  tags: HIDDEN,
  args: { initial: { step: "contact", service: "repair", fields: { ...details, email: "someone@example.com" }, picks: picked, returning: "sent" } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByLabelText("Code"), "123456")
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }))
    await expect(await canvas.findByText("We have no saved details for that email.")).toBeInTheDocument()
  },
}
/** Not you? empties what was filled in and the form carries on as a new customer. */
export const ContactNotYouTest: Story = {
  ...phone,
  name: "Contact, not you (test)",
  tags: HIDDEN,
  args: { initial: { step: "contact", service: "repair", fields: { ...details, email: "andrea.dalton@example.com" }, picks: picked, returning: "sent" } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByLabelText("Code"), "123456")
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }))
    await userEvent.click(await canvas.findByRole("button", { name: "Not you?" }))
    await waitFor(() => expect(canvas.getByLabelText("First name")).toHaveValue(""))
    await expect(canvas.getByLabelText("Email")).toHaveValue("")
    await expect(canvas.queryByText(/Welcome back/)).toBeNull()
  },
}
/** A signed-in customer needs no code: the booking opens at the contact step with her details in, her card on the card step and the welcome line on top. */
const signedIn = on({ initial: { step: "contact", service: "repair", fields: { ...details, email: "andrea.dalton@example.com", firstName: "Andrea", lastName: "Dalton", phone: "(970) 555-0123" }, picks: picked, returning: "verified", card: "saved" } }, "Contact, signed in", {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Welcome back, Andrea.")).toBeInTheDocument()
    await expect(canvas.getByText("Visa ending 4242")).toBeInTheDocument()
  },
})
export const ContactSignedInPhone: Story = { ...signedIn.phone, name: "Contact, signed in, phone" }
export const ContactSignedInLaptop: Story = { ...signedIn.laptop, name: "Contact, signed in, laptop" }

/** 5. The card, after contact: Stripe's setup form drawn (never a real card field), one line saying when it is charged, and for a one-off a "Not now". */
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
/** "Not now" goes on with no card: the review reads "No card". */
export const CardNotNowTest: Story = {
  ...phone,
  name: "Card, not now (test)",
  tags: HIDDEN,
  args: { initial: { step: "card", service: "repair", fields: full, picks: picked } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Not now" }))
    await expect(await canvas.findByRole("heading", { level: 1, name: "Review" })).toBeInTheDocument()
    await expect(canvas.getByText("No card")).toBeInTheDocument()
  },
}

/** 6. Review, after the card: every answer with its Change link, the card, and one sentence that says what happens. It is the only place the form has Change links. */
const confirm = on({ initial: { step: "confirm", service: "repair", fields: full, picks: picked, channel: "text", photos, card: "saved" } }, "Review", {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("We'll text a confirmation to (970) 555-0123.")).toBeInTheDocument()
    await expect(canvas.getByText("Visa ending 4242")).toBeInTheDocument()
    await expect(canvas.getByText("About $145")).toBeInTheDocument()
    await expect(canvas.queryByText(/charged after the visit/i)).toBeNull()
    await expect(canvas.getByRole("button", { name: "Confirm and book" })).toBeEnabled()
  },
})
export const ConfirmPhone: Story = { ...confirm.phone, name: "Review, phone" }
export const ConfirmLaptop: Story = { ...confirm.laptop, name: "Review, laptop" }
const confirmBoth = on({ initial: { step: "confirm", service: "repair", fields: full, picks: picked, channel: "both", card: "saved" } }, "Review, text and email")
export const ConfirmBothPhone: Story = { ...confirmBoth.phone, name: "Review, text and email, phone" }
/** Review for the design visit: the service-specific answers are rows with their Change links, and the price reads "Price set at the visit" and nothing more. */
const confirmInstall = on({ catalogue: INSTALL_BOOKABLE, initial: { step: "confirm", service: "install", fields: full, picks: picked, extras: { installType: "new", area: "5,000" }, photos, card: "skipped" } }, "Review, new system design visit", {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Price set at the visit")).toBeInTheDocument()
    await expect(canvas.getByText("A new lawn")).toBeInTheDocument()
    await expect(canvas.getByText("No card")).toBeInTheDocument()
  },
})
export const ConfirmInstallPhone = confirmInstall.phone
export const ConfirmInstallLaptop = confirmInstall.laptop

/** 7. Booked: the holographic card with the exact time, "You added 2 photos", what happens next, Add to calendar, your Trailhead account. */
const booked = on({ initial: { step: "done", service: "repair", fields: full, picks: picked, channel: "text", photos, card: "saved" } }, "Booked", {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("You added 2 photos.")).toBeInTheDocument()
    await expect(canvas.getByText("Visa ending 4242")).toBeInTheDocument()
    await expect(canvas.getByRole("article", { name: /booked Monday, April 19 at 10:30 am/ })).toBeInTheDocument()
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

/** The whole path on a phone, clicked: address, repair opened with access and two sample photos, a time, contact with Text and email, the card, review, booked. Six steps. */
export const WholePathPhone: Story = { ...phone, name: "Whole path, phone" }
export const WholePathPhoneTest: Story = {
  ...phone,
  name: "Whole path, phone (test)",
  tags: HIDDEN,
  play: async ({ canvasElement, userEvent }) => {
    const c = within(canvasElement)
    const next = async (name: string | RegExp = "Continue") => userEvent.click(await c.findByRole("button", { name }))
    await userEvent.type(await c.findByRole("combobox", { name: "Street address" }), "123")
    await userEvent.click((await c.findAllByRole("option"))[0]!)
    await next()
    await userEvent.click(await c.findByRole("button", { name: /^Sprinkler repair/ }))
    await userEvent.click((await c.findAllByRole("radio", { name: /^Yes/ }))[0]!)
    await userEvent.click(await c.findByRole("button", { name: "Add 2 sample photos" }))
    await next()
    // the soonest day is already selected; only a time is tapped
    await expect(await c.findByRole("button", { name: /soonest/ })).toHaveAttribute("aria-pressed", "true")
    await userEvent.click((await c.findAllByRole("radio", { name: /\d:\d\d [ap]m/ }))[0]!)
    await next()
    await userEvent.type(await c.findByLabelText("First name"), "Andrea")
    await userEvent.type(await c.findByLabelText("Last name"), "Dalton")
    await userEvent.type(await c.findByLabelText("Email"), "andrea@example.org")
    await userEvent.type(await c.findByLabelText("Phone"), "9705550188")
    await userEvent.click(await c.findByRole("radio", { name: "Text and email" }))
    await userEvent.click(await c.findByRole("checkbox", { name: /I accept the/ }))
    await expect(c.getByRole("checkbox", { name: "Send me tips and offers from Trailhead by email" })).not.toBeChecked()
    await next()
    await userEvent.click(await c.findByRole("button", { name: "Save card" }))
    await expect(await c.findByText("We'll text and email a confirmation.")).toBeInTheDocument()
    await expect(c.getByText("Visa ending 4242")).toBeInTheDocument()
    await next("Confirm and book")
    await expect(await c.findByText("You added 2 photos.")).toBeInTheDocument()
  },
}

/** The request path on a phone, clicked: address, what we quote, details, contact, Send to Ryan. It has no day, no card and no review, and ends "Thanks. We've got your request." */
export const QuotePathPhone: Story = { ...phone, name: "Request a quote path, phone" }
export const QuotePathPhoneTest: Story = {
  ...phone,
  name: "Request a quote path, phone (test)",
  tags: HIDDEN,
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
    await userEvent.type(await c.findByLabelText("Email"), "andrea@example.org")
    await userEvent.type(await c.findByLabelText("Phone"), "9705550188")
    await next("Send to Ryan")
    await expect(await c.findByText("Thanks. We've got your request.")).toBeInTheDocument()
  },
}

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
  tags: HIDDEN,
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByRole("combobox", { name: "Street address" }), "123")
    await userEvent.click((await canvas.findAllByRole("option"))[0]!)
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await userEvent.click(await canvas.findByRole("button", { name: /^Sprinkler repair/ }))
    await userEvent.click((await canvas.findAllByRole("radio", { name: /^Yes/ }))[0]!)
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await expect(await canvas.findByRole("heading", { level: 1, name: "Day" })).toBeInTheDocument()
    // the browser's Back goes to the service, then the address, with the answers kept
    window.history.back()
    await expect(await canvas.findByRole("heading", { level: 1, name: "Service" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: /^Sprinkler repair/ })).toHaveAttribute("aria-expanded", "true")
    window.history.back()
    await expect(await canvas.findByRole("heading", { level: 1, name: "Address" })).toBeInTheDocument()
    await expect(canvas.getByRole("combobox", { name: "Street address" })).toHaveValue("123 Trailhead Way, Erie, CO 80516")
    // Forward comes back, and the Back button on the screen does the same as the browser's
    window.history.forward()
    await expect(await canvas.findByRole("heading", { level: 1, name: "Service" })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Back" }))
    await expect(await canvas.findByRole("heading", { level: 1, name: "Address" })).toBeInTheDocument()
    // the heading takes focus on a step change and the page is named for it
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await expect(await canvas.findByRole("heading", { level: 1, name: "Service" })).toHaveFocus()
    await expect(document.title).toContain("Service")
  },
}
