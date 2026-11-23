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
// a card and a review: seven counted steps, four for a request for a quote; the service step holds only the cards and Details holds what belongs to the chosen service. Every heading is a plain name. The words are in docs/plans/2026-11-19-booking-form-design.md, "Words (Nov 22 2026)".
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
// 480 Briggs St, Erie is a property Trailhead already has (the stand-in `fixtureKnown`); its customer's email is andrea.dalton@example.com, which `person` carries.
const known: Partial<CheckoutState> = { address: FIXTURE_PLACES[1]!.label, place: FIXTURE_PLACES[1]!, town: "Erie" }
const detailsKnown: Partial<CheckoutState> = { ...known, access: "yes", accessNote: "Gate code 4471, the controller is in the garage." }
const fullKnown: Partial<CheckoutState> = { ...detailsKnown, ...person }
const fullKnownOtherEmail: Partial<CheckoutState> = { ...fullKnown, email: "andrea@work.example.com" }
// April 19 is an open day and 10:30 one of its times.
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
    await waitFor(() => expect(canvas.getByLabelText("City")).toHaveFocus(), { timeout: 5000 })
    await expect(canvas.getByLabelText("Street address")).toHaveValue("9 Cottonwood Ln")
  },
}

/** 2. Service: only the service cards. Each is a photo, its name, one line of what it is, the price and the length and a chevron, the whole header the button. Nothing is open until one is pressed, and nothing about zones, prices or access is on this step. */
const services = on({ initial: { step: "service", fields: home } }, "Service", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /^Sprinkler repair/ })).toHaveAttribute("aria-expanded", "false")
    await expect(canvas.getByRole("button", { name: /^Spring turn-on/ })).toHaveTextContent("From $145")
    await expect(canvas.queryByText(/Opens|Free consultation|What's included/)).toBeNull()
    await expect(canvas.queryByText(/Zones|Can we reach|Count the stations|Add a note/)).toBeNull()
  },
})
export const ServicesPhone: Story = { ...services.phone, name: "Service, phone" }
export const ServicesLaptop: Story = { ...services.laptop, name: "Service, laptop" }
/** The repair card open: only what is included, as a list, with a check on the chosen card. Continue is on. */
const repairOpen = on({ initial: { step: "service", service: "repair", fields: home } }, "Service, repair open", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /^Sprinkler repair/ })).toHaveAttribute("aria-expanded", "true")
    const panel = canvas.getByRole("region", { name: "Sprinkler repair" })
    await expect(within(panel).getAllByRole("listitem").length).toBeGreaterThan(0)
    await expect(canvas.queryByText(/About \$145|Charged after|Zones|Upgrade to a Season Pass/)).toBeNull()
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeEnabled()
  },
})
export const ServiceRepairOpenPhone: Story = { ...repairOpen.phone, name: "Service, repair open, phone" }
export const ServiceRepairOpenLaptop: Story = { ...repairOpen.laptop, name: "Service, repair open, laptop" }
/** The Season Pass card open, its brand treatment: the visits it holds, nothing else. */
const passOpen = on({ initial: { step: "service", service: "season-pass", fields: home } }, "Service, Season Pass open")
export const ServicePassOpenPhone: Story = { ...passOpen.phone, name: "Service, Season Pass open, phone" }
export const ServicePassOpenLaptop: Story = { ...passOpen.laptop, name: "Service, Season Pass open, laptop" }

