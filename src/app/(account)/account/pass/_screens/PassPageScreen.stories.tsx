import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, screen } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import { AccountNav } from "@/components/blocks/AccountNav"
import type { Pass } from "@/lib/admin/types"
import { serviceFor } from "@/lib/services"
import { PassEmptyScreen } from "./PassEmptyScreen"
import { PassPageScreen } from "./PassPageScreen"

// The Season Pass tab at 375 and 1280 (docs/plans/2026-11-19-customer-side-design.md, "Account structure (Nov 22 2026)"): the plan, with the pass card at its full size, "Your season" as plan lines (state and
// timing, no money, no receipt), how it is paid, and the plan's own actions. passes[0] is Andrea in Erie with the turn-on done and the blowout preferred for mid October; passes[2] has had no visit yet. `today` sits
// before the 2027 season for Active and after it for AllDone. Stories open still; each one that plays a path has a hidden twin (`!dev`, `!autodocs`) that holds the play, still run by `test:stories`.
const passes = snapshot.passes as Pass[]
// each visit carries what it includes, as the pass page reads it from the visit's line
const withDescriptions = (p: Pass): Pass => ({ ...p, visits: p.visits.map((v) => ({ ...v, description: serviceFor(v.kind, p.zones)?.description })) })
const active = withDescriptions(passes[0])
const fresh = withDescriptions(passes[2])
const allDone: Pass = {
  ...active,
  visits: active.visits.map((v, i) => ({
    ...v,
    scheduledAt: v.scheduledAt ?? ["2027-05-03T16:00:00Z", "2027-07-13T15:00:00Z", "2027-10-05T16:00:00Z"][i],
    completedAt: ["2027-05-03T17:10:00Z", "2027-07-13T16:05:00Z", "2027-10-05T16:40:00Z"][i],
    payments: [{ id: `pay-${i}`, amount: v.amount, method: "card_on_file", status: "succeeded", paidOn: ["2027-05-03", "2027-07-13", "2027-10-05"][i] }],
  })),
}
const cancelled: Pass = { ...active, status: "cancelled" }
/** Andrea's 2026 season, every visit done and paid, as the earlier season under her 2027 pass. */
const lastYear: Pass = {
  ...allDone,
  id: "p-2026",
  number: "TH-2026-0001",
  season: 2026,
  visits: allDone.visits.map((v) => ({ ...v, scheduledAt: v.scheduledAt?.replace("2027", "2026"), completedAt: v.completedAt?.replace("2027", "2026"), payments: v.payments?.map((p) => ({ ...p, paidOn: p.paidOn?.replace("2027", "2026") })) })),
}

const phone = { viewport: { value: "phone", isRotated: false } }
const wide = { viewport: { value: "wide", isRotated: false } }
const HIDDEN = ["!dev", "!autodocs"]

const meta = {
  title: "Screens/PassPage",
  component: PassPageScreen,
  parameters: { layout: "fullscreen" },
  // the tab stays lit under the real header, on the page's stone ground
  decorators: [
    (Story) => (
      <div className="min-h-svh bg-stone">
        <AccountNav firstName="Andrea" current="/account/pass" />
        <Story />
      </div>
    ),
  ],
  args: { pass: active, today: "2026-11-12", onCancel: fn(), onChangePreference: fn(), onPickDay: fn() },
} satisfies Meta<typeof PassPageScreen>
export default meta
type Story = StoryObj<typeof meta>

export const Active: Story = { globals: wide }
export const Phone: Story = { globals: phone }

/** Bought, nothing placed yet: both timings in the plan lines. */
export const BeforeSeason: Story = { args: { pass: fresh }, globals: wide }

/** We are asking for the blowout's timing: the quiet banner over the card, the same choice behind its button. */
export const AskingPhone: Story = { args: { pass: active, today: "2027-09-10", ask: "blowout" }, globals: phone }
export const AskingLaptop: Story = { args: { pass: active, today: "2027-09-10", ask: "blowout" }, globals: wide }

/** The turn-on is booked, the blowout waits for a day: the date first, the timing under the blowout. */
export const DateSet: Story = {
  args: { pass: { ...fresh, visits: fresh.visits.map((v, i) => (i === 0 ? { ...v, scheduledAt: "2027-05-05T15:00:00Z" } : v)) }, today: "2027-04-20" },
  globals: wide,
}

