import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, within } from "storybook/test"
import { Button } from "@/components/ui/button"
import { MovedToast, type MovedToastProps } from "./MovedToast"

// The toast after any move: "Visit moved", Notify and Undo, a close. The stories keep it up (seconds 0); the real one hides after ten seconds.
const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

function Harness(args: MovedToastProps) {
  const [open, setOpen] = useState(true)
  return (
    <div className="min-h-64 p-6">
      <Button variant="outline" className="min-h-11" onClick={() => setOpen(true)}>
        Move the visit
      </Button>
      {open && <MovedToast {...args} onClose={() => setOpen(false)} />}
    </div>
  )
}

const meta = {
  title: "Blocks/Scheduler/MovedToast",
  component: Harness,
  parameters: { layout: "fullscreen" },
  globals: LAPTOP,
  args: { title: "Visit moved", detail: "Briggs St to Thu, Apr 30, 9:00 am", seconds: 0, onNotify: fn(), onUndo: fn(), onClose: () => {} },
} satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

/** After a drag or the Move dialog. */
export const Default: Story = {
  play: async ({ args, userEvent }) => {
    const screen = within(document.body)
    await expect(await screen.findByText("Visit moved")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Notify" }))
    await expect(args.onNotify).toHaveBeenCalled()
  },
}
export const Phone: Story = { globals: PHONE }

/** Closed: nothing is shown. */
export const Empty: Story = {
  render: () => <div className="min-h-64 p-6 text-sm text-muted-foreground">No toast is showing.</div>,
}

export const FirstPlacement: Story = { args: { title: "Visit scheduled", detail: "Ash St, Tue, Dec 1, 10:00 am" } }
export const FirstPlacementPhone: Story = { ...FirstPlacement, globals: PHONE }

export const Resized: Story = { args: { title: "Visit moved", detail: "Cheesman St now 11:00 am to 12:30 pm" } }

/** After Jev's plan is accepted: one toast, Notify all. */
export const ElevenVisits: Story = { args: { title: "11 visits moved", detail: undefined, many: true } }
export const ElevenVisitsPhone: Story = { ...ElevenVisits, globals: PHONE }
