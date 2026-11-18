import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { expect } from "storybook/test"
import { statesOf, type JobRow } from "@/lib/admin/jobs"
import { StatusPill, StatusPills, statusLabel, type PillStatus } from "./StatusPill"

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }
const TODAY = "2026-11-12"
/** A succeeded payment row on the visit: the money words are read from rows like this one. */
const paid = (method: string) => ({ id: `pay-${method}`, visitId: "v", amount: 145, method, status: "succeeded" })
const job = (row: Partial<JobRow>) => {
  const full: JobRow = { status: "scheduled", scheduledOn: "2026-11-20", visitId: "v", ...row }
  return { state: "scheduled" as const, notClosed: false, ...statesOf(full, TODAY) }
}

const STATUSES: PillStatus[] = ["pending", "active", "paid", "needs-a-day", "scheduled", "routed", "done", "charged", "charge-failed", "cancelled", "skipped", "owed", "bill-sent", "failed", "overdue", "lapsed", "waiting"]

const meta = {
  title: "Blocks/StatusPill",
  component: StatusPill,
  parameters: { layout: "padded" },
  args: { status: "active" },
  globals: LAPTOP,
} satisfies Meta<typeof StatusPill>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** "Not yet" has no word: nothing is due, so nothing is drawn. */
export const Empty: Story = {
  args: { status: "not-yet" },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-slot="status-pill"]')).toBeNull()
  },
}

/** A visit's two pills at 375: work first, money beside it, wrapping under the subtitle. */
export const Phone: Story = {
  globals: PHONE,
  render: () => <StatusPills job={job({ status: "completed", completedOn: "2026-11-10", scheduledOn: "2026-11-10", payments: [] })} />,
}

/** Every pair a visit shows: work first, money beside it. */
export const VisitStates: Story = {
  render: () => (
    <ul className="flex flex-col gap-3">
      {[
        ["Unscheduled", job({ status: "unscheduled", scheduledOn: null })],
        ["Scheduled", job({})],
        ["Not done, no water on", job({ status: "unscheduled", scheduledOn: null, notDoneReason: "no-water" })],
        ["Done, unpaid", job({ status: "completed", completedOn: "2026-11-10", scheduledOn: "2026-11-10", payments: [] })],
        ["Done, paid by card", job({ status: "completed", completedOn: "2026-11-10", payments: [paid("card_on_file")] })],
        ["Done, paid by check", job({ status: "completed", completedOn: "2026-11-10", payments: [paid("check")] })],
        ["Done, charge failed", job({ status: "completed", completedOn: "2026-11-10", payments: [{ id: "p", visitId: "v", amount: 145, method: "card_on_file", status: "failed" }] })],
        ["Done, invoice sent", job({ status: "completed", completedOn: "2026-11-10", billSent: true })],
        ["Canceled", job({ status: "cancelled" })],
        ["Scheduled, waiting on the customer", job({}), true],
      ].map(([name, j, waiting]) => (
        <li key={name as string} className="flex items-center gap-4">
          <span className="w-48 text-xs text-muted-foreground">{name as string}</span>
          <StatusPills job={j as ReturnType<typeof job>} waiting={waiting === true} />
        </li>
      ))}
    </ul>
  ),
}

/** The customer's words on the pass page, in the status colours: a reserved blowout still needs a day underneath. */
export const CustomerWords: Story = {
  render: () => (
    <ul className="flex flex-wrap gap-6">
      <li><StatusPill status="done" label="Done" /></li>
      <li><StatusPill status="scheduled" label="Booked" /></li>
      <li><StatusPill status="needs-a-day" label="Reserved" /></li>
      <li><StatusPill status="needs-a-day" label="July" /></li>
    </ul>
  ),
}

/** Every status the app knows, with the word it shows under each. */
export const All: Story = {
  render: () => (
    <ul className="flex flex-wrap gap-6">
      {STATUSES.map((status) => (
        <li key={status} className="flex flex-col items-center gap-2">
          <StatusPill status={status} />
          <span className="text-xs text-muted-foreground">{statusLabel(status)}</span>
        </li>
      ))}
    </ul>
  ),
}

const ROWS: { name: string; total: string; status: PillStatus }[] = [
  { name: "Andrea", total: "$145", status: "paid" },
  { name: "Reese", total: "$290", status: "owed" },
  { name: "Katie", total: "$115", status: "overdue" },
]

export const InTable: Story = {
  render: () => (
    <div className="max-w-md overflow-hidden rounded-lg border border-border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROWS.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-right tabular-nums">{row.total}</TableCell>
              <TableCell>
                <StatusPill status={row.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
}
