import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { MessagesTable } from "./MessagesTable"
import type { Message } from "@/lib/admin/types"

const m = (id: string, at: string, channel: "email" | "sms", kind: Message["kind"], body: string, status: Message["status"] = "delivered"): Message => ({ id, clientId: "c-1", channel, kind, body, at, status })

const meta = { title: "Blocks/MessagesTable", component: MessagesTable, args: { phone: "(970) 555-0123", email: "andrea@example.com", messages: [] } } satisfies Meta<typeof MessagesTable>
export default meta
type Story = StoryObj<typeof meta>

export const Mixed: Story = {
  args: {
    messages: [
      m("1", "2026-11-12T21:41:00Z", "sms", "date-set", "Trailhead: Ryan is coming Thu, Nov 19. We'll text your window the day before."),
      m("2", "2026-11-12T21:42:00Z", "email", "invoice", "Invoice 1042: $145 for your repair at 480 Briggs St", "sent"),
      m("3", "2026-10-12T16:00:00Z", "email", "receipt", "Receipt: $115 for your fall blowout at 480 Briggs St"),
      m("4", "2026-10-11T16:00:00Z", "sms", "day-before", "Trailhead: Ryan is coming tomorrow.", "failed"),
    ],
  },
}
export const Empty: Story = {}
