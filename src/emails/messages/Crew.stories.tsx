import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { MessageStory } from "./MessageStory"
import { MESSAGES } from "./catalog"

// To the crew, not the customer: the notes the office and crew get, kept apart so the customer groups hold only what a customer receives. Each message has two stories: on a laptop (the text, then the Current and Proposed emails side by side) and on a phone (the Proposed email and the text at 375px).

const meta = {
  title: "Messages/To the crew",
  component: MessageStory,
  parameters: { layout: "padded" },
} satisfies Meta<typeof MessageStory>
export default meta
type Story = StoryObj<typeof meta>

const when = (id: string) => MESSAGES.find((m) => m.id === id)!.when
const laptop = (id: string): Story => ({ args: { id, view: "laptop" }, globals: { viewport: { value: "laptop", isRotated: false } }, parameters: { docs: { description: { story: when(id) } } } })
const phone = (id: string): Story => ({ args: { id, view: "phone" }, globals: { viewport: { value: "phone", isRotated: false } }, parameters: { docs: { description: { story: when(id) } } } })

export const NotMarkedDone = laptop("not-closed-crew")
export const NotMarkedDoneOnAPhone = phone("not-closed-crew")
export const AdminAlert = laptop("admin-alert")
export const AdminAlertOnAPhone = phone("admin-alert")
export const CustomerChanged = laptop("customer-changed")
export const CustomerChangedOnAPhone = phone("customer-changed")
export const CrewAssigned = laptop("crew-assigned")
export const CrewAssignedOnAPhone = phone("crew-assigned")
