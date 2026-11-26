import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn } from "storybook/test"
import { VisitPeek } from "./VisitPeek"

// The peek a click on a visit opens: docked beside the grid from 1280, a full-height sheet on a phone. Edit visit, Mark done (today or earlier) and Open job.
const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

const meta = {
  title: "Blocks/Scheduler/VisitPeek",
  component: VisitPeek,
  parameters: { layout: "fullscreen" },
  globals: LAPTOP,
  args: { customer: "Willow Dr", service: "Fall blowout", when: "Wed, Nov 18, 8:00 to 9:00 am", length: "1 h", who: "Ryan Garner", address: "Willow Dr, Erie", job: "Fall blowout at Willow Dr", canMarkDone: false, onEdit: fn(), onMarkDone: fn(), onOpenJob: fn(), onClose: fn() },
  render: (args) => <div className="flex h-[32rem] justify-end"><VisitPeek {...args} /></div>,
} satisfies Meta<typeof VisitPeek>
export default meta
type Story = StoryObj<typeof meta>

/** A visit ahead: Edit visit and Open job. */
export const Ahead: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Edit visit" }))
    await expect(args.onEdit).toHaveBeenCalled()
  },
}
export const AheadPhone: Story = { globals: PHONE }

/** Today: Mark done leads. */
export const Today: Story = { args: { canMarkDone: true } }
export const TodayPhone: Story = { ...Today, globals: PHONE }

export const Done: Story = { args: { done: true, canMarkDone: true, when: "Wed, Nov 18, 8:00 to 9:00 am" } }
export const WaitingOnCustomer: Story = { args: { waiting: true } }
export const AnyTime: Story = { args: { when: "Wed, Nov 18, Any time", who: "No one yet" } }
export const Clash: Story = { args: { conflict: "Ryan has Dry Creek Rd at 3:00 pm." } }
