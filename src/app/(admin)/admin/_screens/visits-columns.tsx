import Link from "next/link"
import { StatusPill } from "@/components/blocks/StatusPill"
import type { GridColumnDef } from "@/components/blocks/data-grid-table"
import { dayLabel } from "./visit-panel-model"
import type { VisitRow } from "./visits-model"

// The Visits grid's columns, in the order the spec gives them: the customer (the full name, opens the visit),
// town, the visit's kind, day, time, truck, the two pills, price and the pass number. The first column's value
// is the search text (name, street, phone) and its cell shows the name.

const muted = (text: string) => <span className="text-muted-foreground">{text}</span>

export const visitColumns: GridColumnDef<VisitRow>[] = [
  { id: "name", accessorFn: (r) => r.search, header: "Customer", cell: ({ row }) => row.original.name, meta: { csv: (r) => (r as VisitRow).name } },
  { id: "town", accessorKey: "town", header: "Town" },
  { id: "kind", accessorKey: "kind", header: "Visit", cell: ({ row }) => row.original.kindLabel, meta: { csv: (r) => (r as VisitRow).kindLabel } },
  {
    id: "day",
    accessorFn: (r) => r.day ?? "0",
    header: "Day",
    cell: ({ row }) => (row.original.day ? dayLabel(row.original.day) : muted("Needs a day")),
    meta: { csv: (r) => (r as VisitRow).day ?? "" },
  },
  { id: "time", accessorKey: "time", header: "Time", cell: ({ getValue }) => (getValue() as string) || muted("None") },
  { id: "truckId", accessorKey: "truckId", header: "Truck", cell: ({ row }) => row.original.truck || muted("None"), meta: { csv: (r) => (r as VisitRow).truck } },
  {
    id: "work",
    accessorKey: "work",
    header: "Work",
    cell: ({ row }) => (
      <span className="inline-flex flex-wrap items-center gap-1">
        <StatusPill status={row.original.work} label={row.original.workLabel} data-pill="work" />
        {row.original.dayPassed && <span className="text-xs text-muted-foreground">day passed</span>}
      </span>
    ),
    meta: { csv: (r) => (r as VisitRow).workLabel },
  },
  { id: "money", accessorKey: "money", header: "Money", cell: ({ row }) => <StatusPill status={row.original.money} label={row.original.moneyLabel} data-pill="money" />, meta: { csv: (r) => (r as VisitRow).moneyLabel } },
  { id: "price", accessorKey: "price", header: "Price", cell: ({ row }) => row.original.priceLabel, meta: { align: "right", csv: (r) => String((r as VisitRow).price) } },
  { id: "jobType", accessorKey: "jobType", header: "Pass", cell: ({ row }) => (row.original.passId ? <Link href={`/admin/passes?pass=${encodeURIComponent(row.original.passId)}`} className="text-primary-dark underline underline-offset-2">{row.original.passNumber}</Link> : muted("One-off")), meta: { csv: (r) => (r as VisitRow).passNumber ?? "" } },
]
