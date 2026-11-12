import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusPill, statusLabel, type PillStatus } from "./StatusPill"

const STATUSES: PillStatus[] = ["active", "paid", "completed", "scheduled", "unpaid", "unscheduled", "overdue", "cancelled", "lapsed"]

const meta = {
  title: "Blocks/StatusPill",
  component: StatusPill,
  parameters: { layout: "padded" },
  args: { status: "active" },
} satisfies Meta<typeof StatusPill>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

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
  { name: "Reese", total: "$290", status: "unpaid" },
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
