import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import { AccountNav } from "@/components/blocks/AccountNav"
import { fixtureDayTimes } from "@/lib/booking/day-time"
import type { Pass } from "@/lib/admin/types"
import { andrea, canceledRepairJob, invoicedJob, oneOffJob, partPaidJob, passJob, passJobInsideCutoff, passJobWindowTold, pastDueJob, repairJob, TODAY } from "./account-fixtures"
import { HomeScreen } from "./HomeScreen"
import { VisitScreen } from "./VisitScreen"
import { VisitsScreen } from "./VisitsScreen"

// The customer's account with a booked day AND time (docs/plans/2026-11-18-scheduling-engine-design.md section 2: a customer picks a day and an exact start). Home shows the next visit as
// "Wednesday, April 28 at 10:30 am" with "Ryan arrives between 10:30 and 11:00 am. We'll text you the day before."; the timeline shows each booked visit's time; Reschedule is the booking flow's
// own day-and-time picker; inside the cut-off it is Text Ryan and Call Ryan; a canceled visit and a paid visit with its receipt read as before. An open invoice sits at the top of Home under
// "Invoice", never a list screen. Fixtures only; the times map stands in for the API's `startTime`.
const pass = snapshot.passes[0] as Pass
const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const
const times = { v1: "10:30", v6: "13:00" }
const offers = { v1: fixtureDayTimes(60), v6: fixtureDayTimes(60) }
const actions = { onReschedule: fn(async () => ({ ok: true as const })), onRescheduleTime: fn(async () => ({ ok: true as const })), onCancel: fn(async () => ({ ok: true as const })) }
const calendar = { googleHref: "https://calendar.google.com/calendar/render?action=TEMPLATE", icsHref: "/api/visits/v1/calendar.ics?token=t" }

const meta = {
  title: "Screens/Account day and time",
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="min-h-svh bg-cream">
        <AccountNav firstName="Andrea" current="/account" />
        <Story />
      </div>
    ),
  ],
} satisfies Meta
export default meta
type Story = StoryObj

const home = (jobs = [passJob, repairJob], today = TODAY) => ({ render: () => <HomeScreen customer={andrea} jobs={jobs} today={today} pass={pass} times={times} offers={offers} {...actions} /> })
/** Home: the next visit with its day and booked time, the arrival half hour, and Reschedule and Cancel visit. */
export const HomePhone: Story = { ...phone, ...home() }
export const HomeLaptop: Story = { ...laptop, ...home() }
/** The day-before text went out: the same sentence without "We'll text you the day before." */
export const HomeTextedPhone: Story = { ...phone, ...home([passJobWindowTold, repairJob], "2027-04-27") }
/** Inside 24 hours: Text Ryan and Call Ryan replace the buttons; the time still shows. */
export const HomeInsideCutoffPhone: Story = { ...phone, ...home([passJobInsideCutoff, repairJob], "2027-04-27") }
export const HomeInsideCutoffLaptop: Story = { ...laptop, ...home([passJobInsideCutoff, repairJob], "2027-04-27") }
/** An open invoice at the top: "Repair: $115 unpaid, due Dec 1" and Pay now. */
export const HomeInvoicePhone: Story = { ...phone, ...home([passJob, invoicedJob, repairJob]) }
export const HomeInvoiceLaptop: Story = { ...laptop, ...home([passJob, invoicedJob, repairJob]) }
/** Past due: the same line in the alert colour, "past due since Apr 1". */
export const HomePastDuePhone: Story = { ...phone, ...home([passJob, pastDueJob, repairJob]) }
export const HomePastDueLaptop: Story = { ...laptop, ...home([passJob, pastDueJob, repairJob]) }

const timeline = { render: () => <VisitsScreen customer={andrea} jobs={[passJob, oneOffJob, repairJob, invoicedJob, canceledRepairJob]} today={TODAY} times={times} /> }
/** The timeline: Coming up with each visit's time, then Past. */
export const TimelinePhone: Story = { ...phone, ...timeline }
export const TimelineLaptop: Story = { ...laptop, ...timeline }

const visit = (job: typeof passJob, id: string, today = TODAY, cal = true) => ({ render: () => <VisitScreen customer={andrea} job={job} visitId={id} today={today} times={times} offers={offers.v1} days={[]} calendar={cal ? calendar : undefined} {...actions} /> })
export const VisitPhone: Story = { ...phone, ...visit(passJob, "v1") }
export const VisitLaptop: Story = { ...laptop, ...visit(passJob, "v1") }
const openSheet = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  await userEvent.click(within(canvasElement).getByRole("button", { name: "Reschedule" }))
  await expect(await within(document.body).findByRole("dialog")).toBeInTheDocument()
}
/** Reschedule: the booking flow's day and time picker, her own time offered again, a button that names the day and time. */
export const VisitRescheduleOpenPhone: Story = { ...phone, ...visit(passJob, "v1"), play: openSheet }
export const VisitRescheduleOpenLaptop: Story = { ...laptop, ...visit(passJob, "v1"), play: openSheet }
/** Inside the cut-off: Text Ryan and Call Ryan, and the reason. */
export const VisitInsideCutoffPhone: Story = { ...phone, ...visit(passJobInsideCutoff, "v1", "2027-04-27") }
export const VisitInsideCutoffLaptop: Story = { ...laptop, ...visit(passJobInsideCutoff, "v1", "2027-04-27") }
/** A canceled visit: it says so, offers Text Ryan to add it back and Book Online. */
export const VisitCanceledPhone: Story = { ...phone, ...visit(canceledRepairJob, "v8", TODAY, false) }
/** A paid visit with its receipt link. */
export const VisitPaidPhone: Story = { ...phone, ...visit(repairJob, "v3", TODAY, false) }
export const VisitPaidLaptop: Story = { ...laptop, ...visit(repairJob, "v3", TODAY, false) }
export const VisitPartPaidPhone: Story = { ...phone, ...visit(partPaidJob, "v5", TODAY, false) }
