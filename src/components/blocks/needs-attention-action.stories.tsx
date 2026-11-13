import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import { AttentionAction } from "./needs-attention-action"

// The one button on a Needs attention row, labelled by the row's kind.

const meta = {
  title: "Blocks/AttentionAction",
  component: AttentionAction,
  parameters: { layout: "padded" },
  args: { item: { kind: "customer-replied", passId: "p9", message: 'Katie replied by text: "Do you do backflow tests too?"', since: "2026-11-12T15:40:00Z" }, onAction: fn() },
} satisfies Meta<typeof AttentionAction>
export default meta
type Story = StoryObj<typeof meta>

export const Reply: Story = {}

export const Retry: Story = {
  args: { item: { kind: "jobs-failed", passId: "p7", message: "Jobber jobs for pass TH-2027-0007 were not created; retrying", since: "2026-11-11T22:41:00Z" } },
}

export const SendCardLink: Story = {
  args: { item: { kind: "charge-failed", passId: "p3", message: "Card declined for the spring turn-on; customer emailed an update link", since: "2026-11-10T15:04:00Z" } },
}