/** 3. Details: what belongs to the chosen service and nothing else, one quiet section per question. A repair: the price, access, and the note and photos folded behind one row. */
const detailsRepair = on({ initial: { step: "details", service: "repair", fields: home } }, "Details, repair", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Details" })).toBeInTheDocument()
    await expect(canvas.getByText("About $145")).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: /Add a note or photos/ })).toHaveAttribute("aria-expanded", "false")
    await expect(canvas.queryByLabelText("Note for the crew")).toBeNull()
    await expect(canvas.queryByRole("button", { name: "Add photos" })).toBeNull()
    await expect(canvas.queryByText(/Charged after/)).toBeNull()
  },
})
export const DetailsRepairPhone: Story = { ...detailsRepair.phone, name: "Details, repair, phone" }
export const DetailsRepairLaptop: Story = { ...detailsRepair.laptop, name: "Details, repair, laptop" }
/** Access answered, a note and two photos: the folded row is open from the start because it holds something. */
const detailsFilled = on({ initial: { step: "details", service: "repair", fields: details, photos } }, "Details, note and photos", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /Add a note or photos/ })).toHaveAttribute("aria-expanded", "true")
    await expect(canvas.getByLabelText("Note for the crew")).toHaveValue("Gate code 4471, the controller is in the garage.")
  },
})
export const DetailsFilledPhone: Story = { ...detailsFilled.phone, name: "Details, note and photos, phone" }
export const DetailsFilledLaptop: Story = { ...detailsFilled.laptop, name: "Details, note and photos, laptop" }
/** The spring turn-on: zones as 6 or fewer, 7 to 12 and More than 12, the price by the catalogue's per-zone rule, and Upgrade to a Season Pass, off. Zones are explained once, in a tooltip. */
const turnOnDetails = on({ initial: { step: "details", service: "spring-turn-on", fields: { ...home, zones: 10 } } }, "Details, spring turn-on", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "6 or fewer" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "10 zones" })).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByText("About $165")).toBeInTheDocument()
    await expect(canvas.queryByText("Count the stations on your controller.")).toBeNull()
    await expect(canvas.getByRole("button", { name: "About zones" })).toBeInTheDocument()
    await expect(canvas.getByRole("switch", { name: "Upgrade to a Season Pass" })).toHaveAttribute("aria-checked", "false")
  },
})
export const DetailsTurnOnPhone: Story = { ...turnOnDetails.phone, name: "Details, spring turn-on, phone" }
export const DetailsTurnOnLaptop: Story = { ...turnOnDetails.laptop, name: "Details, spring turn-on, laptop" }
/** The Season Pass: the zones and, for each visit, what it costs. */
const passDetails = on({ initial: { step: "details", service: "season-pass", fields: { ...home, zones: 10 } } }, "Details, Season Pass")
export const DetailsPassPhone: Story = { ...passDetails.phone, name: "Details, Season Pass, phone" }
export const DetailsPassLaptop: Story = { ...passDetails.laptop, name: "Details, Season Pass, laptop" }
/** More than 12 opens a number box; above 12 the same per-zone price, no new band. */
export const DetailsZonesManyTest: Story = {
  ...phone,
  name: "Details, more than 12 zones (test)",
  tags: HIDDEN,
  args: { initial: { step: "details", service: "spring-turn-on", fields: { ...home, zones: 8 } } },
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
export const DetailsUpsellTest: Story = {
  ...phone,
  name: "Details, upgrade to a Season Pass (test)",
  tags: HIDDEN,
  args: { initial: { step: "details", service: "spring-turn-on", fields: { ...details, zones: 10 } } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("switch", { name: "Upgrade to a Season Pass" }))
    await expect(await canvas.findByText(/Spring turn-on/)).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "10 zones" })).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByRole("switch", { name: "Upgrade to a Season Pass" })).toHaveAttribute("aria-checked", "true")
    await userEvent.click(canvas.getByRole("switch", { name: "Upgrade to a Season Pass" }))
    await expect(await canvas.findByText("About $165")).toBeInTheDocument()
  },
}
/** Continue pressed with the access question unanswered. */
const accessMissing = on({ initial: { step: "details", service: "repair", fields: home, attempted: true } }, "Details, access not answered", {
  play: async ({ canvas }) => {
    await expect((await canvas.findAllByText("Tell us whether we can get to the system without you.")).length).toBe(2)
  },
})
export const DetailsAccessMissingPhone: Story = { ...accessMissing.phone, name: "Details, access not answered, phone" }
/** The questions that belong to a service: the Rachio install asks the controller and Wi-Fi, water efficiency what to improve (and it is $145), the installation design visit the project, the area and photos. */
const rachioOpen = on({ initial: { step: "details", service: "rachio-install", fields: { ...details, zones: 10 }, extras: { brand: "Hunter", wifi: "yes" } } }, "Details, Rachio install")
export const DetailsRachioPhone = rachioOpen.phone
export const DetailsRachioLaptop = rachioOpen.laptop
const efficiencyOpen = on({ initial: { step: "details", service: "water-efficiency", fields: details, extras: { goals: ["Dry spots", "A garden bed to put on drip"] } } }, "Details, water efficiency and drip", {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("About $145")).toBeInTheDocument()
  },
})
export const DetailsEfficiencyPhone = efficiencyOpen.phone
export const DetailsEfficiencyLaptop = efficiencyOpen.laptop
// The installation is quote-only in the backend; with Settings set to Book a day it is a design visit with no price.
const INSTALL_BOOKABLE = bookingCatalogue({ install: "bookable" })
const installOpen = on({ catalogue: INSTALL_BOOKABLE, initial: { step: "details", service: "install", fields: details, extras: { installType: "new", area: "5,000" }, photos } }, "Details, new system design visit (set to Book a day)")
export const DetailsInstallPhone = installOpen.phone
export const DetailsInstallLaptop = installOpen.laptop

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

