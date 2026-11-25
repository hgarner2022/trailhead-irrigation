import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn } from "storybook/test"
import { PlanStrip } from "./PlanStrip"
import { PLAN, PLAN_ELEVEN, STALE_MOVE } from "./scheduler-panels-fixtures"

// Jev's proposal for a week, at 375 and 1280. Each state has a 1280 story and a 375 twin.
const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

const meta = {
  title: "Blocks/Scheduler/PlanStrip",
  component: PlanStrip,
  parameters: { layout: "padded" },
  globals: LAPTOP,
  args: { status: "ready", weekLabel: "Nov 30", moves: PLAN, savedMinutes: 94, onAccept: fn(), onDiscard: fn(), onCancel: fn(), onHover: fn() },
} satisfies Meta<typeof PlanStrip>
export default meta
type Story = StoryObj<typeof meta>

/** Four moves; the one the customer picked is unticked, so the button reads Accept 3. */
export const Default: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByRole("heading", { name: "Jev's plan, week of Nov 30" })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Accept 3" }))
    await expect(args.onAccept).toHaveBeenCalledWith(["m-1", "m-2", "m-4"])
  },
}
export const Phone: Story = { globals: PHONE }

/** Jev found nothing to change. */
export const Empty: Story = { args: { status: "empty", moves: [] } }
export const EmptyPhone: Story = { ...Empty, globals: PHONE }

export const Drafting: Story = { args: { status: "drafting", moves: [] } }
export const DraftingPhone: Story = { ...Drafting, globals: PHONE }

export const Failed: Story = { args: { status: "failed", moves: [] } }
export const FailedPhone: Story = { ...Failed, globals: PHONE }

/** All eleven ticked: the button reads Accept all. */
export const ElevenMoves: Story = {
  args: { moves: PLAN_ELEVEN, savedMinutes: 94 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("11 moves, 94 fewer driving minutes")).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Accept all" })).toBeInTheDocument()
  },
}
export const ElevenMovesPhone: Story = { ...ElevenMoves, globals: PHONE }

/** A row that changed since the plan was drawn: unticked and cannot be ticked. */
export const StaleRow: Story = { args: { moves: [...PLAN.slice(0, 2), STALE_MOVE], savedMinutes: 40 } }
export const StaleRowPhone: Story = { ...StaleRow, globals: PHONE }

/** A row where the customer picked the day: unticked, waiting for the office's call. */
export const CustomerPickedRow: Story = { args: { moves: PLAN.slice(1, 3), savedMinutes: 18 } }
export const CustomerPickedRowPhone: Story = { ...CustomerPickedRow, globals: PHONE }
