import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, within } from "storybook/test"
import { Button } from "@/components/ui/button"
import { ScheduleToast, type ScheduleToastProps } from "./ScheduleToast"

// The confirmation after a visit is moved or scheduled: the app's own toast bar with "Notify the customer" and "Undo". The stories keep it up (seconds 0); the real one closes after ten seconds.
const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

function Harness(args: ScheduleToastProps) {
  const [open, setOpen] = useState(true)
  return (
    <div className="min-h-64 p-6">
      <Button variant="outline" className="min-h-11" onClick={() => setOpen(true)}>
        Move the visit
      </Button>
      {open && <ScheduleToast {...args} onClose={() => setOpen(false)} />}
    </div>
  )
}

const meta = {
  title: "Blocks/Scheduler/ScheduleToast",
  component: Harness,
  parameters: { layout: "fullscreen" },
  globals: LAPTOP,
  args: { message: "Moved to Thu, Nov 26, 9:00 am", seconds: 0, onNotify: fn(), onUndo: fn(), onClose: () => {} },
} satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

/** After a drag or the Schedule dialog without notifying. */
export const Default: Story = {
  play: async ({ args, userEvent }) => {
    const screen = within(document.body)
    await expect(await screen.findByText("Moved to Thu, Nov 26, 9:00 am")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Notify the customer" }))
    await expect(args.onNotify).toHaveBeenCalled()
  },
}
export const Phone: Story = { globals: PHONE }

/** Closed: nothing is shown. */
export const Empty: Story = {
  render: () => <div className="min-h-64 p-6 text-sm text-muted-foreground">No toast is showing.</div>,
}

export const FirstPlacement: Story = { args: { message: "Scheduled for Tue, Dec 1, 10:00 am" } }
export const FirstPlacementPhone: Story = { ...FirstPlacement, globals: PHONE }

/** The customer was notified in the Schedule dialog: Undo alone. */
export const AlreadyNotified: Story = { args: { notified: true } }
