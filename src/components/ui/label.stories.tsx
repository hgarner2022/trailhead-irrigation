import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Input } from "./input"
import { Label } from "./label"

const meta = {
  title: "UI/Label",
  component: Label,
} satisfies Meta<typeof Label>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="m-6 grid max-w-xs gap-1.5">
      <Label htmlFor="zones">Zones</Label>
      <Input id="zones" type="number" defaultValue={6} min={1} max={30} />
    </div>
  ),
}
