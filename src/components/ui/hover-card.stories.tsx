import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "./button"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card"

const meta = {
  title: "UI/HoverCard",
  component: HoverCard,
} satisfies Meta<typeof HoverCard>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <HoverCard defaultOpen>
      <HoverCardTrigger asChild>
        <Button variant="outline" className="m-6">Hover me</Button>
      </HoverCardTrigger>
      <HoverCardContent>Extra facts that are never the only way to reach them.</HoverCardContent>
    </HoverCard>
  ),
}
