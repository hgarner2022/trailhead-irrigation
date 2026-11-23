import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { FIXTURE_HOME } from "@/lib/places/fixture"
import type { CheckoutState } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { BookingForm, type BookingFormProps } from "./BookingForm"

// The Season Pass path of the booking form, over fixtures at 375 (Phone) and 1280 (Laptop); nothing is sent. The pass can be bought whenever, and it holds each kind's next visit (docs/plans/2026-11-20-season-pass-booking-research.md,
// Hannah's decisions of Nov 20 to 22 2026): a visit whose window is open now or opens within a month (April for the spring turn-on, September and October for the blowout) is booked with an exact day and time on a calendar;
// every other visit takes Our recommended, Early season or Late season by name and is scheduled about two weeks before. No opening day is shown anywhere: the windows are the scheduler's settings (turn-on May 1 to 31,
// blowout October 1 to November 15) and the dates are not confirmed. The pass is a SETUP, not an order: each visit shows what it costs and the card says when it is charged. One purchase per story: January (two preferences),
// April (the turn-on now, the blowout a preference), July (the blowout and next spring's turn-on, both preferences), October (the blowout now, next spring's turn-on a preference), November 20 (next season).
const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const

const home: Partial<CheckoutState> = { address: FIXTURE_HOME.label, place: FIXTURE_HOME, town: "Erie" }
const person: Partial<CheckoutState> = { firstName: "Andrea", lastName: "Dalton", email: "andrea@example.org", phone: "(970) 555-0188", termsAccepted: true }
const full: Partial<CheckoutState> = { ...home, access: "yes", accessNote: "", zones: 8, ...person }
const SAVED = { card: "saved" } as const
const TODAY = { january: "2027-01-12", april: "2027-04-14", july: "2027-07-14", october: "2027-10-12", november: "2027-11-20" } as const

const meta = {
  title: "Customer/Booking form, Season Pass",
  component: BookingForm,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The Season Pass path of the booking form, a setup and not an order: nothing is charged at sign-up. The pass card opens in place and holds the zones with each visit's price and \"We schedule your visits every season, so you never have to remember.\" A visit that is open now or within a month is booked with a calendar day and an exact time; every other visit, next season's included, takes Our recommended, Early season or Late season, and \"We'll schedule it about two weeks before and tell you the day.\" The preference is kept for every season. Then contact, the card (required, charged after each visit), review (\"Set up my Season Pass\") and the set-up card with every visit. No opening day is shown. Nothing is sent.",
      },
    },
  },
} satisfies Meta<typeof BookingForm>
export default meta
type Story = StoryObj<typeof meta>

const HIDDEN = ["!dev", "!autodocs"]
type Args = Partial<BookingFormProps>
const on = (args: Args, name: string, extra: Partial<Story> = {}): { phone: Story; laptop: Story } => ({
  phone: { ...phone, name: `${name}, phone`, args, ...extra },
  laptop: { ...laptop, name: `${name}, laptop`, args, ...extra },
})
const at = (month: keyof typeof TODAY, initial: NonNullable<Args["initial"]>): Args => ({ today: TODAY[month], initial: { service: "season-pass", fields: full, ...initial } })
// May 4 is a Tuesday inside the turn-on's window; October 14 is inside the blowout's.
const picked = { "turn-on": { day: "2027-05-04", start: "10:30" } }

