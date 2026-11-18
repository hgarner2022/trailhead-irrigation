import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Job } from "@/lib/admin/jobs"
import type { Pass } from "@/lib/admin/types"
import { PassSeason, type PassSeasonProps } from "./PassSeason"

// One Season Pass's season as the office reads it, with the rows already worked out (the Jobs and Customers panels hand in the same
// ones from passes-model.ts): the card and facts, consent, card line, the visits with their day, person and pills, the season line
// and the charges. Active with a visit done and one booked, pending (an unpaid attempt), cancelled, and a season that is over.

const passes = snapshot.passes as Pass[]
const base = { today: "2026-11-12T19:56:30Z", onOpenVisit: fn() }

const state = (over: Partial<Job>): Job => ({ state: "needs-a-day", notClosed: false, work: "needs-a-day", money: "not-yet", moneyLabel: "", workLabel: "Unscheduled", dayPassed: false, ...over })
const done = state({ state: "charged", work: "done", money: "paid", moneyLabel: "Paid, card", workLabel: "Done" })
const booked = state({ state: "scheduled", work: "scheduled", workLabel: "Scheduled", day: "2027-05-04" })
const open = state({})
const gone = state({ state: "cancelled", work: "cancelled", workLabel: "Cancelled" })

const facts = (pass: Pass, status: string, money?: string): [string, string][] => [["Town", pass.town], ["Zones", String(pass.zones)], ["Status", status], ...(money ? ([["Money", money]] as [string, string][]) : [])]

const props = (pass: Pass, status: string, visits: PassSeasonProps["visits"], extra: Partial<PassSeasonProps> = {}): PassSeasonProps => ({
  ...base,
  pass,
  facts: facts(pass, status, "$145 owed"),
  consent: "Terms 2026-11 accepted Nov 2. Marketing: email and text.",
  card: "Card ending 4242, expires 08/28",
  visits,
  charges: visits.map((v, i) => ({ name: v.name, when: v.detail?.split(",")[0] ?? "Unscheduled", amount: i === 0 ? "$145" : "$95", paid: i === 0 && v.job === done ? "Paid May 4" : "" })),
  ...extra,
})

const meta = {
  title: "Blocks/PassSeason",
  component: PassSeason,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
  args: props(passes[0]!, "Active", [
    { id: "v1", name: "Turn-on", detail: "May 4, 8 to 10 am, Ryan Garner", job: done },
    { id: "v2", name: "Inspection", detail: "Jul 13, Ryan Garner", job: booked },
    { id: "v3", name: "Blowout", job: open },
  ]),
} satisfies Meta<typeof PassSeason>
export default meta
type Story = StoryObj<typeof meta>

/** An active pass: one visit done and paid, one booked, one waiting for a day; each row opens its visit. */
export const Active: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: /Inspection/ }))
    await expect(args.onOpenVisit).toHaveBeenCalledWith("v2")
  },
}

/** An unpaid attempt says so and has no visits yet that anyone could open. */
export const Pending: Story = {
  args: props(passes[12]!, "Pending", [{ name: "Turn-on", job: open }, { name: "Blowout", job: open }], { pendingNote: "Checkout not finished, expires after an hour.", card: "No card yet", facts: facts(passes[12]!, "Pending"), onOpenVisit: undefined }),
}

/** A cancelled pass: its visits are Cancelled. */
export const Cancelled: Story = {
  args: props(passes[8]!, "Cancelled", [{ id: "c1", name: "Turn-on", job: gone }, { id: "c2", name: "Blowout", job: gone }], { facts: facts(passes[8]!, "Cancelled", "") }),
}

/** An earlier season, as the Customers panel folds it under "2026 season": every visit done and paid. */
export const PastSeason: Story = {
  args: props({ ...passes[1]!, season: 2026 }, "Lapsed", [{ id: "p1", name: "Turn-on", detail: "Apr 22, Ryan Garner", job: done }, { id: "p2", name: "Blowout", detail: "Oct 20, Ryan Garner", job: done }], { today: "2027-01-12T19:56:30Z", facts: facts(passes[1]!, "Lapsed", "Paid") }),
}

/** Send card link sits beside the card line for a pass that has no card. */
export const NoCard: Story = {
  args: { card: "No card yet, collect at the visit", cardAction: <button type="button" className="rounded-lg border px-3 py-1 text-sm">Send card link</button> },
}
