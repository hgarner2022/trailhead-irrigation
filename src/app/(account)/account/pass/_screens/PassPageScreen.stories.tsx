import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, screen } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { PassPageScreen } from "./PassPageScreen"

// passes[0] is Andrea in Erie with the turn-on done and the blowout preferred
// for mid October; passes[2] has had no visit yet. `today` sits
// before the 2027 season for Active and after it for AllDone.
const passes = snapshot.passes as Pass[]
const active = passes[0]
const fresh = passes[2]
const allDone: Pass = {
  ...active,
  visits: active.visits.map((v, i) => ({
    ...v,
    scheduledAt: v.scheduledAt ?? ["2027-05-03T16:00:00Z", "2027-07-13T15:00:00Z", "2027-10-05T16:00:00Z"][i],
    completedAt: ["2027-05-03T17:10:00Z", "2027-07-13T16:05:00Z", "2027-10-05T16:40:00Z"][i],
    chargedAt: ["2027-05-03T17:12:00Z", "2027-07-13T16:07:00Z", "2027-10-05T16:42:00Z"][i],
  })),
}
const cancelled: Pass = { ...active, status: "cancelled" }

const meta = {
  title: "Screens/PassPage",
  component: PassPageScreen,
  parameters: { layout: "fullscreen" },
  args: { pass: active, today: "2026-11-12", onCancel: fn(), onChangePreference: fn() },
} satisfies Meta<typeof PassPageScreen>
export default meta
type Story = StoryObj<typeof meta>

export const Active: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** Bought, nothing placed yet: both preferences on the line and in the rows. */
export const BeforeSeason: Story = {
  args: { pass: fresh },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const AllDone: Story = {
  args: { pass: allDone, today: "2027-11-01" },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const Cancelled: Story = {
  args: { pass: cancelled },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** The cancel dialog, confirmed: the words swap so the customer sees it happened. */
export const Cancelling: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Cancel my pass" }))
    await userEvent.click(await screen.findByRole("button", { name: "Cancel the pass" }))
    await expect(await screen.findByRole("dialog", { name: "Your pass is cancelled." })).toBeInTheDocument()
    await expect(args.onCancel).toHaveBeenCalledTimes(1)
  },
}

/** The blowout's Change link: the three choices, Later picked and saved, the answer in the dialog. */
export const ChangePreference: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /Change when we do your fall blowout/ }))
    await userEvent.click(await screen.findByRole("button", { name: "Later Late October" }))
    await userEvent.click(await screen.findByRole("button", { name: "Save" }))
    await expect(await screen.findByRole("dialog", { name: "Your fall blowout is now preferred late October." })).toBeInTheDocument()
    await expect(args.onChangePreference).toHaveBeenCalledWith("blowout", "later")
  },
}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
}
