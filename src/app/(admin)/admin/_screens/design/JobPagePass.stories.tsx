import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { AdminShell } from "@/components/blocks/AdminShell"
import { PassFlow } from "./PassFlow"
import { JobPagePass, JobPageReturnTrip } from "./JobPageTrips"
import { passPageBoughtOf, passPageOf, returnTripOf, type PassState } from "./trip-fixtures"
import { passService } from "@/lib/admin/record-title"

// The job page for a job with more than one trip: Andrea's Season Pass in four states (Season Pass TH-2027-0008, the 2027 season) and a
// repair with a return trip, at 1280 and 375. The trips are rows with Move and Mark done on the row. Pure screens over fixtures.

const meta = {
  title: "Admin/Job page, Season Pass and return trip",
  component: JobPagePass,
  parameters: { layout: "fullscreen", docs: { description: { component: "A Season Pass job and a repair with a return trip: the Visits card with one row per trip, each with its own badge, money word and Move or Mark done. Compare the four pass states and the renewal link." } } },
  args: { data: passPageOf("ahead") },
  render: (args) => (
    <AdminShell current="jobs" user={{ initials: "HG", name: "Hannah" }}>
      <JobPagePass {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof JobPagePass>
export default meta
type Story = StoryObj<typeof meta>

// A story that plays a whole path is two: the visible one opens still on its first step; its hidden twin (`!dev`, `!autodocs`: not in the sidebar, still run by `test:stories`) holds the play.
const HIDDEN = ["!dev", "!autodocs"]

const laptop = { viewport: { value: "laptop", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }
const pass = (state: PassState, globals: typeof laptop, defaultOpen?: string): Story => ({ args: { data: passPageOf(state), defaultOpen }, globals })
const back = (globals: typeof laptop): Story => ({
  args: { data: returnTripOf() },
  globals,
  render: (args) => (
    <AdminShell current="jobs" user={{ initials: "HG", name: "Hannah" }}>
      <JobPageReturnTrip data={args.data} />
    </AdminShell>
  ),
})

/** Both visits ahead. Each row opens in place, one at a time, and the first is open: When and Who as chips, the trip's actions (Move is the primary), its checklist from the spring turn-on template, its photos (From Andrea, Ours), its notes, and "Charged after this visit" under the pill. */
export const BothAhead: Story = { ...pass("ahead", laptop), name: "Both ahead" }
export const BothAheadPhone: Story = { ...pass("ahead", phone), name: "Both ahead, phone" }

/** Bought in April: the spring turn-on has its exact day and time, and the fall blowout shows "Preference: Early October" with "No day yet" and Schedule on the row, so Ryan sees what to schedule. */
export const BoughtApril: Story = { args: { data: passPageBoughtOf("april") }, globals: laptop, name: "Bought in April, one visit to schedule" }
export const BoughtAprilPhone: Story = { args: { data: passPageBoughtOf("april") }, globals: phone, name: "Bought in April, one visit to schedule, phone" }

/** Bought in January: both visits show only the customer's preference and no day; Next visit reads "Preference: Early May, No day yet". */
export const BoughtJanuary: Story = {
  args: { data: passPageBoughtOf("january") },
  globals: laptop,
  name: "Bought in January, two visits to schedule",
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.getByText("Preference: Early May · No day yet")).toBeInTheDocument()
    await expect(c.getByText("Preference: Late October · No day yet")).toBeInTheDocument()
    await expect(c.getAllByRole("button", { name: "Schedule" })).toHaveLength(2)
  },
}
export const BoughtJanuaryPhone: Story = { args: { data: passPageBoughtOf("january") }, globals: phone, name: "Bought in January, two visits to schedule, phone" }

/** The spring turn-on is Paid, card, and the fall blowout is ahead and open by itself. The Payments table has one row, the spring charge. */
export const OneDone: Story = { ...pass("one-done", laptop), name: "One done" }
export const OneDonePhone: Story = { ...pass("one-done", phone), name: "One done, phone" }

/** The spring turn-on charged, with its trip open: the finished checklist, the photos from the visit, the history with the charge, and no actions but More. */
export const OneDoneFirstOpen: Story = { ...pass("one-done", laptop, "t1"), name: "One done, first trip open" }
export const OneDoneFirstOpenPhone: Story = { ...pass("one-done", phone, "t1"), name: "One done, first trip open, phone" }

/** Both visits done and charged and the season settled: a green Paid in full line over two Payments rows. The first trip is open. */
export const BothDone: Story = { ...pass("both-done", laptop, "t1"), name: "Both done" }
export const BothDonePhone: Story = { ...pass("both-done", phone, "t1"), name: "Both done, phone" }

/** Ryan sees a canceled pass and nothing more to charge. No buttons. */
export const PassCanceled: Story = { ...pass("canceled", laptop), name: "Pass canceled" }
export const PassCanceledPhone: Story = { ...pass("canceled", phone), name: "Pass canceled, phone" }

const renewedFrom: Story = { args: { data: passPageOf("ahead", { kind: "from", number: "TH-2026-0003" }) } }
const renewedAs: Story = { args: { data: { ...passPageOf("both-done", { kind: "as", number: "TH-2027-0008" }), service: passService("TH-2026-0003") } } }

/** Ryan sees "Renewed from TH-2026-0003" under the pass card, a link to last season's pass. */
export const RenewedFrom: Story = { name: "Renewed from", ...renewedFrom, globals: laptop }

/** Ryan sees "Renewed as TH-2027-0008" on last season's pass once the renewal exists, a link to the new one. */
export const RenewedAs: Story = { name: "Renewed as", ...renewedAs, globals: laptop }

/** Ryan sees a repair with its first trip done and paid and a return trip scheduled, as two rows. The action is Mark done on the second row. */
export const ReturnTrip: Story = { ...back(laptop), name: "Return trip" }
export const ReturnTripPhone: Story = { ...back(phone), name: "Return trip, phone" }

const flowShell = () => (
  <AdminShell current="jobs" user={{ initials: "HG", name: "Hannah" }}>
    <PassFlow />
  </AdminShell>
)

/** The Season Pass branch, clickable: trip 1 goes Scheduled, Today, Active, Done and Charged ("Charge the card as agreed"), then trip 2 is next ahead and opens by itself. */
export const SeasonPassFlow: Story = {
  name: "Season Pass flow",
  globals: laptop,
  render: flowShell,
}
export const SeasonPassFlowTest: Story = {
  name: "Season Pass flow (test)", tags: HIDDEN,
  globals: laptop,
  render: flowShell,
  play: async ({ canvasElement }) => {
    const body = within(document.body)
    const c = within(canvasElement)
    const confirm = async (name: string | RegExp) => {
      await userEvent.click(await within(await body.findByRole("dialog")).findByRole("button", { name }))
      await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
    }
    await userEvent.click(await c.findByRole("button", { name: "Move" }))
    await confirm(/Move and notify the customer/)
    await userEvent.click(await c.findByRole("button", { name: "On my way" }))
    await confirm("Send and start")
    await waitFor(() => expect(c.getAllByRole("button", { name: "Mark done" }).length).toBeGreaterThan(0))
    await userEvent.click(c.getAllByRole("button", { name: "Mark done" })[0]!)
    // Mark done opens "How is this paid?" at once, so there is no moment with no dialog to wait for.
    await userEvent.click(within(await body.findByRole("dialog")).getByRole("button", { name: "Mark done" }))
    await waitFor(() => expect(within(body.getByRole("dialog")).getByText(/Andrea gets a receipt by text\./)).toBeInTheDocument())
    await userEvent.click(within(await body.findByRole("dialog")).getByRole("button", { name: /^Charge \$145/ }))
    await waitFor(() => expect(canvasElement.querySelectorAll("[data-slot=trip-row]")[0]).toHaveTextContent("Paid, card"))
    await expect(canvasElement.querySelectorAll("[data-slot=trip-row]")[1]).toHaveAttribute("data-open", "true")
  },
}
export const SeasonPassFlowPhone: Story = { name: "Season Pass flow, phone", globals: phone, render: flowShell }
