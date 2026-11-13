import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, screen } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { PassActions } from "./PassActions"

// passes[3] bought the two visits, so Add July inspection shows; its turn-on
// and blowout have no day, so both Change buttons show; nothing is done, so
// Skip offers both visits.
const passes = snapshot.passes as Pass[]
const twoVisits = passes[3]
const withInspection = passes[0]

const meta = {
  title: "Blocks/PassActions",
  component: PassActions,
  parameters: { layout: "padded" },
  args: { pass: twoVisits, onAddInspection: fn(), onChangePreference: fn(), onSkip: fn() },
} satisfies Meta<typeof PassActions>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Andrea's pass has the inspection and a done turn-on: no Add, one Change, Skip offers two. */
export const WithInspection: Story = {
  args: { pass: withInspection, voice: "admin" },
}

export const AddInspection: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add July inspection" }))
    await userEvent.click(await screen.findByRole("button", { name: "Add it" }))
    await expect(await screen.findByRole("dialog", { name: "The July inspection is on your pass." })).toBeInTheDocument()
    await expect(args.onAddInspection).toHaveBeenCalledWith(twoVisits.id)
  },
}

export const SkipVisit: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Skip a visit" }))
    await userEvent.click(await screen.findByRole("radio", { name: /Fall blowout/ }))
    await userEvent.click(await screen.findByRole("button", { name: "Skip it" }))
    await expect(await screen.findByRole("dialog", { name: "Fall blowout skipped." })).toBeInTheDocument()
    await expect(args.onSkip).toHaveBeenCalledWith(twoVisits.id, "blowout")
  },
}

/** A cancelled pass has no actions. */
export const Cancelled: Story = {
  args: { pass: { ...twoVisits, status: "cancelled" } },
}