/** 3. Day: a month calendar. The soonest open day is chosen and marked, every open day carries a quiet dot, days with nothing open are plain, and the times of the chosen day are under it, none chosen. */
const day = on({ initial: { step: "day", service: "repair", fields: details } }, "Day", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Day" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: /Thursday, April 15, soonest/ })).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByRole("button", { name: "Monday, April 19" })).toBeInTheDocument()
    await expect(canvas.queryByText(/Recommended|Best fit/)).toBeNull()
    await expect(canvas.getByRole("button", { name: /Wednesday, April 21, no times open/ })).toHaveAttribute("aria-disabled", "true")
    await expect(canvas.queryByText(/Tuesdays|texts you the day before|already in Erie|Show more days/)).toBeNull()
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeDisabled()
  },
})
export const DayPhone: Story = { ...day.phone, name: "Day, phone" }
export const DayLaptop: Story = { ...day.laptop, name: "Day, laptop" }
/** A day picked and a time tapped: Continue is on. */
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

/** 4. Contact with how we reach you, after the day: four fields, text, email or both (explained once, in a tooltip), the unticked marketing box, and over the button bar one line: By continuing, you agree to the terms. There is no terms checkbox. */
const contact = on({ initial: { step: "contact", service: "repair", fields: details, picks: picked } }, "Contact", {
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/Reply STOP|Message and data rates/)).toBeNull()
    await expect(canvas.getByText(/By continuing, you agree to the/)).toBeInTheDocument()
    await expect(canvas.getByRole("link", { name: /booking terms/ })).toHaveAttribute("href", "/terms#booking")
    await expect(canvas.queryByRole("checkbox", { name: /I accept/ })).toBeNull()
    await expect(canvas.getByRole("checkbox", { name: "Send me tips and offers from Trailhead by email" })).not.toBeChecked()
    await expect(canvas.queryByText(/Every message both ways|We reach you by/)).toBeNull()
    await expect(canvas.getByRole("button", { name: "About how we reach you" })).toBeInTheDocument()
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
    await expect(canvas.queryByText(/Tick the box|Terms/)).toBeNull()
  },
})
export const ContactMissingPhonePhone: Story = { ...contactMissing.phone, name: "Contact, missing phone and terms, phone" }
export const ContactMissingPhoneLaptop: Story = { ...contactMissing.laptop, name: "Contact, missing phone and terms, laptop" }
/** 4b. The request path ends on contact: no terms line, no review, and the button says Send to Ryan. */
const quoteContact = on({ initial: { step: "contact", quote: true, service: "lights", fields: { ...home, accessNote: "Lights along the front roofline." } } }, "Request a quote, contact")
export const QuotePathContactPhone: Story = { ...quoteContact.phone, name: "Request a quote, contact, phone" }
export const QuotePathContactLaptop: Story = { ...quoteContact.laptop, name: "Request a quote, contact, laptop" }

/** 4c. A repeat customer is recognised by the address alone (Hannah, Nov 23 2026): no sign-in, no code, and nothing personal shown back. The contact step asks as normal for a property we have. */
const contactKnown = on({ initial: { step: "contact", service: "repair", fields: detailsKnown, picks: picked } }, "Contact, an address we have", {
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("First name")).toHaveValue("")
    await expect(canvas.queryByText(/Andrea|Dalton|4242|Welcome back|Booked with us before|sign in|code/i)).toBeNull()
  },
})
export const ContactAddressOnFilePhone: Story = { ...contactKnown.phone, name: "Contact, an address we have, phone" }
export const ContactAddressOnFileLaptop: Story = { ...contactKnown.laptop, name: "Contact, an address we have, laptop" }
/** Picking an address we have shows nothing about its customer, and the yard's zone count and controller fill in on the service step. */
export const AddressOnFileTest: Story = {
  ...phone,
  name: "Address we have, prefills the yard (test)",
  tags: HIDDEN,
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByRole("combobox", { name: "Street address" }), "480 Br")
    await userEvent.click(await canvas.findByRole("option", { name: /480 Briggs/ }))
    await expect(canvas.queryByText(/Andrea|Dalton|4242|On file|Welcome back/)).toBeNull()
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await userEvent.click(await canvas.findByRole("button", { name: /^Spring turn-on/ }))
    await expect(await canvas.findByRole("button", { name: "10 zones" })).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.queryByText(/Andrea|Dalton|4242/)).toBeNull()
  },
}

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