/** 1. The pass card in April, open: the visits with their prices at the zone count, the one line about every season, and no opening day or "Opens". */
const servicesApril = on(at("april", { step: "service" }), "April, service", {
  play: async ({ canvas }) => {
    const card = canvas.getByRole("region", { name: /Season Pass 2027/ })
    await expect(within(card).getByText("Spring turn-on")).toBeInTheDocument()
    await expect(within(card).getByText("Fall blowout")).toBeInTheDocument()
    await expect(within(card).getByText("About $145")).toBeInTheDocument()
    await expect(within(card).getByText("About $115")).toBeInTheDocument()
    await expect(within(card).getByText("Charged after each visit.")).toBeInTheDocument()
    await expect(within(card).getByText("We schedule your visits every season, so you never have to remember.")).toBeInTheDocument()
    await expect(canvas.queryByText(/Opens|Apr 25|Auto-renews|What happens for you/)).toBeNull()
    // the upsell is a single visit's card, not the pass's own
    await expect(canvas.queryByRole("switch")).toBeNull()
  },
})
export const AprilServicesPhone = servicesApril.phone
export const AprilServicesLaptop = servicesApril.laptop
/** January: both visits are months away, so both take a preference. */
const servicesJanuary = on(at("january", { step: "service" }), "January, service")
export const JanuaryServicesPhone = servicesJanuary.phone
export const JanuaryServicesLaptop = servicesJanuary.laptop
/** July: the turn-on's window has closed, so the pass holds the blowout and next spring's turn-on, the second named with its year. */
const servicesJuly = on(at("july", { step: "service" }), "July, service", {
  play: async ({ canvas }) => {
    const card = canvas.getByRole("region", { name: /Season Pass 2027/ })
    await expect(within(card).getByText("Fall blowout")).toBeInTheDocument()
    await expect(within(card).getByText("Spring turn-on 2028")).toBeInTheDocument()
  },
})
export const JulyServicesPhone = servicesJuly.phone
export const JulyServicesLaptop = servicesJuly.laptop
/** November 20, after the last window closed: the pass is next season's and both visits are months away. */
const servicesNovember = on(at("november", { step: "service" }), "November, service", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /Season Pass 2028/ })).toBeInTheDocument()
  },
})
export const NovemberServicesPhone = servicesNovember.phone
export const NovemberServicesLaptop = servicesNovember.laptop

/** 2. April, the turn-on now: a calendar day and an exact time for the visit that is open (the blowout is not asked a day). It starts in May, so the calendar opens on May. */
const dayApril = on(at("april", { step: "day" }), "April, day", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Spring turn-on" })).toBeInTheDocument()
    await expect(canvas.queryByRole("heading", { name: "Fall blowout" })).toBeNull()
    await expect(canvas.getByText("May 2027")).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: /Monday, May 3, soonest/ })).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeDisabled()
  },
})
export const AprilDayPhone = dayApril.phone
export const AprilDayLaptop = dayApril.laptop
/** October: the blowout is open now and runs to November 15, so its calendar spans two months. */
const dayOctober = on(at("october", { step: "day" }), "October, day", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Fall blowout" })).toBeInTheDocument()
    await expect(canvas.getByText("October 2027")).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Next month" })).toBeEnabled()
  },
})
export const OctoberDayPhone = dayOctober.phone
export const OctoberDayLaptop = dayOctober.laptop

/** 3. The preference step: the visit by name, Our recommended pressed, Early season and Late season, with no dates and no months, and when it is scheduled. April asks the blowout only. */
const prefApril = on(at("april", { step: "preference", picks: picked }), "April, preference", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Fall blowout" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Our recommended" })).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByRole("button", { name: "Early season" })).toHaveAttribute("aria-pressed", "false")
    await expect(canvas.getByRole("button", { name: "Late season" })).toHaveAttribute("aria-pressed", "false")
    await expect(canvas.getByText("We'll schedule it about two weeks before and tell you the day.")).toBeInTheDocument()
    await expect(canvas.queryByText(/Oct|freeze|Mid/)).toBeNull()
  },
})
export const AprilPreferencePhone = prefApril.phone
export const AprilPreferenceLaptop = prefApril.laptop
/** January asks both visits. */
const prefJanuary = on(at("january", { step: "preference" }), "January, preference", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Preferences" })).toBeInTheDocument()
    await expect(canvas.getByRole("heading", { name: "Spring turn-on" })).toBeInTheDocument()
    await expect(canvas.getByRole("heading", { name: "Fall blowout" })).toBeInTheDocument()
  },
})
export const JanuaryPreferencePhone = prefJanuary.phone
export const JanuaryPreferenceLaptop = prefJanuary.laptop
/** July asks the blowout and next spring's turn-on, the second named with its year. */
const prefJuly = on(at("july", { step: "preference" }), "July, preference", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Fall blowout" })).toBeInTheDocument()
    await expect(canvas.getByRole("heading", { name: "Spring turn-on 2028" })).toBeInTheDocument()
  },
})
export const JulyPreferencePhone = prefJuly.phone
export const JulyPreferenceLaptop = prefJuly.laptop
/** October: the blowout has its day, so only next spring's turn-on is asked. */
const prefOctober = on(at("october", { step: "preference", picks: { blowout: { day: "2027-10-14", start: "09:00" } } }), "October, preference", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Spring turn-on 2028" })).toBeInTheDocument()
  },
})
export const OctoberPreferencePhone = prefOctober.phone
export const OctoberPreferenceLaptop = prefOctober.laptop
const prefNovember = on(at("november", { step: "preference" }), "November, preference")
export const NovemberPreferencePhone = prefNovember.phone
export const NovemberPreferenceLaptop = prefNovember.laptop

