import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { DataGrid } from "./DataGrid"
import { passColumns } from "./data-grid-columns"

// The Passes grid's columns on a bare grid (no search, chips or export) so
// the cells themselves can be checked: the two preferences in the customer's
// words, the status badges, the right-aligned numbers. The full grid is in Blocks/DataGrid.
const passes = snapshot.passes as Pass[]
const statuses: Pass[] = (["active", "cancelled", "lapsed"] as const).map((status, i) => ({ ...passes[i], status }))

const meta = {
  title: "Blocks/DataGrid columns",
  component: DataGrid as typeof DataGrid<Pass>,
  parameters: { layout: "padded" },
  args: { columns: passColumns, data: passes, getRowId: (pass: Pass) => pass.id, onOpen: fn() },
} satisfies Meta<typeof DataGrid<Pass>>
export default meta
type Story = StoryObj<typeof meta>

export const Passes: Story = {}

export const Statuses: Story = {
  args: { data: statuses },
}
