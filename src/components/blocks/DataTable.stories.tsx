import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { DataTable, type DataTableColumn } from "./DataTable"
import { StatusPill } from "./StatusPill"

interface Row {
  id: string
  name: string
  day: string
  who: string
  status: "scheduled" | "done" | "needs-a-day" | "cancelled"
  label: string
  money: string
}

const ROWS: Row[] = [
  { id: "1", name: "Season Pass 2027", day: "May 3, 2027", who: "Ryan Garner", status: "scheduled", label: "Scheduled", money: "Charged after each visit" },
  { id: "2", name: "Sprinkler repair", day: "Nov 19, 2026", who: "Ryan Garner", status: "scheduled", label: "Scheduled", money: "$145 unpaid" },
  { id: "3", name: "Fall blowout", day: "Oct 12, 2026", who: "Hannah Garner", status: "done", label: "Done", money: "Paid, Venmo" },
  { id: "4", name: "Core aeration", day: "No day yet", who: "No one yet", status: "needs-a-day", label: "Unscheduled", money: "" },
  { id: "5", name: "Christmas lights", day: "Nov 2, 2026", who: "Hannah Garner", status: "cancelled", label: "Canceled", money: "" },
]
const COLUMNS: DataTableColumn<Row>[] = [
  { id: "name", header: "Job", cell: (r) => <span className="font-semibold text-primary-dark">{r.name}</span> },
  { id: "day", header: "Day", cell: (r) => r.day },
  { id: "who", header: "Who", cell: (r) => r.who },
  { id: "status", header: "Status", cell: (r) => <StatusPill status={r.status} label={r.label} /> },
  { id: "money", header: "Billing", align: "right", cell: (r) => r.money || "None" },
]
const card = (r: Row) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between gap-3">
      <span className="font-semibold text-primary-dark">{r.name}</span>
      <StatusPill status={r.status} label={r.label} />
    </div>
    <span className="text-sm text-muted-foreground">{r.day}, {r.who}</span>
  </div>
)

const meta = {
  title: "Blocks/DataTable",
  component: DataTable<Row>,
  parameters: { layout: "padded" },
  globals: { viewport: { value: "laptop", isRotated: false } },
  decorators: [(Story) => <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"><Story /></div>],
  args: { label: "Jobs", columns: COLUMNS, rows: ROWS, getKey: (r: Row) => r.id, card, onOpen: () => undefined },
} satisfies Meta<typeof DataTable<Row>>
export default meta
type Story = StoryObj<typeof meta>

/** The table inside a card: no toolbar, a light header, 56px rows, the row opens as a whole. */
export const Default: Story = {}
/** On a phone each row is a card with 16px gutters. */
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
/** Over ten rows a quiet search appears above the header and nothing else. */
export const WithSearch: Story = { args: { rows: Array.from({ length: 12 }, (_, i) => ({ ...ROWS[i % 5]!, id: String(i), name: `${ROWS[i % 5]!.name} ${i + 1}` })), searchText: (r: Row) => r.name } }
