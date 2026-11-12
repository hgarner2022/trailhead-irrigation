import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Badge } from "./badge"

const meta = {
  title: "UI/Badge",
  component: Badge,
  args: { children: "Paid" },
} satisfies Meta<typeof Badge>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
