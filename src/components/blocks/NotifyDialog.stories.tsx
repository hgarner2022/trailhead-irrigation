import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, within } from "storybook/test"
import { Button } from "@/components/ui/button"
import { NotifyDialog, type NotifyDialogProps } from "./NotifyDialog"
import { NOT_TOLD } from "./scheduler-panels-fixtures"

// Tell a customer about the new time, at 375 and 1280. Nothing sends until Send. Each state has a 1280 story and a 375 twin.
const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

const BODY = "Trailhead: your spring turn-on is now Thu, Nov 26, 9 to 10 am. Ryan is coming. Your Trailhead account: https://trailheadirrigation.com/account"
const TEMPLATE = "Trailhead: {firstName}, your {service} is now {day}. Your Trailhead account: https://trailheadirrigation.com/account"

function Harness(args: NotifyDialogProps) {
  const [open, setOpen] = useState(true)
  return (
    <div className="p-6">
      <Button variant="outline" className="min-h-11" onClick={() => setOpen(true)}>
        Notify
      </Button>
      <NotifyDialog {...args} open={open} onOpenChange={setOpen} />
    </div>
  )
}

const cassie = NOT_TOLD[0]!
const meta = {
  title: "Blocks/Scheduler/NotifyDialog",
  component: Harness,
  parameters: { layout: "fullscreen" },
  globals: LAPTOP,
  args: { open: true, onOpenChange: () => {}, body: BODY, recipient: cassie, onSend: fn(), onDontTell: fn() },
} satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

/** A customer with a phone and an email: Text is chosen, the message is the saved words, editable. */
export const Default: Story = {
  play: async ({ args, userEvent }) => {
    const dialog = within(await within(document.body).findByRole("dialog", { name: "Tell Cassie about the new time" }))
    await expect(dialog.getByRole("radio", { name: "Text" })).toBeChecked()
    await expect(dialog.getByText(`${BODY.length} of 480 characters`)).toBeInTheDocument()
    await userEvent.click(dialog.getByRole("button", { name: "Send" }))
    await expect(args.onSend).toHaveBeenCalledWith(expect.objectContaining({ channel: "text", body: BODY }))
  },
}
export const Phone: Story = { globals: PHONE }

/** Nobody to reach: no channel, no Send. */
export const Empty: Story = { args: { recipient: { customer: "Andrea Reyes" } } }
export const EmptyPhone: Story = { ...Empty, globals: PHONE }

export const EmailOnly: Story = { args: { recipient: NOT_TOLD[1]! } }
export const EmailOnlyPhone: Story = { ...EmailOnly, globals: PHONE }

export const TextOnly: Story = { args: { recipient: NOT_TOLD[2]! } }

/** The message is over 480 characters: Send waits until it fits. */
export const TooLong: Story = { args: { body: `${BODY} ${"x".repeat(400)}` } }
export const TooLongPhone: Story = { ...TooLong, globals: PHONE }

/** Notify all, after a plan is accepted: one template, a box per customer. */
export const NotifyAll: Story = { args: { recipient: undefined, body: TEMPLATE, recipients: [...NOT_TOLD, { id: "n-4", customer: "Ann Lee", town: "Longmont" }] } }
export const NotifyAllPhone: Story = { ...NotifyAll, globals: PHONE }
