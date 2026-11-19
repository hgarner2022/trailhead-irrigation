import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Attention } from "@/lib/admin/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NeedsAttention } from "./NeedsAttention"

// The three rows in the snapshot, one of each kind, with `now` fixed to the
// sync time so the relative times never drift with the calendar.
const items = snapshot.attention as Attention[]

const meta = {
  title: "Blocks/NeedsAttention",
  component: NeedsAttention,
  parameters: { layout: "padded" },
  args: { items, now: snapshot.syncedAt },
} satisfies Meta<typeof NeedsAttention>
export default meta
type Story = StoryObj<typeof meta>

const narrow = (story: React.ReactNode) => <div className="max-w-xl">{story}</div>

export const Default: Story = {
  render: (args) => narrow(<NeedsAttention {...args} />),
}

/** The row Home adds at render time for visits from earlier days nobody has marked done. */
export const WithNotClosed: Story = {
  args: { items: [...items, { kind: "not-closed", message: "3 visits from before today are not marked done yet.", since: "2026-11-09T17:00:00Z" }, { kind: "pass-cancelled", passId: "p4", message: "A pass was canceled and its Jobber jobs could not be canceled by the API; remove them by hand", since: "2026-11-12T14:30:00Z" }] },
  render: (args) => narrow(<NeedsAttention {...args} />),
}

/** An invoice past its due day: "Invoice past due", the customer's name and the due day in the message, the row opens the customer, and Remind sends one reminder with the pay link. */
export const WithOverdueBill: Story = {
  args: { items: [{ kind: "overdue", key: "invoice-inv1@2026-11-05", invoiceId: "inv1", jobId: "job-1", customerId: "c-andrea", message: "Andrea Reyes's bill of $145 was due Nov 5", since: "2026-11-05T19:00:00Z" }, ...items] },
  render: (args) => narrow(<NeedsAttention {...args} />),
}

/** A customer changed their own visit from the account: the row says who, what and when, a payment is flagged, and Open visit opens it (a row about a job says Open job, one about a customer Open customer). */
export const WithCustomerChanges: Story = {
  args: {
    items: [
      { kind: "customer-changed", key: "v1:cancelled:2027-04-10T15:00:00.000Z", visitId: "v1", message: "Andrea Smith canceled Spring turn-on, Wed, Apr 28, Erie. The day is free.", since: "2026-11-12T17:30:00Z" },
      { kind: "customer-changed", key: "v2:cancelled:2027-04-10T16:00:00.000Z", visitId: "v2", message: "Dana Quill canceled Repair, Fri, May 7, Erie. The day is free. The job has a payment.", since: "2026-11-12T17:10:00Z" },
      { kind: "customer-changed", key: "v3:moved:2027-04-10T16:30:00.000Z", visitId: "v3", message: "Andrea Smith moved Fall blowout from Tue, Oct 5 to Thu, Oct 7, Erie, Ryan.", since: "2026-11-12T16:30:00Z" },
      { kind: "text-undelivered", key: "v3:c3:m3", visitId: "v3", message: "Text not delivered: Hannah, date set. Filtered by the carrier.", since: "2026-11-12T16:40:00Z" },
    ],
  },
  render: (args) => narrow(<NeedsAttention {...args} />),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole("button", { name: /^Open visit:/ })).toHaveLength(3)
  },
}

export const Empty: Story = {
  args: { items: [] },
  render: (args) => narrow(<NeedsAttention {...args} />),
}

export const InCard: Story = {
  render: (args) => (
    <Card className="max-w-xl">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-2xl">Needs attention</CardTitle>
      </CardHeader>
      <CardContent>
        <NeedsAttention {...args} />
      </CardContent>
    </Card>
  ),
}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
  render: (args) => (
    <div className="w-[360px] max-w-full">
      <NeedsAttention {...args} />
    </div>
  ),
}
