import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { RecordPreview } from "./RecordPreview"
import { customerPreview, dayPreview, invoicePreview } from "./record-preview-model"

// The card a RecordChip shows (all kinds are in "Blocks/RecordChip, Cards"): the customer, an invoice and a scheduled day at 1280 and 375.

const meta = { title: "Blocks/RecordPreview", component: RecordPreview, parameters: { layout: "padded" } } satisfies Meta<typeof RecordPreview>
export default meta
type Story = StoryObj<typeof meta>

const laptop = { viewport: { value: "laptop", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }

const customer = customerPreview({ id: "c1", name: "Andrea Reyes", phone: "(970) 555-0123", address: "480 Briggs St, Erie", openJobs: 2, unpaid: "$145" })
const invoice = invoicePreview({ id: "i1", number: "1038", customer: "Reese Holloway", status: "overdue", statusLabel: "Past due", total: "$145", balance: "$145", due: "Nov 17" })
const day = dayPreview({ isoDay: "2026-11-24", label: "Tue, Nov 24 at 9:00 am", stops: 3, who: "Ryan Garner" })

export const Customer: Story = { args: { data: customer }, globals: laptop }
export const CustomerPhone: Story = { args: { data: customer }, globals: phone }
export const Invoice: Story = { args: { data: invoice }, globals: laptop }
export const Day: Story = { args: { data: day }, globals: laptop }
