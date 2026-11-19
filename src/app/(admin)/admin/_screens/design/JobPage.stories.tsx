import type { Meta, StoryObj } from "@storybook/nextjs-vite"
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

/** Ryan sees the Today badge and On my way sent. The one primary action is Start, which confirms nothing. */
export const OnTheWay: Story = story("on-the-way", laptop)
export const OnTheWayPhone: Story = story("on-the-way", phone)

/** Ryan sees In progress with the start time and the checklist half done. The one primary action is Mark done. */
export const InProgress: Story = story("in-progress", laptop)
export const InProgressPhone: Story = story("in-progress", phone)

/** Ryan sees a trip whose day passed with no Mark done. The one primary action is Mark done, with Skip beside it. */
export const Late: Story = story("late", laptop)
export const LatePhone: Story = story("late", phone)

/** Ryan sees How is this paid? on the page, card selected. The button under the options reads Charge $145 to the Visa ending 4242, with a quiet Not now; the header has no primary while it is open. */
export const DoneUnpaid: Story = story("done-unpaid", laptop)
export const DoneUnpaidPhone: Story = story("done-unpaid", phone)

/** Ryan sees Billing read Paid, Venmo. There is no primary action; the quiet ones are under More. */
export const DonePaid: Story = story("done-paid", laptop)
export const DonePaidPhone: Story = story("done-paid", phone)

/** Ryan sees the invoice as a Billing row, Invoice sent, due Dec 2. The one primary action is Remind. */
export const InvoiceSent: Story = story("invoice-sent", laptop)
export const InvoiceSentPhone: Story = story("invoice-sent", phone)

/** Ryan sees Past due since Nov 17 in red on one row. The one primary action is Remind. */
export const PastDue: Story = story("past-due", laptop)
export const PastDuePhone: Story = story("past-due", phone)

/** Ryan sees a canceled job with nothing owed. There are no buttons. */
export const Canceled: Story = story("canceled", laptop)
export const CanceledPhone: Story = story("canceled", phone)

