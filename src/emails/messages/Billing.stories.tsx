import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { MessageStory } from "./MessageStory"
import { MESSAGES } from "./catalog"

// Billing: the invoice and its reminder, the receipt in each way of paying, the refund, and the card messages. Each message has two stories: on a laptop (the text, then the Current and Proposed emails side by side) and on a phone (the Proposed email and the text at 375px).

const meta = {
  title: "Messages/Billing",
  component: MessageStory,
  parameters: { layout: "padded" },
} satisfies Meta<typeof MessageStory>
export default meta
type Story = StoryObj<typeof meta>

const when = (id: string) => MESSAGES.find((m) => m.id === id)!.when
const laptop = (id: string): Story => ({ args: { id, view: "laptop" }, globals: { viewport: { value: "laptop", isRotated: false } }, parameters: { docs: { description: { story: when(id) } } } })
const phone = (id: string): Story => ({ args: { id, view: "phone" }, globals: { viewport: { value: "phone", isRotated: false } }, parameters: { docs: { description: { story: when(id) } } } })

export const Invoice = laptop("invoice")
export const InvoiceOnAPhone = phone("invoice")
export const InvoiceReminder = laptop("invoice-reminder")
export const InvoiceReminderOnAPhone = phone("invoice-reminder")
export const ReceiptCard = laptop("receipt-card")
export const ReceiptCardOnAPhone = phone("receipt-card")
export const ReceiptCheck = laptop("receipt-check")
export const ReceiptCheckOnAPhone = phone("receipt-check")
export const ReceiptVenmo = laptop("receipt-venmo")
export const ReceiptVenmoOnAPhone = phone("receipt-venmo")
export const ReceiptCash = laptop("receipt-cash")
export const ReceiptCashOnAPhone = phone("receipt-cash")
export const Refund = laptop("refund")
export const RefundOnAPhone = phone("refund")
export const CardFailed = laptop("card-failed")
export const CardFailedOnAPhone = phone("card-failed")
export const CardLink = laptop("card-link")
export const CardLinkOnAPhone = phone("card-link")
export const CardExpiring = laptop("card-expiring")
export const CardExpiringOnAPhone = phone("card-expiring")
