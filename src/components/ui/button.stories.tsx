import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "./button"

const meta = {
  title: "UI/Button",
  component: Button,
  args: { children: "Book Online" },
} satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Secondary: Story = { args: { variant: "secondary" } }
export const Outline: Story = { args: { variant: "outline" } }
/** A link wearing the button: the anchor is the element, with the button's classes. */
export const AsLink: Story = {
  args: { asChild: true, variant: "outline", size: "sm" },
  render: (args) => (
    <Button {...args}>
      <a href="https://secure.getjobber.com" target="_blank" rel="noreferrer">
        Open in Jobber
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </Button>
  ),
}
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3 p-6">
      <Button size="sm">Small</Button>
      <Button>Default</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
}
