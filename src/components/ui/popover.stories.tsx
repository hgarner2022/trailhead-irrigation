import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./popover"

const meta = {
  title: "UI/Popover",
  component: Popover,
} satisfies Meta<typeof Popover>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <Button variant="outline" className="m-6">
          Zones
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-labelledby="zones-title">
        <PopoverHeader>
          <PopoverTitle id="zones-title">Zone count</PopoverTitle>
          <PopoverDescription>Each visit is priced per zone, so this number sets the pass price.</PopoverDescription>
        </PopoverHeader>
        <div className="mt-4 grid gap-1.5">
          <Label htmlFor="zones">Zones</Label>
          <Input id="zones" type="number" defaultValue={6} min={1} max={30} />
        </div>
      </PopoverContent>
    </Popover>
  ),
}
