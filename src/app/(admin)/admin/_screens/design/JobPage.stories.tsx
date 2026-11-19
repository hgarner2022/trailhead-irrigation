import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { AdminShell } from "@/components/blocks/AdminShell"
import { JobPage } from "./JobPage"
import { STATE_NOTES, jobPageOf, type JobState } from "./job-fixtures"

// The job page for a one-trip job in every state Hannah listed, at 1280 (Laptop) and 375 (Phone). Each story says what Ryan sees and what
// the one primary action is. Pure screens over fixtures: no handlers, no API.

const meta = {
  title: "Design/Job page, one trip",
  component: JobPage,
  parameters: { layout: "fullscreen" },
  args: { job: jobPageOf("scheduled") },
  render: (args) => (
    <AdminShell current="jobs" user={{ initials: "HG", name: "Hannah" }}>
      <JobPage {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof JobPage>
export default meta
type Story = StoryObj<typeof meta>

const laptop = { viewport: { value: "laptop", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }
const story = (state: JobState, globals: typeof laptop): Story => ({ args: { job: jobPageOf(state) }, globals, parameters: { docs: { description: { story: STATE_NOTES[state] } } } })

/** Ryan sees a repair with no day. The one primary action is Schedule. */
export const Unscheduled: Story = story("unscheduled", laptop)
export const UnscheduledPhone: Story = story("unscheduled", phone)

/** Ryan sees the day, who and Any time. The one primary action is Move; Mark done is one tap beside it. */
export const ScheduledAhead: Story = story("scheduled", laptop)
export const ScheduledAheadPhone: Story = story("scheduled", phone)

/** Ryan sees today with the time the customer was told. The one primary action is On my way, then Mark done. */
export const Today: Story = story("today", laptop)
export const TodayPhone: Story = story("today", phone)

/** After Send on On my way: Active since 9:12 am under the time. The one primary action is Mark done. */
export const OnTheWay: Story = story("on-the-way", laptop)
export const OnTheWayPhone: Story = story("on-the-way", phone)

/** Active since 9:12 am with the checklist half done. The one primary action is Mark done. */
export const Active: Story = story("active", laptop)
export const ActivePhone: Story = story("active", phone)

/** At 375 the four band tiles are links with their values whole: none is wider than its tile and none wraps past two lines. */
export const BandTilesPhone: Story = {
  ...story("today", phone),
  play: async ({ canvasElement }) => {
    const cells = canvasElement.querySelectorAll<HTMLElement>("[data-slot=summary-cell]")
    await expect(cells.length).toBe(4)
    for (const cell of cells) {
      await expect(cell.scrollWidth).toBeLessThanOrEqual(cell.clientWidth)
      const value = cell.querySelector<HTMLElement>("p:nth-of-type(2)")!
      const line = parseFloat(getComputedStyle(value).lineHeight) || 24
      await expect(value.getBoundingClientRect().height).toBeLessThanOrEqual(line * 2 + 4)
    }
  },
}

/** Ryan sees a trip whose day passed with no Mark done. The one primary action is Mark done, with Skip beside it. */
export const Late: Story = story("late", laptop)
export const LatePhone: Story = story("late", phone)

/** Ryan sees How is this paid? on the page, card selected. The button under the options reads Charge $145 to the Visa ending 4242, with a quiet Not now; the header has no primary while it is open. */
export const DoneUnpaid: Story = story("done-unpaid", laptop)
export const DoneUnpaidPhone: Story = story("done-unpaid", phone)

/** Ryan sees Billing read Paid, Venmo. There is no primary action; the quiet ones are under More. */
export const DonePaid: Story = story("done-paid", laptop)
export const DonePaidPhone: Story = story("done-paid", phone)

/** Paid by check: the green line "Paid in full. $145 paid by check #1042 on Nov 18, recorded by Ryan", the facts, and a Payments row with Receipt and Refund under More. */
export const PaidByCheck: Story = story("paid-check", laptop)
export const PaidByCheckPhone: Story = story("paid-check", phone)

/** Paid by card: the Payments row also offers Open in Stripe with the external-link icon. */
export const PaidByCard: Story = story("paid-card", laptop)
export const PaidByCardPhone: Story = story("paid-card", phone)

/** Refunded: a grey line, the refund as its own negative grey row under the payment, the job Unpaid again with Collect payment as the primary. */
export const Refunded: Story = story("refunded", laptop)
export const RefundedPhone: Story = story("refunded", phone)

/** Ryan sees the invoice in an Invoices table, Invoice sent, with Remind and Open invoice beside it. The primary is Send a payment reminder, with Collect payment beside it. */
export const InvoiceSent: Story = story("invoice-sent", laptop)
export const InvoiceSentPhone: Story = story("invoice-sent", phone)

/** Ryan sees Past due since Nov 17 in red on one row. The one primary action is Remind. */
export const PastDue: Story = story("past-due", laptop)
export const PastDuePhone: Story = story("past-due", phone)

/** Nothing has happened on the job: More has Cancel job and Delete job (a red Delete, "added by mistake, nothing was sent or charged"). */
export const Deletable: Story = story("unscheduled", laptop)
export const DeletablePhone: Story = story("unscheduled", phone)

/** A message has gone out: More has Cancel job only and says "A job with a payment or a sent message can't be deleted, only canceled." */
export const NotDeletable: Story = story("scheduled", laptop)
export const NotDeletablePhone: Story = story("scheduled", phone)

/** Ryan sees a canceled job with nothing owed. There are no buttons. */
export const Canceled: Story = story("canceled", laptop)
export const CanceledPhone: Story = story("canceled", phone)

