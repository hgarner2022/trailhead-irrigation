import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn } from "storybook/test"
import { UnscheduledPanel, type UnscheduledPanelProps } from "./UnscheduledPanel"
import { NOT_TOLD, UNSCHEDULED } from "./scheduler-panels-fixtures"

// The Schedule's Unscheduled list, docked at the right from 1280 (the week narrows, nothing is covered) and a sheet from the bottom on a phone. Each state has a 1280 story and a 375 twin.
const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

function Docked(args: UnscheduledPanelProps) {
  const [open, setOpen] = useState(true)
  return (
    <div className="flex h-[640px] bg-background">
      <div className="min-w-0 flex-1 p-6 text-sm text-muted-foreground">The week</div>
      <UnscheduledPanel {...args} open={open} onOpenChange={setOpen} />
    </div>
  )
}

const meta = {
  title: "Blocks/Scheduler/UnscheduledPanel",
  component: UnscheduledPanel,
  parameters: { layout: "fullscreen" },
  globals: LAPTOP,
  args: { open: true, onOpenChange: () => {}, jobs: UNSCHEDULED, notTold: NOT_TOLD, onSchedule: fn(), onHover: fn(), onNotify: fn(), onDontTell: fn(), onNotifyAll: fn() },
  render: (args) => <Docked {...args} />,
} satisfies Meta<typeof UnscheduledPanel>
export default meta
type Story = StoryObj<typeof meta>

/** Four jobs, oldest first, each with Schedule. */
export const Default: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await expect(await canvas.findByRole("heading", { name: "Unscheduled (4)" })).toBeInTheDocument()
    const rows = canvas.getAllByRole("listitem").filter((li) => li.getAttribute("data-slot") === "unscheduled-row")
    await expect(rows[0]).toHaveTextContent("Andrea Reyes")
    await userEvent.click(canvas.getByRole("button", { name: "Schedule Andrea Reyes" }))
    await expect(args.onSchedule).toHaveBeenCalled()
  },
}
export const Phone: Story = { globals: PHONE }

/** Nothing waits for a day. */
export const Empty: Story = { args: { jobs: [], notTold: [] } }
export const EmptyPhone: Story = { ...Empty, globals: PHONE }

export const SortedNewest: Story = { args: { defaultSort: "newest" } }
export const SortedNewestPhone: Story = { ...SortedNewest, globals: PHONE }

export const SortedByName: Story = { args: { defaultSort: "name" } }

/** A row lit from the map or the calendar. */
export const RowLitFromOutside: Story = { args: { hoverId: "u-2" } }
export const RowLitFromOutsidePhone: Story = { ...RowLitFromOutside, globals: PHONE }

/** The calendar's drag library hands each row its props; the row is marked draggable and shows a grip. */
export const DraggableRows: Story = { args: { dragProps: (id) => ({ "aria-roledescription": "draggable", id: `drag-${id}` }) } }
export const DraggableRowsPhone: Story = { ...DraggableRows, globals: PHONE }

/** The second tab: moved visits whose customer has not been notified, each with Notify the customer and Don't notify, and Notify all in the footer. */
export const NotToldTab: Story = { args: { defaultTab: "not-notified" } }
export const NotToldTabPhone: Story = { ...NotToldTab, globals: PHONE }

export const NotToldEmpty: Story = { args: { defaultTab: "not-notified", notTold: [] } }
export const NotToldEmptyPhone: Story = { ...NotToldEmpty, globals: PHONE }
