import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { MessageThread } from "./MessageThread"

// Andrea's messages from the snapshot: the confirmation, the date, the
// reminder, on-my-way and the receipt. One-way: nothing to type.
const data = snapshot as AdminData
const andrea = data.messages.filter((m) => m.clientId === "c100")
const bounced = data.messages.filter((m) => m.status === "bounced")

const meta = {
  title: "Blocks/MessageThread",
  component: MessageThread,
  parameters: { layout: "padded" },
  args: { messages: andrea },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof MessageThread>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** A confirmation that bounced, in the warning colour: the one Hannah calls about. */
export const Bounced: Story = {
  args: { messages: bounced },
}

export const Empty: Story = {
  args: { messages: [] },
}
