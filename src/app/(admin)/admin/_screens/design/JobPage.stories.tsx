import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { AdminShell } from "@/components/blocks/AdminShell"
import { JobFlow } from "./JobFlow"
import { JobPage } from "./JobPage"
import { STATE_NOTES, jobPageOf, type JobState } from "./job-fixtures"

// The job page for a one-trip job in every state Hannah listed, at 1280 (Laptop) and 375 (Phone). Each story says what Ryan sees and what
// the one primary action is. Pure screens over fixtures: no handlers, no API.

const meta = {
  title: "Admin/Job page, one trip",
  component: JobPage,
  parameters: { layout: "fullscreen", docs: { description: { component: "Every state of a one-trip job on its page: the header with its badges and actions, the summary band, What's included, Billing and Messages. Click through the states; the clickable one is Admin / Walkthrough (clickable)." } } },
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
export const Unscheduled: Story = { ...story("unscheduled", laptop), name: "Unscheduled" }
export const UnscheduledPhone: Story = { ...story("unscheduled", phone), name: "Unscheduled, phone" }

/** Ryan sees the day, who and Any time. The one primary action is Move; Mark done is one tap beside it. */
export const ScheduledAhead: Story = { ...story("scheduled", laptop), name: "Scheduled ahead" }
export const ScheduledAheadPhone: Story = { ...story("scheduled", phone), name: "Scheduled ahead, phone" }

/** Ryan sees today with the time the customer was told. The one primary action is On my way, then Mark done. */
export const Today: Story = { ...story("today", laptop), name: "Today" }
export const TodayPhone: Story = { ...story("today", phone), name: "Today, phone" }

/** After Send on On my way: Active since 9:12 am under the time. The one primary action is Mark done. */
export const OnTheWay: Story = { ...story("on-the-way", laptop), name: "On the way" }
export const OnTheWayPhone: Story = { ...story("on-the-way", phone), name: "On the way, phone" }

/** Active since 9:12 am with the checklist half done. The one primary action is Mark done. */
export const Active: Story = { ...story("active", laptop), name: "Active" }
export const ActivePhone: Story = { ...story("active", phone), name: "Active, phone" }

/** At 375 the four band tiles are links with their values whole: none is wider than its tile and none wraps past two lines. */
export const BandTilesPhone: Story = { name: "Band tiles, phone",
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
export const Late: Story = { ...story("late", laptop), name: "Late" }
export const LatePhone: Story = { ...story("late", phone), name: "Late, phone" }

/** Ryan sees How is this paid? on the page, card selected. The button under the options reads Charge $145 to the Visa ending 4242, with a quiet Not now; the header has no primary while it is open. */
export const DoneUnpaid: Story = { ...story("done-unpaid", laptop), name: "Done unpaid" }
export const DoneUnpaidPhone: Story = { ...story("done-unpaid", phone), name: "Done unpaid, phone" }

/** Ryan sees Billing read Paid, Venmo. There is no primary action; the quiet ones are under More. */
export const DonePaid: Story = { ...story("done-paid", laptop), name: "Done paid" }
export const DonePaidPhone: Story = { ...story("done-paid", phone), name: "Done paid, phone" }

/** Paid by check: the green line "Paid in full. $145 paid by check #1042 on Nov 18, recorded by Ryan", the facts, and a Payments row with Receipt and Refund under More. */
export const PaidByCheck: Story = { ...story("paid-check", laptop), name: "Paid by check" }
export const PaidByCheckPhone: Story = { ...story("paid-check", phone), name: "Paid by check, phone" }

/** Paid by card: the Payments row also offers Open in Stripe with the external-link icon. */
export const PaidByCard: Story = { ...story("paid-card", laptop), name: "Paid by card" }
export const PaidByCardPhone: Story = { ...story("paid-card", phone), name: "Paid by card, phone" }

/** Refunded: a grey Refunded pill, the grey line "$145 refunded to the card on Nov 19, by Ryan" and the refund as its own negative grey row under the payment. The job reads Refunded, never Unpaid; Collect payment is under More, not a primary. */
export const Refunded: Story = { ...story("refunded", laptop), name: "Refunded" }
export const RefundedPhone: Story = { ...story("refunded", phone), name: "Refunded, phone" }

/** A partial refund: the job reads "Paid, $50 refunded" in green, with a negative grey $50 row under the card payment. */
export const PartRefunded: Story = { ...story("part-refunded", laptop), name: "Part refunded" }
export const PartRefundedPhone: Story = { ...story("part-refunded", phone), name: "Part refunded, phone" }

/** Ryan sees the invoice in an Invoices table, Invoice sent, with Remind and Open invoice beside it. The primary is Send a payment reminder, with Collect payment beside it. */
export const InvoiceSent: Story = { ...story("invoice-sent", laptop), name: "Invoice sent" }
export const InvoiceSentPhone: Story = { ...story("invoice-sent", phone), name: "Invoice sent, phone" }

/** Ryan sees Past due since Nov 17 in red on one row. The one primary action is Remind. */
export const PastDue: Story = { ...story("past-due", laptop), name: "Past due" }
export const PastDuePhone: Story = { ...story("past-due", phone), name: "Past due, phone" }

/** Nothing has happened on the job: More has Cancel job and Delete job (a red Delete, "added by mistake, nothing was sent or charged"). */
export const Deletable: Story = { ...story("unscheduled", laptop), name: "Deletable" }
export const DeletablePhone: Story = { ...story("unscheduled", phone), name: "Deletable, phone" }

/** A message has gone out: More has Cancel job only and says "A job with a payment or a sent message can't be deleted, only canceled." */
export const NotDeletable: Story = { ...story("scheduled", laptop), name: "Not deletable" }
export const NotDeletablePhone: Story = { ...story("scheduled", phone), name: "Not deletable, phone" }

/** Ryan sees a canceled job with nothing owed. There are no buttons. */
export const Canceled: Story = { ...story("canceled", laptop), name: "Canceled" }
export const CanceledPhone: Story = { ...story("canceled", phone), name: "Canceled, phone" }


const shell = (node: React.ReactNode) => <AdminShell current="jobs" user={{ initials: "HG", name: "Hannah" }}>{node}</AdminShell>

/** The same flow for a customer who wants email: the dialogs say email and the sentences name the channel. The same flow is clickable inside the admin walkthrough. */
export const FlowEmailCustomer: Story = { name: "Flow, email customer", globals: laptop, render: () => shell(<JobFlow channel="email" />) }

/** A customer who wants both: every notice is two rows in Messages, a text and an email, never only a text. */
export const FlowBothChannels: Story = {
  name: "Flow, both channels",
  globals: laptop,
  render: () => shell(<JobFlow channel="both" />),
  play: async ({ canvasElement }) => {
    const body = within(document.body)
    const c = within(canvasElement)
    await userEvent.click(await c.findByRole("button", { name: "Schedule" }))
    await userEvent.click(await body.findByRole("button", { name: /Schedule and notify the customer/ }))
    const rows = await c.findAllByText("Date set")
    await expect(rows).toHaveLength(2)
    await expect(await c.findAllByText("Email")).not.toHaveLength(0)
  },
}

/** Schedule, Mark done, charge the card on file, then Refund: Billing reads Paid, card and then Refunded. */
export const FlowCardChargeAndRefund: Story = {
  name: "Flow, card charge and refund",
  globals: laptop,
  render: () => shell(<JobFlow />),
  play: async ({ canvasElement }) => {
    const body = within(document.body)
    const c = within(canvasElement)
    const inDialog = async (name: string | RegExp) => userEvent.click(await within(await body.findByRole("dialog")).findByRole("button", { name }))
    await userEvent.click(await c.findByRole("button", { name: "Schedule" }))
    await userEvent.click(await body.findByRole("button", { name: /Schedule and notify the customer/ }))
    await userEvent.click(await c.findByRole("button", { name: "Mark done" }))
    await inDialog("Mark done")
    await inDialog(/^Charge \$145/)
    await expect((await c.findAllByText(/Paid/, {}, { timeout: 4000 })).length).toBeGreaterThan(0)
    // Refund sits under a More menu
    for (const more of await c.findAllByRole("button", { name: /^More/ })) {
      await userEvent.click(more)
      const item = await body.findByRole("menuitem", { name: /Refund \$145/ }, { timeout: 500 }).catch(() => null)
      if (item) {
        await userEvent.click(item)
        break
      }
      await userEvent.keyboard("{Escape}")
    }
    await inDialog(/^Refund \$145/)
    await waitFor(async () => expect((await c.findAllByText(/Refunded/)).length).toBeGreaterThan(0))
  },
}
