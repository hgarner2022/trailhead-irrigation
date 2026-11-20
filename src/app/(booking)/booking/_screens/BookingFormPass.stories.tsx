import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { FIXTURE_HOME } from "@/lib/places/fixture"
import type { CheckoutState } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { BookingForm, type BookingFormProps } from "./BookingForm"

// The Season Pass path of the booking form, over fixtures at 375 (Phone) and 1280 (Laptop); nothing is sent. The pass can be bought whenever, and it holds only the visits still ahead for the day
// (docs/plans/2026-11-20-season-pass-booking-research.md, Hannah's decisions of Nov 20 2026): a visit that is open now or opens within two weeks is booked with an exact day and time; a visit months
// away takes Early, Mid or Late in its window and is scheduled about two weeks before; the pass renews each season until the customer cancels; a buyer in November or December starts next season.
// One purchase per story: January (two preferences), April (the turn-on now, the blowout a preference), July (the blowout, a preference), November (next season, two preferences).
const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const

const home: Partial<CheckoutState> = { address: FIXTURE_HOME.label, place: FIXTURE_HOME, town: "Erie" }
const person: Partial<CheckoutState> = { firstName: "Andrea", lastName: "Dalton", email: "andrea.dalton@example.com", phone: "(970) 555-0123", termsAccepted: true }
const full: Partial<CheckoutState> = { ...home, access: "yes", accessNote: "", zones: 8, ...person }
const TODAY = { january: "2027-01-12", april: "2027-04-14", july: "2027-07-14", november: "2027-11-09" } as const

const meta = {
  title: "Customer/Booking form, Season Pass",
  component: BookingForm,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The Season Pass path of the booking form for four purchase months. The pass shows only the visits still ahead with their lengths, prices and opening days. A visit that is open now (or opens within two weeks) is booked with an exact day and time; a visit months away takes Early, Mid or Late with the window's real dates, and \"We'll schedule it about two weeks before and tell you the day.\" Then contact, the agreement (a marked placeholder until Hannah writes it, with the renewal as stated facts), confirm and the booked card with every visit. Nothing is sent.",
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
const picked = { "turn-on": { day: "2027-04-29", start: "10:30" } }

/** 1. The service list in April: the Season Pass with the turn-on (opens Apr 25, 1 hour, $145) and the blowout (opens Oct 1, 30 minutes, $95), and the total only for these. */
const servicesApril = on(at("april", { step: "service" }), "April, services", {
  play: async ({ canvas }) => {
    const card = within(canvas.getByRole("radio", { name: /Season Pass 2027/ }).closest("li")!)
    await expect(card.getByText("Spring turn-on")).toBeInTheDocument()
    await expect(card.getByText("Fall blowout")).toBeInTheDocument()
    await expect(card.getByText(/About 30 minutes · Opens Oct 1/)).toBeInTheDocument()
    await expect(card.getByText("From $95")).toBeInTheDocument()
  },
})
export const AprilServicesPhone = servicesApril.phone
export const AprilServicesLaptop = servicesApril.laptop
/** January: both visits are months away, so both are on the pass. */
const servicesJanuary = on(at("january", { step: "service" }), "January, services")
export const JanuaryServicesPhone = servicesJanuary.phone
export const JanuaryServicesLaptop = servicesJanuary.laptop
/** July: the turn-on's window has closed, so the pass holds only the blowout, at its own price. */
const servicesJuly = on(at("july", { step: "service" }), "July, services", {
  play: async ({ canvas }) => {
    const card = within(canvas.getByRole("radio", { name: /Season Pass 2027/ }).closest("li")!)
    await expect(card.queryByText("Spring turn-on")).toBeNull()
    await expect(card.getByText("Fall blowout")).toBeInTheDocument()
  },
})
export const JulyServicesPhone = servicesJuly.phone
export const JulyServicesLaptop = servicesJuly.laptop
/** November: nothing is left this season, so the pass is next season's and both visits are months away. */
const servicesNovember = on(at("november", { step: "service" }), "November, services", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radio", { name: /Season Pass 2028/ })).toBeInTheDocument()
  },
})
export const NovemberServicesPhone = servicesNovember.phone
export const NovemberServicesLaptop = servicesNovember.laptop

/** 2. April, the turn-on now: an exact day and time for the visit that is open (the blowout is not asked a day). */
const dayApril = on(at("april", { step: "day" }), "April, day and time", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Your spring turn-on" })).toBeInTheDocument()
    await expect(canvas.queryByRole("heading", { name: "Your fall blowout" })).toBeNull()
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeDisabled()
  },
})
export const AprilDayPhone = dayApril.phone
export const AprilDayLaptop = dayApril.laptop

