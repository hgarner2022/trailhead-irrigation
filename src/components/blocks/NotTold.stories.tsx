import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn } from "storybook/test"
import { NotTold } from "./NotTold"

// The mark for a visit whose customer has not been notified, and the one-line notice in its panel. 1280 and 375.
const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

const meta = {
  title: "Blocks/Scheduler/NotTold",
  component: NotTold,
  parameters: { layout: "padded" },
  globals: LAPTOP,
  args: { onNotify: fn(), onDontTell: fn() },
} satisfies Meta<typeof NotTold>
export default meta
type Story = StoryObj<typeof meta>

/** The notice in the visit's panel. */
export const Default: Story = {
  args: { variant: "notice" },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByText("Customer not notified")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Notify the customer" }))
    await expect(args.onNotify).toHaveBeenCalled()
  },
}
export const Phone: Story = { args: { variant: "notice" }, globals: PHONE }

/** No notice: the visit's customer was notified, so nothing is drawn. */
export const Empty: Story = {
  render: () => <p className="text-sm text-muted-foreground">Nothing is drawn for a visit whose customer was notified.</p>,
}

/** The bell on a block or a row, named for a screen reader. */
export const Mark: Story = {
  args: { variant: "mark" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("img", { name: "Customer not notified" })).toBeInTheDocument()
  },
}

/** The mark beside a block's customer line, as TimeBlock will draw it. */
export const MarkOnABlock: Story = {
  render: () => (
    <div className="w-56 rounded-lg border-2 border-dashed border-warning bg-card p-2 text-sm">
      <p className="flex items-center gap-1.5 font-medium text-navy">
        Cassie Hart
        <NotTold variant="mark" />
      </p>
      <p className="text-muted-foreground">Spring turn-on, 9:00 am</p>
    </div>
  ),
}
export const MarkOnABlockPhone: Story = { ...MarkOnABlock, globals: PHONE }