/** A repeat customer, same email: the card step offers "Use the card on file" with its brand and last four, and "Use a different card". Continue goes on with it. */
const cardOnFile = on({ initial: { step: "card", service: "repair", fields: fullKnown, picks: picked } }, "Card, the card on file", {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Use the card on file")).toBeInTheDocument()
    await expect(canvas.getByText("Visa ending 4242")).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Use a different card" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeEnabled()
    await expect(canvas.queryByText(/Stripe/)).toBeNull()
  },
})
export const CardOnFilePhone: Story = { ...cardOnFile.phone, name: "Card, the card on file, phone" }
export const CardOnFileLaptop: Story = { ...cardOnFile.laptop, name: "Card, the card on file, laptop" }
/** A repeat customer with another email: the address is on file but the card is not offered; the step asks for a card as for a new customer. */
const cardOtherEmail = on({ initial: { step: "card", service: "repair", fields: fullKnownOtherEmail, picks: picked } }, "Card, the address is on file, another email", {
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/Use the card on file|4242/)).toBeNull()
    await expect(canvas.getByText("Card information")).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Save card" })).toBeEnabled()
  },
})
export const CardOtherEmailPhone: Story = { ...cardOtherEmail.phone, name: "Card, the address is on file, another email, phone" }
export const CardOtherEmailLaptop: Story = { ...cardOtherEmail.laptop, name: "Card, the address is on file, another email, laptop" }
/** "Use a different card" puts the form back, and "Use the card on file" brings the card back. */
export const CardDifferentCardTest: Story = {
  ...phone,
  name: "Card, a different card (test)",
  tags: HIDDEN,
  args: { initial: { step: "card", service: "repair", fields: fullKnown, picks: picked } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Use a different card" }))
    await expect(await canvas.findByText("Card information")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Use the card on file" }))
    await expect(await canvas.findByText("Visa ending 4242")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await expect(await canvas.findByRole("heading", { level: 1, name: "Review" })).toBeInTheDocument()
    await expect(canvas.getByText("Visa ending 4242")).toBeInTheDocument()
    await expect(canvas.getByText("On file")).toBeInTheDocument()
  },
}
/** Review of a booking for an address we have: its Address row says On file and the card on file is named. A new address says New. */
const confirmOnFile = on({ initial: { step: "confirm", service: "repair", fields: fullKnown, picks: picked, card: "file" } }, "Review, an address on file", {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("On file")).toBeInTheDocument()
    await expect(canvas.getByText("Visa ending 4242")).toBeInTheDocument()
  },
})
export const ConfirmOnFilePhone: Story = { ...confirmOnFile.phone, name: "Review, an address on file, phone" }
export const ConfirmOnFileLaptop: Story = { ...confirmOnFile.laptop, name: "Review, an address on file, laptop" }
/** The address is on file and the email is another: it books as the same property; the card is a new one, and the office is told. */
const confirmOtherEmail = on({ initial: { step: "confirm", service: "repair", fields: fullKnownOtherEmail, picks: picked, card: "saved" } }, "Review, an address on file, another email", {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("On file")).toBeInTheDocument()
    await expect(canvas.queryByText(/differs|Email differs/)).toBeNull()
  },
})
export const ConfirmOtherEmailPhone: Story = { ...confirmOtherEmail.phone, name: "Review, an address on file, another email, phone" }
/** Changing the email at Review so it is no longer the one on file takes the card on file away: the form asks for a card again. */
export const ConfirmEmailChangedTest: Story = {
  ...phone,
  name: "Review, email changed after the card on file (test)",
  tags: HIDDEN,
  args: { initial: { step: "confirm", service: "repair", fields: fullKnown, picks: picked, card: "file" } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Change contact" }))
    const email = await canvas.findByLabelText("Email")
    await userEvent.clear(email)
    await userEvent.type(email, "andrea@work.example.com")
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await expect(await canvas.findByRole("heading", { level: 1, name: "Card" })).toBeInTheDocument()
    await expect(canvas.queryByText(/Use the card on file|4242/)).toBeNull()
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

/** The whole path on a phone, clicked: address, the repair card, Details with access and two sample photos, a time, contact with Text and email, the card, review, booked. Seven steps. */
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
    await next()
    await userEvent.click((await c.findAllByRole("radio", { name: /^Yes/ }))[0]!)
    await userEvent.click(await c.findByRole("button", { name: /Add a note or photos/ }))
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
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await userEvent.click((await canvas.findAllByRole("radio", { name: /^Yes/ }))[0]!)
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))
    await expect(await canvas.findByRole("heading", { level: 1, name: "Day" })).toBeInTheDocument()
    // the browser's Back goes to Details, then the service, then the address, with the answers kept
    window.history.back()
    await expect(await canvas.findByRole("heading", { level: 1, name: "Details" })).toBeInTheDocument()
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