/** 4. The card for a pass: required, because the pass is billed after each visit, so there is no "Not now". */
const cardPass = on(at("april", { step: "card", picks: picked }), "April, card", {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Charged after each visit.")).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Not now" })).toBeNull()
  },
})
export const AprilCardPhone = cardPass.phone
export const AprilCardLaptop = cardPass.laptop

/** 5. Review: one row per visit, the exact day and time or the preference by name, and what each costs; the one line about every season. */
const confirmApril = on(at("april", { step: "confirm", picks: picked, prefs: { blowout: "earlier" }, ...SAVED }), "April, review", {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Preference: Early season")).toBeInTheDocument()
    await expect(canvas.getByText(/Tuesday, May 4 at 10:30 am/)).toBeInTheDocument()
    await expect(canvas.getByText("About $145")).toBeInTheDocument()
    await expect(canvas.getByText("About $115")).toBeInTheDocument()
    await expect(canvas.getByText(/We schedule your visits every season/)).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Set up my Season Pass" })).toBeEnabled()
    await expect(canvas.getByText("Visa ending 4242")).toBeInTheDocument()
    await expect(canvas.queryByText(/Next season:|Renews|Auto-renews|Total|Pay now|charged after/i)).toBeNull()
  },
})
export const AprilConfirmPhone = confirmApril.phone
export const AprilConfirmLaptop = confirmApril.laptop
const confirmJanuary = on(at("january", { step: "confirm", prefs: { "turn-on": "earlier", blowout: "later" }, ...SAVED }), "January, review")
export const JanuaryConfirmPhone = confirmJanuary.phone
export const JanuaryConfirmLaptop = confirmJanuary.laptop
/** November 20: the pass starts next season, so the review names the season. */
const confirmNovember = on(at("november", { step: "confirm", ...SAVED }), "November, review", {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("2028")).toBeInTheDocument()
  },
})
export const NovemberConfirmPhone = confirmNovember.phone
export const NovemberConfirmLaptop = confirmNovember.laptop
/** October: the blowout has its day, next spring's turn-on has its own preference, each with what it costs. */
const confirmOctober = on(at("october", { step: "confirm", picks: { blowout: { day: "2027-10-14", start: "09:00" } }, prefs: { "turn-on": "later" }, ...SAVED }), "October, review", {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Preference: Late season")).toBeInTheDocument()
    await expect(canvas.getByText(/Thursday, October 14 at 9:00 am/)).toBeInTheDocument()
  },
})
export const OctoberConfirmPhone = confirmOctober.phone
export const OctoberConfirmLaptop = confirmOctober.laptop

