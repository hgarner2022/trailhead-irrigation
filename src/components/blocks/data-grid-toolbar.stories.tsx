import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { useTable } from "@tanstack/react-table"
import { fn } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { DataGridBulkBar, DataGridToolbar, type GridFilter } from "./data-grid-toolbar"
import { gridFeatures, withFilterFns } from "./data-grid-table"
import { passColumns } from "./data-grid-columns"
import { statusLabel } from "./StatusPill"

// The toolbar and the bulk bar on their own, with table state fixed so each
// state can be looked at without clicking into it. The whole grid is in
// Blocks/DataGrid.
const passes = snapshot.passes as Pass[]
const SEARCH = { column: "firstName", placeholder: "Search by name" }
const FILTERS: GridFilter[] = [
  { column: "town", label: "Town", options: ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"].map((t) => ({ value: t, label: t })) },
  { column: "status", label: "Status", options: (["active", "cancelled", "lapsed"] as const).map((s) => ({ value: s, label: statusLabel(s) })) },
]
const columns = withFilterFns(passColumns, SEARCH.column, ["town", "status"])

interface ToolbarStoryProps {
  disabled?: boolean
  columnFilters?: { id: string; value: unknown }[]
  selected?: string[]
}

function Toolbar({ disabled, columnFilters = [], selected = [] }: ToolbarStoryProps) {
  const table = useTable({
    features: gridFeatures,
    columns,
    data: passes,
    getRowId: (pass) => pass.id,
    initialState: { columnFilters, rowSelection: Object.fromEntries(selected.map((id) => [id, true as const])) },
  })
  return (
    <div className="flex flex-col gap-3">
      <DataGridToolbar table={table} nameId="firstName" search={SEARCH} filters={FILTERS} exportName="passes" disabled={disabled} />
      <DataGridBulkBar table={table} actions={[{ label: "Send card update link", onClick: fn() }, { label: "Resend confirmation", onClick: fn() }]} />
    </div>
  )
}

const meta = {
  title: "Blocks/DataGrid toolbar",
  component: Toolbar,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Toolbar>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ActiveFilters: Story = {
  args: { columnFilters: [{ id: "town", value: ["Erie", "Lafayette"] }, { id: "status", value: ["active"] }] },
}

export const BulkBar: Story = {
  args: { selected: ["p1", "p2", "p3"] },
}

export const Disabled: Story = {
  args: { disabled: true },
}
