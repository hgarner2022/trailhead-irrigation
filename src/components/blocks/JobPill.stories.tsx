import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { statesOf, type JobRow } from "@/lib/admin/jobs"
import { JobPill } from "./JobPill"

const TODAY = "2026-11-12"
/** A succeeded payment row on the visit: the money words are read from rows like this one. */
const paid = (method: string) => ({ id: `pay-${method}`, visitId: "v", amount: 145, method, status: "succeeded" })
const job = (row: Partial<JobRow>) => {
  const full: JobRow = { status: "scheduled", scheduledOn: "2026-11-20", visitId: "v", ...row }
  return { state: "scheduled" as const, notClosed: false, ...statesOf(full, TODAY) }
}

const meta = {
  title: "Blocks/JobPill",
  component: JobPill,
  parameters: { layout: "padded" },
  args: { job: job({}) },
} satisfies Meta<typeof JobPill>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Every pair a visit shows: work first, money beside it. */
export const AllStates: Story = {
  render: () => (
    <ul className="flex flex-col gap-3">
      {[
        ["No day yet", job({ status: "unscheduled", scheduledOn: null })],
        ["Scheduled", job({})],
        ["Not done, no water on", job({ status: "unscheduled", scheduledOn: null, notDoneReason: "no-water" })],
        ["Done, owed", job({ status: "completed", completedOn: "2026-11-10", scheduledOn: "2026-11-10", payments: [] })],
        ["Done, paid by card", job({ status: "completed", completedOn: "2026-11-10", payments: [paid("card_on_file")] })],
        ["Done, paid by check", job({ status: "completed", completedOn: "2026-11-10", payments: [paid("check")] })],
        ["Done, paid by Venmo", job({ status: "completed", completedOn: "2026-11-10", payments: [paid("venmo")] })],
        ["Done, paid in cash", job({ status: "completed", completedOn: "2026-11-10", payments: [paid("cash")] })],
        ["Done, charge failed", job({ status: "completed", completedOn: "2026-11-10", payments: [{ id: "p", visitId: "v", amount: 145, method: "card_on_file", status: "failed" }] })],
        ["Done, bill sent", job({ status: "completed", completedOn: "2026-11-10", billSent: true })],
        ["Cancelled", job({ status: "cancelled" })],
      ].map(([name, j]) => (
        <li key={name as string} className="flex items-center gap-4">
          <span className="w-48 text-xs text-muted-foreground">{name as string}</span>
          <JobPill job={j as ReturnType<typeof job>} />
        </li>
      ))}
    </ul>
  ),
}

/** A done visit with no payment row says Owed. */
export const Owed: Story = {
  args: { job: job({ status: "completed", completedOn: "2026-11-10", scheduledOn: "2026-11-10", payments: [] }) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Done")).toBeInTheDocument()
    await expect(canvas.getByText("Owed")).toBeInTheDocument()
  },
}

/** A Scheduled visit whose day has passed is still Scheduled, with a note: never a state of its own. */
export const DayPassed: Story = {
  args: { job: job({ scheduledOn: "2026-11-09" }) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Scheduled")).toBeInTheDocument()
    await expect(canvas.getByText("day passed")).toBeInTheDocument()
  },
}
