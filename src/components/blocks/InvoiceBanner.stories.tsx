import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { InvoiceBanner } from "./InvoiceBanner"

const meta = {
  title: "Blocks/InvoiceBanner",
  component: InvoiceBanner,
  parameters: { layout: "padded" },
  args: { jobName: "Repair", total: 115, dueOn: "2027-12-01", status: "sent", payHref: "/pay/inv_1?token=abc" },
} satisfies Meta<typeof InvoiceBanner>
export default meta
type Story = StoryObj<typeof meta>

export const SentPhone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
export const SentLaptop: Story = { globals: { viewport: { value: "laptop", isRotated: false } } }
export const PastDuePhone: Story = { args: { status: "overdue" }, globals: { viewport: { value: "phone", isRotated: false } } }
export const PastDueLaptop: Story = { args: { status: "overdue" }, globals: { viewport: { value: "laptop", isRotated: false } } }
