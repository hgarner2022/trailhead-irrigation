import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, screen } from "storybook/test"
import { PreferenceDialog } from "./PreferenceDialog"

const meta = {
  title: "Blocks/PreferenceDialog",
  component: PreferenceDialog,
  parameters: { layout: "padded" },
  args: { kind: "blowout", value: "recommended", onSave: fn() },
} satisfies Meta<typeof PreferenceDialog>
export default meta
type Story = StoryObj<typeof meta>

/** The link form, as on a pass page row. */
export const Link: Story = {}

/** The button form, as in the admin's Passes panel. */
export const AsButton: Story = {
  args: { asButton: true, label: "Change blowout" },
}

/** Open, Later picked and saved: the answer in the dialog. */
export const Saved: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: /Change when we do your fall blowout/ }))
    await userEvent.click(await screen.findByRole("button", { name: "Later Late October" }))
    await userEvent.click(await screen.findByRole("button", { name: "Save" }))
    await expect(await screen.findByRole("dialog", { name: "Got it. You asked for late October for your fall blowout." })).toBeInTheDocument()
    await expect(args.onSave).toHaveBeenCalledWith("blowout", "later")
  },
}
