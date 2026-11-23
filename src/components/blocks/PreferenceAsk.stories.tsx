import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, screen } from "storybook/test"
import { PreferenceAsk } from "./PreferenceAsk"

// The quiet banner shown on Home, the Season Pass tab and a visit's page while we are asking for a timing (the same moment the Preference request goes out), and the dialog behind its button.
// Stories open still; the play is in a hidden twin (`!dev`, `!autodocs`).
const meta = {
  title: "Blocks/PreferenceAsk",
  component: PreferenceAsk,
  parameters: { layout: "padded" },
  args: { kind: "blowout", value: "recommended", onSave: fn() },
  decorators: [(Story) => <div className="max-w-3xl"><Story /></div>],
} satisfies Meta<typeof PreferenceAsk>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const TurnOn: Story = { args: { kind: "turn-on" } }
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }

/** The button opens the three choices; Late season saved; the answer swaps into the dialog. */
export const ChooseWhenPlay: Story = {
  tags: ["!dev", "!autodocs"],
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /Choose when/ }))
    await expect(await screen.findByRole("dialog", { name: "When would you like your fall blowout?" })).toBeInTheDocument()
    await userEvent.click(await screen.findByRole("radio", { name: /Late season/ }))
    await userEvent.click(await screen.findByRole("button", { name: "Save" }))
    await expect(await screen.findByRole("dialog", { name: "Saved: Late season, Late October." })).toBeInTheDocument()
    await expect(args.onSave).toHaveBeenCalledWith("blowout", "later")
  },
}
