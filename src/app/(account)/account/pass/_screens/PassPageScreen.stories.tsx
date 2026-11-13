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
/** Andrea's 2026 season, every visit done and paid, as the earlier season under her 2027 pass. */
const lastYear: Pass = {
  ...allDone,
  id: "p-2026",
  number: "TH-2026-0001",
  season: 2026,
  visits: allDone.visits.map((v) => ({ ...v, scheduledAt: v.scheduledAt?.replace("2027", "2026"), completedAt: v.completedAt?.replace("2027", "2026"), chargedAt: v.chargedAt?.replace("2027", "2026") })),
}

const meta = {
  title: "Screens/PassPage",
  component: PassPageScreen,
  parameters: { layout: "fullscreen" },
  args: { pass: active, today: "2026-11-12", onCancel: fn(), onChangePreference: fn(), onPickDay: fn() },
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

/** A returning customer: the 2027 pass in full, the 2026 season as one line that opens to its visits. */
export const Returning: Story = {
  args: { passes: [active, lastYear] },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByText("2026 season"))
    await expect((await canvas.findAllByText("Fall blowout")).length).toBeGreaterThan(1)
  },
}

/** Must be home, the window about to open: the days to pick from come first. */
export const PickDay: Story = {
  args: { pass: { ...fresh, needsCustomerHome: true }, today: "2027-04-20" },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas, userEvent, args }) => {
    const [first] = await canvas.findAllByRole("button", { name: /^(Tuesday|Thursday)/ })
    await userEvent.click(first)
    await expect(await canvas.findByText(/it is\. We'll text you the window the day before\./)).toBeInTheDocument()
    await expect(args.onPickDay).toHaveBeenCalledTimes(1)
  },
}

/** The turn-on is booked: the date first, with the day-before promise. */
export const DateSet: Story = {
  args: { pass: { ...fresh, visits: fresh.visits.map((v, i) => (i === 0 ? { ...v, scheduledAt: "2027-05-05T15:00:00Z" } : v)) }, today: "2027-04-20" },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** The card failed: the warning comes before everything else. */
export const CardFailed: Story = {
  args: { pass: { ...active, cardFailedAt: "2027-05-03T17:12:00Z" }, today: "2027-05-04" },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** Every visit done and the next season on sale: Reserve next season. */
export const ReserveNext: Story = {
  args: { pass: allDone, today: "2027-11-02" },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
}

/** The scheduler (or the customer) placed the blowout: "Booked" with weekday, date and truck. */
export const Booked: Story = {
  args: { pass: { ...active, visits: active.visits.map((v) => (v.kind === "blowout" ? { ...v, scheduledAt: "2026-10-06T14:00:00Z", truckName: "Truck 1" } : v)) } },
  globals: { viewport: { value: "wide", isRotated: false } },
}
