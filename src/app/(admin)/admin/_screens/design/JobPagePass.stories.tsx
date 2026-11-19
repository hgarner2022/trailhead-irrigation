import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { AdminShell } from "@/components/blocks/AdminShell"
import { JobPagePass, JobPageReturnTrip } from "./JobPageTrips"
import { passPageOf, returnTripOf, type PassState } from "./trip-fixtures"

// The job page for a job with more than one trip: Andrea's Season Pass in four states (Season Pass TH-2027-0008, the 2027 season) and a
// repair with a return trip, at 1280 and 375. The trips are rows with Move and Mark done on the row. Pure screens over fixtures.

const meta = {
  title: "Design/Job page, Season Pass and return trip",
  component: JobPagePass,
  parameters: { layout: "fullscreen" },
  args: { data: passPageOf("ahead") },
  render: (args) => (
    <AdminShell current="jobs" user={{ initials: "HG", name: "Hannah" }}>
      <JobPagePass {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof JobPagePass>
export default meta
type Story = StoryObj<typeof meta>

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
export const BothAhead: Story = pass("ahead", laptop)
export const BothAheadPhone: Story = pass("ahead", phone)

/** The spring turn-on is Paid, card, and the fall blowout is ahead and open by itself. The Payments table has one row, the spring charge. */
export const OneDone: Story = pass("one-done", laptop)
export const OneDonePhone: Story = pass("one-done", phone)

/** The spring turn-on charged, with its trip open: the finished checklist, the photos from the visit, the history with the charge, and no actions but More. */
export const OneDoneFirstOpen: Story = pass("one-done", laptop, "t1")
export const OneDoneFirstOpenPhone: Story = pass("one-done", phone, "t1")

/** Both visits done and charged and the season settled: a green Paid in full line over two Payments rows. The first trip is open. */
export const BothDone: Story = pass("both-done", laptop, "t1")
export const BothDonePhone: Story = pass("both-done", phone, "t1")

/** Ryan sees a canceled pass and nothing more to charge. No buttons. */
export const PassCanceled: Story = pass("canceled", laptop)
export const PassCanceledPhone: Story = pass("canceled", phone)

const renewedFrom: Story = { args: { data: passPageOf("ahead", { kind: "from", number: "TH-2026-0003" }) } }
const renewedAs: Story = { args: { data: { ...passPageOf("both-done", { kind: "as", number: "TH-2027-0008" }), title: "Season Pass TH-2026-0003" } } }

/** Ryan sees "Renewed from TH-2026-0003" under the pass card, a link to last season's pass. */
export const RenewedFrom: Story = { ...renewedFrom, globals: laptop }

/** Ryan sees "Renewed as TH-2027-0008" on last season's pass once the renewal exists, a link to the new one. */
export const RenewedAs: Story = { ...renewedAs, globals: laptop }

/** Ryan sees a repair with its first trip done and paid and a return trip scheduled, as two rows. The action is Mark done on the second row. */
export const ReturnTrip: Story = back(laptop)
export const ReturnTripPhone: Story = back(phone)
