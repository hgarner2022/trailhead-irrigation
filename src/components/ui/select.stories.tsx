import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Label } from "./label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

const meta = {
  title: "UI/Select",
  component: Select,
} satisfies Meta<typeof Select>
export default meta
type Story = StoryObj<typeof meta>

const TOWNS = ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"]

export const Default: Story = {
  render: () => (
    <div className="m-6 grid max-w-xs gap-1.5">
      <Label htmlFor="town">Town</Label>
      <Select defaultValue="Erie">
        <SelectTrigger id="town" className="w-full">
          <SelectValue placeholder="Choose a town" />
        </SelectTrigger>
        <SelectContent>
          {TOWNS.map((town) => (
            <SelectItem key={town} value={town}>
              {town}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ),
}