/** 3. The preference step: Early, Mid and Late with the window's real dates, Mid pressed, and when it is scheduled. April asks the blowout only. */
const prefApril = on(at("april", { step: "preference", picks: picked }), "April, preference", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /Mid.*Oct 11 to Oct 20/ })).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByText("We'll schedule it about two weeks before and tell you the day.")).toBeInTheDocument()
  },
})
export const AprilPreferencePhone = prefApril.phone
export const AprilPreferenceLaptop = prefApril.laptop
/** January asks both visits. */
const prefJanuary = on(at("january", { step: "preference" }), "January, preference", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Your spring turn-on" })).toBeInTheDocument()
    await expect(canvas.getByRole("heading", { name: "Your fall blowout" })).toBeInTheDocument()
  },
})
export const JanuaryPreferencePhone = prefJanuary.phone
export const JanuaryPreferenceLaptop = prefJanuary.laptop
const prefJuly = on(at("july", { step: "preference" }), "July, preference")
export const JulyPreferencePhone = prefJuly.phone
export const JulyPreferenceLaptop = prefJuly.laptop
const prefNovember = on(at("november", { step: "preference" }), "November, preference")
export const NovemberPreferencePhone = prefNovember.phone
export const NovemberPreferenceLaptop = prefNovember.laptop

/** 4. The agreement: a marked placeholder where Hannah's wording goes, and the renewal as facts. */
const agreement = on(at("april", { step: "agreement", picks: picked }), "April, agreement", {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("[Wording from Hannah]")).toBeInTheDocument()
    await expect(canvas.getByText("Auto-renews each season until you cancel.")).toBeInTheDocument()
  },
})
export const AprilAgreementPhone = agreement.phone
export const AprilAgreementLaptop = agreement.laptop

/** 5. Confirm: one row per visit, the exact day and time or the preference with when it is scheduled, and the renewal. */
const confirmApril = on(at("april", { step: "confirm", picks: picked, prefs: { blowout: "earlier" } }), "April, confirm", {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Preference: Early October. We'll schedule it about two weeks before and tell you the day.")).toBeInTheDocument()
    await expect(canvas.getByText(/Thursday, April 29 at 10:30 am/)).toBeInTheDocument()
  },
})
export const AprilConfirmPhone = confirmApril.phone
export const AprilConfirmLaptop = confirmApril.laptop
const confirmJanuary = on(at("january", { step: "confirm", prefs: { "turn-on": "earlier", blowout: "later" } }), "January, confirm")
export const JanuaryConfirmPhone = confirmJanuary.phone
export const JanuaryConfirmLaptop = confirmJanuary.laptop
/** November: the pass starts next season, so the confirm step names the season. */
const confirmNovember = on(at("november", { step: "confirm" }), "November, confirm", {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("2028")).toBeInTheDocument()
  },
})
export const NovemberConfirmPhone = confirmNovember.phone
export const NovemberConfirmLaptop = confirmNovember.laptop

/** 6. Booked: the holographic card lists every visit, with its exact day and time or "Preference: Early October" and when it is scheduled. */
const bookedApril = on(at("april", { step: "done", picks: picked, prefs: { blowout: "earlier" } }), "April, booked", {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("article", { name: /Season Pass 2027, booked.*Fall blowout Preference: Early October/ })).toBeInTheDocument()
    await expect(canvas.getByText("We'll schedule it about two weeks before and tell you the day.")).toBeInTheDocument()
  },
})
export const AprilBookedPhone = bookedApril.phone
export const AprilBookedLaptop = bookedApril.laptop
const bookedJanuary = on(at("january", { step: "done", prefs: { "turn-on": "earlier", blowout: "later" } }), "January, booked")
export const JanuaryBookedPhone = bookedJanuary.phone
export const JanuaryBookedLaptop = bookedJanuary.laptop
const bookedJuly = on(at("july", { step: "done", prefs: { blowout: "recommended" } }), "July, booked")
export const JulyBookedPhone = bookedJuly.phone
export const JulyBookedLaptop = bookedJuly.laptop
const bookedNovember = on(at("november", { step: "done" }), "November, booked")
export const NovemberBookedPhone = bookedNovember.phone
export const NovemberBookedLaptop = bookedNovember.laptop

/** The April purchase on a phone, clicked: the pass, the details, a time for the turn-on, Late for the blowout, contact, the agreement, confirm, booked. Hidden twin of the stories above. */
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
    await userEvent.click(await c.findByRole("radio", { name: /Season Pass 2027/ }))
    await next()
    await userEvent.click((await c.findAllByRole("radio", { name: /^Yes/ }))[0]!)
    await next()
    await expect(await c.findByRole("heading", { name: "Your spring turn-on" })).toBeInTheDocument()
    await userEvent.click((await c.findAllByRole("radio", { name: /\d:\d\d [ap]m/ }))[0]!)
    await next()
    await expect(await c.findByText("When would you like it?")).toBeInTheDocument()
    await userEvent.click(await c.findByRole("button", { name: /Late.*Oct 21 to Oct 31/ }))
    await next()
    await userEvent.type(await c.findByLabelText("First name"), "Andrea")
    await userEvent.type(await c.findByLabelText("Last name"), "Dalton")
    await userEvent.type(await c.findByLabelText("Email"), "andrea.dalton@example.com")
    await userEvent.type(await c.findByLabelText("Phone"), "9705550123")
    await userEvent.click(await c.findByRole("checkbox", { name: /I accept the/ }))
    await next()
    await expect(await c.findByText("[Wording from Hannah]")).toBeInTheDocument()
    await next()
    await expect(await c.findByText("Preference: Late October. We'll schedule it about two weeks before and tell you the day.")).toBeInTheDocument()
    await next("Confirm and book")
    await expect(await c.findByRole("article", { name: /Fall blowout Preference: Late October/ })).toBeInTheDocument()
  },
}
