import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table"

const meta = {
  title: "UI/Table",
  component: Table,
} satisfies Meta<typeof Table>
export default meta
type Story = StoryObj<typeof meta>

const PASSES = [
  { name: "Megan", town: "Erie", zones: 6, week: "Oct 5", status: "confirmed" },
  { name: "Derek", town: "Longmont", zones: 8, week: "Oct 5", status: "paid" },
  { name: "Priya", town: "Louisville", zones: 5, week: "Oct 12", status: "confirmed" },
  { name: "Tom", town: "Lafayette", zones: 7, week: "Oct 12", status: "past due" },
  { name: "Alison", town: "Firestone", zones: 4, week: "Oct 19", status: "paid" },
  { name: "Carlos", town: "Broomfield", zones: 9, week: "Oct 19", status: "confirmed" },
]

export const Default: Story = {
  render: () => (
    // The story scrolls inside the table's own container so the sticky header has something to stick to.
    <div className="m-6 h-48 max-w-2xl rounded-lg border border-border bg-card [&>[data-slot=table-container]]:h-full [&>[data-slot=table-container]]:overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-card">
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Town</TableHead>
            <TableHead className="text-right">Zones</TableHead>
            <TableHead>Blowout week</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {PASSES.map((pass) => (
            <TableRow key={pass.name}>
              <TableCell className="font-medium">
                <a href="#" className="text-primary-dark underline-offset-4 hover:underline">
                  {pass.name}
                </a>
              </TableCell>
              <TableCell>{pass.town}</TableCell>
              <TableCell className="text-right tabular-nums">{pass.zones}</TableCell>
              <TableCell>{pass.week}</TableCell>
              <TableCell>{pass.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
}
