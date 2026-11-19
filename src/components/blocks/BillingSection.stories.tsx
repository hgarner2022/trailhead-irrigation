import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { BillingSection } from "./BillingSection"
import { StatusPill } from "./StatusPill"

const PHONE = { viewport: { value: "phone", isRotated: false } }
const noop = () => {}

const meta = {
  title: "Blocks/BillingSection",
  component: BillingSection,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div className="max-w-xl"><Story /></div>],
  args: {
    summary: [["Total", "$145"], ["Paid", "$0"], ["Unpaid", "$145"]],
    rows: [{ id: "i1", kind: "invoice", title: "Invoice TH-1042", detail: "Sent Nov 18, due Dec 2", end: <StatusPill status="bill-sent" />, onOpen: noop }],
  },
} satisfies Meta<typeof BillingSection>
export default meta
type Story = StoryObj<typeof meta>

/** An invoice that is out: its row opens the invoice. */
export const Default: Story = {}

/** Nothing to bill yet. */
export const Empty: Story = { args: { summary: [], rows: [] } }

/** Paid by hand: the payment row is quiet text. */
export const Paid: Story = {
  args: { summary: [["Total", "$145"], ["Paid", "$145"], ["Unpaid", "$0"]], rows: [{ id: "p1", kind: "payment", title: "Venmo", detail: "Nov 18", amount: "$145" }] },
}

export const Phone: Story = { globals: PHONE }
