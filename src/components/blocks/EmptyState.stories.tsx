import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "./EmptyState"

const meta = {
  title: "Blocks/EmptyState",
  component: EmptyState,
  parameters: { layout: "padded" },
  args: {
    title: "No passes sold yet",
    line: "Passes appear here as customers reserve their season.",
    action: <Button variant="outline">Open the checkout</Button>,
  },
} satisfies Meta<typeof EmptyState>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithIcon: Story = {
  args: { icon: Ticket },
}

export const InCard: Story = {
  args: { icon: Ticket },
  render: (args) => (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="font-display text-2xl">Passes</CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState {...args} />
      </CardContent>
    </Card>
  ),
}

export const Phone: Story = {
  args: { icon: Ticket },
  globals: { viewport: { value: "phone", isRotated: false } },
  render: (args) => (
    <div className="w-[360px] max-w-full">
      <EmptyState {...args} />
    </div>
  ),
}
