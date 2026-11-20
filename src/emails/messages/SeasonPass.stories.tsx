import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { MessageStory } from "./MessageStory"
import { MESSAGES } from "./catalog"

// Season Pass: the purchase confirmation, the renewal offer and the cancel message. Each message has two stories: on a laptop (the text, then the Current and Proposed emails side by side) and on a phone (the Proposed email and the text at 375px).

const meta = {
  title: "Messages/Season Pass",
  component: MessageStory,
  parameters: { layout: "padded" },
} satisfies Meta<typeof MessageStory>
export default meta
type Story = StoryObj<typeof meta>

const when = (id: string) => MESSAGES.find((m) => m.id === id)!.when
const laptop = (id: string): Story => ({ args: { id, view: "laptop" }, globals: { viewport: { value: "laptop", isRotated: false } }, parameters: { docs: { description: { story: when(id) } } } })
const phone = (id: string): Story => ({ args: { id, view: "phone" }, globals: { viewport: { value: "phone", isRotated: false } }, parameters: { docs: { description: { story: when(id) } } } })

export const PurchaseConfirmation = laptop("purchase-confirmation")
export const PurchaseConfirmationOnAPhone = phone("purchase-confirmation")
export const Renewal = laptop("renewal")
export const RenewalOnAPhone = phone("renewal")
export const SeasonPassCanceled = laptop("cancelled")
export const SeasonPassCanceledOnAPhone = phone("cancelled")
