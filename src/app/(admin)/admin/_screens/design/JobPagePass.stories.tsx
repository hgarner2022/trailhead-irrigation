import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { AdminShell } from "@/components/blocks/AdminShell"
import { JobPagePass, JobPageReturnTrip } from "./JobPageTrips"
import { passPageOf, returnTripOf, type PassState } from "./trip-fixtures"

// The job page for a job with more than one trip: Andrea's Season Pass in four states (Season Pass TH-2027-0008, the 2027 season) and a
// repair with a return trip, at 1280 and 375. The trips are rows with Move and Mark done on the row. Pure screens over fixtures.

const meta = {
  title: "Design/Job page, Season Pass and return trip",
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

const laptop = { viewport: { value: "laptop", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }
const pass = (state: PassState, globals: typeof laptop): Story => ({ args: { data: passPageOf(state) }, globals })
const back = (globals: typeof laptop): Story => ({
  args: { data: returnTripOf() },
  globals,
  render: (args) => (
    <AdminShell current="jobs" user={{ initials: "HG", name: "Hannah" }}>
      <JobPageReturnTrip data={args.data} />
    </AdminShell>
  ),
})

/** Ryan sees both visits ahead, each with Move and Mark done on its row and "$145, charged after the visit" under the pill. There is no primary action; the work is on the rows. */
export const BothAhead: Story = { ...pass("ahead", laptop), name: "Both ahead" }
export const BothAheadPhone: Story = { ...pass("ahead", phone), name: "Both ahead phone" }

/** Ryan sees the spring turn-on Paid, card, and the fall blowout still ahead. The one action is on the fall row: Mark done. */
export const OneDone: Story = { ...pass("one-done", laptop), name: "One done" }
export const OneDonePhone: Story = { ...pass("one-done", phone), name: "One done phone" }

/** Ryan sees both visits done and paid and the season total settled. No buttons except More. */
export const BothDone: Story = { ...pass("both-done", laptop), name: "Both done" }
export const BothDonePhone: Story = { ...pass("both-done", phone), name: "Both done phone" }

/** Ryan sees a canceled pass and nothing more to charge. No buttons. */
export const PassCanceled: Story = { ...pass("canceled", laptop), name: "Pass canceled" }
export const PassCanceledPhone: Story = { ...pass("canceled", phone), name: "Pass canceled phone" }

const renewedFrom: Story = { args: { data: passPageOf("ahead", { kind: "from", number: "TH-2026-0003" }) } }
const renewedAs: Story = { args: { data: { ...passPageOf("both-done", { kind: "as", number: "TH-2027-0008" }), title: "Season Pass TH-2026-0003" } } }

/** Ryan sees "Renewed from TH-2026-0003" under the pass card, a link to last season's pass. */
export const RenewedFrom: Story = { name: "Renewed from", ...renewedFrom, globals: laptop }

/** Ryan sees "Renewed as TH-2027-0008" on last season's pass once the renewal exists, a link to the new one. */
export const RenewedAs: Story = { name: "Renewed as", ...renewedAs, globals: laptop }

/** Ryan sees a repair with its first trip done and paid and a return trip scheduled, as two rows. The action is Mark done on the second row. */
export const ReturnTrip: Story = { ...back(laptop), name: "Return trip" }
export const ReturnTripPhone: Story = { ...back(phone), name: "Return trip phone" }
