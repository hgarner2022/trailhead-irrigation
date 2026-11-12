import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Separator } from "./separator"

const meta = {
  title: "UI/Separator",
  component: Separator,
} satisfies Meta<typeof Separator>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="m-6 max-w-sm text-sm">
      <p>Spring turn-on</p>
      <Separator className="my-3" />
      <p>Fall blowout</p>
    </div>
  ),
}