/** The scheduler (or the customer) placed the blowout: "Booked" with weekday, date and who is coming. */
export const Booked: Story = {
  args: { pass: { ...active, visits: active.visits.map((v) => (v.kind === "blowout" ? { ...v, scheduledAt: "2026-10-06T14:00:00Z", personName: "Ryan Garner" } : v)) } },
  globals: wide,
}

export const AllDone: Story = { args: { pass: allDone, today: "2027-11-01" }, globals: wide }

/** Every visit done and the next season on sale: Reserve next season. */
export const ReserveNext: Story = { args: { pass: allDone, today: "2027-11-02" }, globals: wide }

export const Canceled: Story = { args: { pass: cancelled }, globals: wide }

/** A returning customer: the 2027 pass in full, the 2026 season as one line that opens to its visits. */
export const Returning: Story = { args: { passes: [active, lastYear] }, globals: wide }

/** Must be home, the window about to open: the days to pick from come first. */
export const PickDay: Story = { args: { pass: { ...fresh, needsCustomerHome: true }, today: "2027-04-20" }, globals: wide }

/** The card failed: the warning comes before everything else. */
export const CardFailed: Story = { args: { pass: { ...active, cardFailedAt: "2027-05-03T17:12:00Z" }, today: "2027-05-04" }, globals: wide }

/** Sold by the office with no card: the customer pays at each visit, and the line offers "Add a card". */
export const NoCard: Story = { args: { pass: { ...fresh, cardLast4: undefined, cardExpires: undefined } }, globals: wide }

/** A customer with no pass: the tab is the one quiet explanation, "Become a Season Pass holder", with one button. */
export const NoPassPhone: StoryObj = { globals: phone, render: () => <PassEmptyScreen /> }
export const NoPassLaptop: StoryObj = { globals: wide, render: () => <PassEmptyScreen /> }

// ---- hidden twins: the plays ----

/** The cancel dialog, confirmed: the words swap so the customer sees it happened. */
export const CancellingPlay: Story = {
  tags: HIDDEN,
  globals: wide,
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Cancel my pass" }))
    await userEvent.click(await screen.findByRole("button", { name: "Cancel my pass" }))
    await expect(await screen.findByRole("dialog", { name: "Your pass is canceled." })).toBeInTheDocument()
    await expect(args.onCancel).toHaveBeenCalledTimes(1)
  },
}

/** The blowout's Change link: the three choices, Late season picked and saved, the answer in the same dialog. */
export const ChangePreferencePlay: Story = {
  tags: HIDDEN,
  globals: wide,
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /Change: your fall blowout/ }))
    await expect(await screen.findByRole("radio", { name: /Our recommended/ })).toBeChecked()
    await userEvent.click(await screen.findByRole("radio", { name: /Late season/ }))
    await userEvent.click(await screen.findByRole("button", { name: "Save" }))
    await expect(await screen.findByRole("dialog", { name: "Saved: Late season, late October." })).toBeInTheDocument()
    await expect(args.onChangePreference).toHaveBeenCalledWith("blowout", "later")
  },
}

/** The banner's button opens the same choice. */
export const AskingPlay: Story = {
  tags: HIDDEN,
  args: { pass: active, today: "2027-09-10", ask: "blowout" },
  globals: phone,
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /Choose when/ }))
    await userEvent.click(await screen.findByRole("radio", { name: /Early season/ }))
    await userEvent.click(await screen.findByRole("button", { name: "Save" }))
    await expect(args.onChangePreference).toHaveBeenCalledWith("blowout", "earlier")
  },
}

export const ReturningPlay: Story = {
  tags: HIDDEN,
  args: { passes: [active, lastYear] },
  globals: wide,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByText("2026 season"))
    await expect((await canvas.findAllByText("Fall blowout")).length).toBeGreaterThan(1)
  },
}

export const PickDayPlay: Story = {
  tags: HIDDEN,
  args: { pass: { ...fresh, needsCustomerHome: true }, today: "2027-04-20" },
  globals: wide,
  play: async ({ canvas, userEvent, args }) => {
    const [first] = await canvas.findAllByRole("button", { name: /^(Tuesday|Thursday)/ })
    await userEvent.click(first)
    await expect(await canvas.findByText(/You're set for .*\. We'll text you the time the day before\./)).toBeInTheDocument()
    await expect(args.onPickDay).toHaveBeenCalledTimes(1)
  },
}

export const NoCardPlay: Story = {
  tags: HIDDEN,
  args: { pass: { ...fresh, cardLast4: undefined, cardExpires: undefined } },
  globals: wide,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("button", { name: "Add a card" })).toBeInTheDocument()
  },
}
