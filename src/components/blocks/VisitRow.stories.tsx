import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { VisitRow, type VisitRowProps } from "./VisitRow"

const booked: VisitRowProps = { href: "/account/visits/v1", dayWords: "Wed, Apr 28", service: "Spring turn-on", label: "Season Pass 2027", pill: { status: "scheduled", label: "Booked" }, money: "$120, charged after the visit" }

// A row is an <li>: the stories wrap it in the list it always sits in. The list shows every state a row has.
const meta = {
  title: "Blocks/VisitRow",
  component: VisitRow,
  parameters: { layout: "padded" },
  args: booked,
  render: (args: VisitRowProps) => (
    <ul className="mx-auto max-w-3xl divide-y divide-border rounded-lg border border-border bg-background px-4">
      <VisitRow {...args} />
      <VisitRow {...booked} href="/account/visits/v2" dayWords="Day coming soon" service="Fall blowout" pill={{ status: "needs-a-day", label: "Pick a day" }} money="$120, charged after the visit" />
      <VisitRow href="/account/visits/v3" dayWords="Tue, Nov 3, 2026" service="Repair" who="Ryan" pill={{ status: "done", label: "Done" }} money="$145 · Paid" tone="paid" receiptHref="/account/receipts/pay_1" />
      <VisitRow href="/account/visits/v4" dayWords="Sat, Mar 20" service="Repair" pill={{ status: "done", label: "Done" }} money="Invoice sent, due Dec 1" tone="invoice-sent" />
      <VisitRow href="/account/visits/v7" dayWords="Sat, Mar 20" service="Repair" pill={{ status: "done", label: "Done" }} money="Past due since Apr 1" tone="past-due" />
      <VisitRow href="/account/visits/v8" dayWords="Fri, Apr 2" service="Mid-season inspection" label="Season Pass 2027" pill={{ status: "skipped", label: "Canceled" }} />
    </ul>
  ),
} satisfies Meta<typeof VisitRow>
export default meta
type Story = StoryObj<typeof meta>

const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const

export const ListPhone: Story = { ...phone }
export const ListLaptop: Story = { ...laptop }
/** Two properties: the street sits under the row. */
export const StreetPhone: Story = { ...phone, args: { street: "412 Briggs Street" } }
/** The window was told: who is coming joins the service. */
export const WhoComingLaptop: Story = { ...laptop, args: { who: "Ryan" } }
