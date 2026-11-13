import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { MessageThread } from "./MessageThread"

// Andrea's thread from the snapshot: the confirmation, the date, the
// reminder, her reply, our answer, on-my-way and the receipt.
const data = snapshot as AdminData
const andrea = data.messages.filter((m) => m.clientId === "c100")
const unanswered = data.messages.filter((m) => m.status === "received")

const meta = {
  title: "Blocks/MessageThread",
  component: MessageThread,
  parameters: { layout: "padded" },
  args: { messages: andrea, canText: true, onReply: fn() },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof MessageThread>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** A reply nobody has answered yet, in the warning colour, and the box ready. */
export const Unanswered: Story = {
  args: { messages: unanswered },
}

/** Typing a reply and sending it calls onReply and clears the box. */
export const Replying: Story = {
  args: { messages: unanswered },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.type(canvas.getByRole("textbox"), "Yes, $85 with any visit. Want it with your turn-on?")
    await userEvent.click(canvas.getByRole("button", { name: "Send text" }))
    await expect(args.onReply).toHaveBeenCalledWith("Yes, $85 with any visit. Want it with your turn-on?")
    await expect(canvas.getByRole("textbox")).toHaveValue("")
  },
}

/** No phone or opted out: the box says why and stays off. */
export const CannotText: Story = {
  args: { canText: false },
}

export const Empty: Story = {
  args: { messages: [] },
}
