import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { DataGrid } from "./DataGrid"
import { passColumns } from "./data-grid-columns"

// The grid's phone form: below md a row is one card (name, a quiet line, the status, the day, the money word at the right), and the whole
// card opens the row. Every story is at 375. Search, filters, the count and the empty states are the table's own.
const passes = snapshot.passes as Pass[]

const meta = {
  title: "Blocks/DataGridCard",
  component: DataGrid as typeof DataGrid<Pass>,
  parameters: { layout: "padded" },
  globals: { viewport: { value: "phone", isRotated: false } },
  args: {
    columns: passColumns,
    data: passes,
    getRowId: (pass: Pass) => pass.id,
    search: { column: "name", placeholder: "Search by name" },
    onOpen: fn(),
    card: { title: "name", line: ["town"], state: "status", when: ["nextVisit"], money: "charged" },
  },
} satisfies Meta<typeof DataGrid<Pass>>
export default meta
type Story = StoryObj<typeof meta>

export const Cards: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-slot="data-grid-card"]').length).toBeGreaterThan(0)
  },
}

export const NoRows: Story = {
  args: { data: [], emptyTitle: "No passes yet", emptyLine: "Passes appear here as customers reserve their season." },
}

export const Loading: Story = { args: { loading: true } }
