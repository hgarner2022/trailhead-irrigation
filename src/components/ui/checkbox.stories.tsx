import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Checkbox } from "./checkbox"
import { Label } from "./label"

const meta = {
  title: "UI/Checkbox",
  component: Checkbox,
} satisfies Meta<typeof Checkbox>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="m-6 grid gap-3">
      <div className="flex items-center gap-2">
        <Checkbox id="reserve" defaultChecked />
        <Label htmlFor="reserve">Reserve the blowout date</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="remind" />
        <Label htmlFor="remind">Email a reminder the week before</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="priority" disabled />
        <Label htmlFor="priority">Repair priority (included with every pass)</Label>
      </div>
    </div>
  ),
}
