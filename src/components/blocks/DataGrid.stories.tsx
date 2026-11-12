import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Client, Pass } from "@/lib/admin/types"
import { DataGrid, type GridColumnDef } from "./DataGrid"
import { STATUS_LABEL, passColumns, shortDate } from "./data-grid-columns"

// Twelve passes for the Passes grid; the 375 clients prove paging and the
// sticky header. Columns and data are module constants, so they are stable
// across renders, which the grid needs.
const passes = snapshot.passes as Pass[]
const clients = snapshot.clients as Client[]

const option = (value: string, label = value) => ({ value, label })
const FILTERS = [
  { column: "town", label: "Town", options: ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"].map((t) => option(t)) },
  { column: "status", label: "Status", options: (["active", "cancelled", "lapsed"] as const).map((s) => option(s, STATUS_LABEL[s])) },
  { column: "blowoutWeek", label: "Blowout week", options: [...new Set(passes.map((p) => p.blowoutWeek))].sort().map((w) => option(w, `Week of ${shortDate(w)}`)) },
]

const clientColumns: GridColumnDef<Client>[] = [
  { id: "firstName", accessorKey: "firstName", header: "Name" },
  { id: "town", accessorKey: "town", header: "Town" },
  { id: "lastVisitAt", accessorKey: "lastVisitAt", header: "Last visit", cell: ({ getValue }) => (getValue() ? shortDate(String(getValue())) : "") },
  { id: "hasPass", accessorKey: "hasPass", header: "Pass", cell: ({ getValue }) => (getValue() ? "Season Pass" : "") },
]

const meta = {
  title: "Blocks/DataGrid",
  component: DataGrid as typeof DataGrid<Pass>,
  parameters: { layout: "padded" },
  args: {
    columns: passColumns,
    data: passes,
    getRowId: (pass: Pass) => pass.id,
    search: { column: "firstName", placeholder: "Search by name" },
    filters: FILTERS,
    onOpen: fn(),
    bulkActions: [
      { label: "Send card update link", onClick: fn() },
      { label: "Resend confirmation", onClick: fn() },
    ],
    exportName: "passes",
  },
} satisfies Meta<typeof DataGrid<Pass>>
export default meta
type Story = StoryObj<typeof meta>

export const Passes: Story = {}

export const WithSelection: Story = {
  args: { defaultSelectedIds: ["p1", "p2"] },
}

export const Empty: Story = {
  args: { data: [], emptyTitle: "No passes yet", emptyLine: "Passes appear here as customers reserve their season." },
}

export const Loading: Story = {
  args: { loading: true },
}

export const ManyRows: Story = {
  parameters: { docs: { description: { story: "All 375 clients, 25 to a page, to prove paging and the sticky header." } } },
  render: () => (
    <DataGrid
      columns={clientColumns}
      data={clients}
      getRowId={(client) => client.id}
      search={{ column: "firstName", placeholder: "Search by name" }}
      filters={[
        FILTERS[0],
        { column: "hasPass", label: "Pass", options: [option("true", "Season Pass"), option("false", "No pass")] },
      ]}
      onOpen={fn()}
      exportName="clients"
      pageSize={25}
    />
  ),
}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
  render: (args) => (
    <div className="w-[360px] max-w-full">
      <DataGrid {...args} />
    </div>
  ),
}
