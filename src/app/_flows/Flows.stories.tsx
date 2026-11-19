import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { AccountFlowStory } from "./AccountFlowStory"
import { BookingFlowStory } from "./BookingFlowStory"
import { TextsStory } from "./TextsStory"

// The customer side as clickable prototypes: one stateful story per flow, a Flow strip across the top with Start over, the texts she would get along the way at the right. Everything runs over
// fixtures, nothing is sent. Booking: service, zones (when priced by zone), address, day and time, contact, card, done with the holographic card, and the request-a-quote branch from the
// service picker. Account: Home, a visit, Reschedule, Cancel and the canceled page, and the invoice through the pay page to the receipt.
const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const

const meta = { title: "Design/Customer side: booking, account, texts", parameters: { layout: "fullscreen", docs: { description: { component: "The three customer-side flows as separate clickable stories, for reference under the customer walkthrough: booking end to end, the account with its invoice path, and every text and email in order. Phone and laptop of each." } } } } satisfies Meta
export default meta
type Story = StoryObj

export const BookingLaptop: Story = { name: "Booking on a laptop", ...laptop, render: () => <BookingFlowStory /> }
export const BookingPhone: Story = { name: "Booking on a phone", ...phone, render: () => <BookingFlowStory /> }
/** The invoice path end to end: Pay now, the pay page, the card button, "paid", the receipt. */
export const AccountLaptop: Story = { name: "Account and paying, laptop",
  ...laptop,
  render: () => <AccountFlowStory />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("link", { name: /Pay now/ }))
    await userEvent.click(await canvas.findByRole("button", { name: /Pay \$115 by card/ }))
    await expect(await canvas.findByText(/your payment went through/)).toBeInTheDocument()
    await userEvent.click(await canvas.findByRole("link", { name: "View the receipt" }))
    await expect(await canvas.findByText(/Receipt/i, { selector: "h1" })).toBeInTheDocument()
  },
}
export const AccountPhone: Story = { name: "Account and paying, phone", ...phone, render: () => <AccountFlowStory /> }
/** Every text and email in the two flows in one strip, from the real renderers. */
export const TextsLaptop: Story = { name: "Texts and emails, laptop", ...laptop, render: () => <TextsStory /> }
export const TextsPhone: Story = { name: "Texts and emails, phone", ...phone, render: () => <TextsStory /> }