/** 6. Set up: the holographic card lists every visit, with its exact day and time or its preference and when it is scheduled. */
const bookedApril = on(at("april", { step: "done", picks: picked, prefs: { blowout: "earlier" }, ...SAVED }), "April, set up", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Your Season Pass 2027 is set up." })).toBeInTheDocument()
    await expect(canvas.getByRole("article", { name: /Season Pass 2027, set up.*Fall blowout Preference: Early season/ })).toBeInTheDocument()
    await expect(canvas.getByText("We'll schedule it about two weeks before and tell you the day.")).toBeInTheDocument()
    await expect(canvas.getByText("Visa ending 4242")).toBeInTheDocument()
  },
})
export const AprilBookedPhone = bookedApril.phone
export const AprilBookedLaptop = bookedApril.laptop
const bookedJanuary = on(at("january", { step: "done", prefs: { "turn-on": "earlier", blowout: "later" }, ...SAVED }), "January, set up")
export const JanuaryBookedPhone = bookedJanuary.phone
export const JanuaryBookedLaptop = bookedJanuary.laptop
const bookedJuly = on(at("july", { step: "done", prefs: { blowout: "recommended" }, ...SAVED }), "July, set up")
export const JulyBookedPhone = bookedJuly.phone
export const JulyBookedLaptop = bookedJuly.laptop
const bookedNovember = on(at("november", { step: "done", ...SAVED }), "November, set up")
export const NovemberBookedPhone = bookedNovember.phone
export const NovemberBookedLaptop = bookedNovember.laptop

/** The April purchase on a phone, clicked: the pass card with its access answer, a time for the turn-on, Late season for the blowout, contact, the card, review, a Change that returns to review, set up. Six steps. Hidden twin of the stories above. */
export const WholePassPathPhone: Story = { ...phone, name: "April, whole path, phone", args: { today: TODAY.april } }
export const WholePassPathPhoneTest: Story = {
  ...phone,
  name: "April, whole path (test)",
  tags: HIDDEN,
  args: { today: TODAY.april },
  play: async ({ canvasElement, userEvent }) => {
    const c = within(canvasElement)
    const next = async (name: string | RegExp = "Continue") => userEvent.click(await c.findByRole("button", { name }))
    await userEvent.type(await c.findByRole("combobox", { name: "Street address" }), "123")
    await userEvent.click((await c.findAllByRole("option"))[0]!)
    await next()
    await userEvent.click(await c.findByRole("button", { name: /^Season Pass 2027/ }))
    await userEvent.click((await c.findAllByRole("radio", { name: /^Yes/ }))[0]!)
    await next()
    await expect(await c.findByRole("heading", { name: "Spring turn-on" })).toBeInTheDocument()
    await userEvent.click((await c.findAllByRole("radio", { name: /\d:\d\d [ap]m/ }))[0]!)
    await next()
    await expect(await c.findByRole("heading", { level: 1, name: "Fall blowout" })).toBeInTheDocument()
    await userEvent.click(await c.findByRole("button", { name: "Late season" }))
    await next()
    await userEvent.type(await c.findByLabelText("First name"), "Andrea")
    await userEvent.type(await c.findByLabelText("Last name"), "Dalton")
    await userEvent.type(await c.findByLabelText("Email"), "andrea@example.org")
    await userEvent.type(await c.findByLabelText("Phone"), "9705550188")
    await userEvent.click(await c.findByRole("checkbox", { name: /I accept the/ }))
    await next()
    await expect(await c.findByText("Charged after each visit.")).toBeInTheDocument()
    await next("Save card")
    await expect(await c.findByText("Preference: Late season")).toBeInTheDocument()
    // the only Change links are here; a Change comes back to this step when the customer continues
    await userEvent.click(await c.findByRole("button", { name: "Change fall blowout" }))
    await userEvent.click(await c.findByRole("button", { name: "Our recommended" }))
    await next()
    await expect(await c.findByText("Preference: Our recommended")).toBeInTheDocument()
    await next("Set up my Season Pass")
    await expect(await c.findByRole("article", { name: /Fall blowout Preference: Our recommended/ })).toBeInTheDocument()
  },
}
