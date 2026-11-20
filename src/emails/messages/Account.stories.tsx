import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { MessageStory } from "./MessageStory"
import { MESSAGES } from "./catalog"

// Account: the sign-in link. Each message has two stories: on a laptop (the text, then the Current and Proposed emails side by side) and on a phone (the Proposed email and the text at 375px).

const meta = {
  title: "Messages/Account",
  component: MessageStory,
  parameters: { layout: "padded" },
} satisfies Meta<typeof MessageStory>
export default meta
type Story = StoryObj<typeof meta>

const when = (id: string) => MESSAGES.find((m) => m.id === id)!.when
const laptop = (id: string): Story => ({ args: { id, view: "laptop" }, globals: { viewport: { value: "laptop", isRotated: false } }, parameters: { docs: { description: { story: when(id) } } } })
const phone = (id: string): Story => ({ args: { id, view: "phone" }, globals: { viewport: { value: "phone", isRotated: false } }, parameters: { docs: { description: { story: when(id) } } } })

export const SignIn = laptop("sign-in")
export const SignInOnAPhone = phone("sign-in")
