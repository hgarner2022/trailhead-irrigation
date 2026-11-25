import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "@/components/ui/button"
import { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog"
import { DayField } from "./DayField"

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

function Opened(args: ConfirmDialogProps) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open the dialog
      </Button>
      <ConfirmDialog {...args} open={open} onOpenChange={setOpen} />
    </>
  )
}

const meta = {
  title: "Blocks/ConfirmDialog",
  component: ConfirmDialog,
  parameters: { layout: "padded" },
  args: {
    title: "Cancel Dana Reed's repair on Fri, Nov 20?",
    message: "$145 will not be charged.",
    confirmLabel: "Cancel visit",
    destructive: true,
    open: true,
    onOpenChange: () => {},
  },
  globals: LAPTOP,
  render: (args) => <Opened {...args} />,
} satisfies Meta<typeof ConfirmDialog>
export default meta
type Story = StoryObj<typeof meta>

/** A destructive confirm: "Keep it" and the verb. */
export const Default: Story = {}

/** It cannot go ahead: the reason takes the message's place and only Keep it is left. */
export const Empty: Story = { args: { title: "Cancel this job?", blocked: "This job has a payment. Refund it first.", confirmLabel: "Cancel job" } }

/** One question with one field (a day, on the calendar): dismissed with Cancel. The body scrolls under the title and the buttons on a phone. */
export const Phone: Story = {
  globals: PHONE,
  args: { title: "Mark done", message: "Spring turn-on for Dana Reed.", destructive: false, confirmLabel: "Mark done", children: <DayField label="Done on" value="2026-11-18" onChange={() => {}} from="2025-11-18" to="2026-11-18" defaultOpen /> },
}
