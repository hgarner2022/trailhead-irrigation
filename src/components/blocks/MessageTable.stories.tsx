import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import type { Message } from "@/lib/admin/types"
import { MessageTable } from "./MessageTable"

const msg = (id: string, at: string, channel: Message["channel"], kind: Message["kind"], body: string, extra: Partial<Message> = {}): Message => ({ id, clientId: "c-1", channel, kind, body, at, status: "delivered", ...extra })

const MESSAGES: Message[] = [
  msg("m1", "2026-11-18T16:30:00Z", "sms", "date-set", "Trailhead: your repair is Tue, Nov 24."),
  msg("m2", "2026-11-18T17:51:00Z", "email", "receipt", "Receipt: $145 for your repair at 480 Briggs St"),
  msg("m3", "2026-11-10T17:00:00Z", "sms", "invoice-reminder", "Trailhead: a reminder that invoice 1042, $145, is due Nov 17.", { status: "bounced", deliveryStatus: "undelivered", deliveryError: "30007" }),
]

const meta = {
  title: "Blocks/MessageTable",
  component: MessageTable,
  parameters: { layout: "padded" },
  globals: { viewport: { value: "laptop", isRotated: false } },
  decorators: [(Story) => <div className="bg-cream p-6"><Story /></div>],
  args: { messages: MESSAGES, to: { sms: "(970) 555-0123", email: "andrea.dalton@example.com" } },
} satisfies Meta<typeof MessageTable>
export default meta
type Story = StoryObj<typeof meta>

/** Newest first: the date, the kind over the first line of the body, the channel, who it went to and how it went. A row opens the whole message. */
export const Default: Story = {}

/** In a side panel the To column is left out. */
export const Compact: Story = { args: { compact: true } }

/** Nothing sent yet. */
export const Empty: Story = { args: { messages: [] } }

/** On a phone each message is a card. */
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
