import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "./button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu"

const meta = {
  title: "UI/DropdownMenu",
  component: DropdownMenu,
} satisfies Meta<typeof DropdownMenu>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    // modal={false} keeps the trigger reachable while the menu is open; with the default
    // modal menu Radix marks the rest of the page aria-hidden and axe flags the
    // focusable trigger inside it.
    <DropdownMenu defaultOpen modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="m-6">
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Megan, Erie</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Open record</DropdownMenuItem>
        <DropdownMenuItem>Email customer</DropdownMenuItem>
        <DropdownMenuItem>Move blowout week</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Cancel pass</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}
