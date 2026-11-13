import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Download } from "lucide-react"
import { Button } from "./button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip"

const meta = {
  title: "UI/Tooltip",
  component: Tooltip,
} satisfies Meta<typeof Tooltip>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip defaultOpen>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Export CSV" className="m-6">
            <Download className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Export the visible rows as CSV</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
}
