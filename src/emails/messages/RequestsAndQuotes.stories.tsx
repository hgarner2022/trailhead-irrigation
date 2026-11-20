import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { MessageStory } from "./MessageStory"
import { MESSAGES } from "./catalog"

// Requests and quotes: what a customer gets after a request and about a quote. All five are prototypes ("Prototype, not built yet"): nothing sends them. The thank-you after
// a request says no call-back time (Hannah, Nov 20 2026), a quote is approved or declined from its link, a reminder goes only when Ryan presses Remind, and nothing promises a
// time, a refund, a reassurance or an expiry. The two notes to the office are under To the crew. Each message has two stories: on a laptop (the text, then the Proposed email) and on a phone (the Proposed email and the text at 375px).

const meta = {
  title: "Messages/Requests and quotes",
  component: MessageStory,
  parameters: { layout: "padded", docs: { description: { component: "Request received (an email only, with no call-back time and no account link), Your quote (the total, the deposit only when Ryan set one, one link), Quote reminder (only when Ryan presses Remind), Quote approved and Quote declined. All are prototypes in the proposed layout." } } },
} satisfies Meta<typeof MessageStory>
export default meta
type Story = StoryObj<typeof meta>

const when = (id: string) => MESSAGES.find((m) => m.id === id)!.when
const laptop = (id: string): Story => ({ args: { id, view: "laptop" }, globals: { viewport: { value: "laptop", isRotated: false } }, parameters: { docs: { description: { story: when(id) } } } })
const phone = (id: string): Story => ({ args: { id, view: "phone" }, globals: { viewport: { value: "phone", isRotated: false } }, parameters: { docs: { description: { story: when(id) } } } })

export const RequestReceived = laptop("request-received")
export const RequestReceivedOnAPhone = phone("request-received")
export const Quote = laptop("quote")
export const QuoteOnAPhone = phone("quote")
export const QuoteReminder = laptop("quote-reminder")
export const QuoteReminderOnAPhone = phone("quote-reminder")
export const QuoteApproved = laptop("quote-approved")
export const QuoteApprovedOnAPhone = phone("quote-approved")
export const QuoteDeclined = laptop("quote-declined")
export const QuoteDeclinedOnAPhone = phone("quote-declined")
