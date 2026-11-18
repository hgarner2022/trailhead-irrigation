import Link from "next/link"
import { StatusPill } from "@/components/blocks/StatusPill"
import type { GridColumnDef } from "@/components/blocks/data-grid-table"
import { dayLabel } from "./visit-panel-model"
import type { VisitRow } from "./visits-model"

// The Visits grid's columns, in the order the filters use too: Customer (the full name, opens the visit), Town,
// Service, Day, Time, Who, Status, Money, Job. The first column's value is the search text (name, street, phone, pass
// number) and its cell shows the name. Money is one cell that sorts by the amount while the chip filters by its state.

export const visitColumns: GridColumnDef<VisitRow>[] = [
  { id: "name", accessorFn: (r) => r.search, header: "Customer", cell: ({ row }) => row.original.name, meta: { csv: (r) => (r as VisitRow).name } },
  { id: "town", accessorKey: "town", header: "Town" },
  { id: "kind", accessorKey: "kind", header: "Service", cell: ({ row }) => row.original.kindLabel, meta: { csv: (r) => (r as VisitRow).kindLabel } },
  {
    id: "day",
    accessorFn: (r) => r.day ?? "0",
    header: "Day",
    cell: ({ row }) => (row.original.day ? dayLabel(row.original.day) : null),
    meta: { csv: (r) => (r as VisitRow).day ?? "" },
  },
  { id: "time", accessorKey: "time", header: "Time", cell: ({ getValue }) => (getValue() as string) || null },
  { id: "personId", accessorKey: "personId", header: "Who", cell: ({ row }) => row.original.who || null, meta: { csv: (r) => (r as VisitRow).who } },
  {
    id: "work",
    accessorKey: "work",
    header: "Status",
    cell: ({ row }) => (
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
        <StatusPill status={row.original.work} label={row.original.workLabel} data-pill="work" />
        {row.original.reason && <span className="text-xs text-muted-foreground">{`· ${row.original.reason}`}</span>}
        {row.original.dayPassed && <span className="text-xs text-muted-foreground">day passed</span>}
      </span>
    ),
    meta: { csv: (r) => [(r as VisitRow).workLabel, (r as VisitRow).reason].filter(Boolean).join(" · ") },
  },
  {
    id: "money",
    accessorKey: "money",
    header: "Money",
    // The chip filters by the state; a click on the header sorts by the amount.
    sortFn: (a, b) => (a.original as VisitRow).price - (b.original as VisitRow).price,
    cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{row.original.moneyText}</span>,
    meta: { align: "right", csv: (r) => (r as VisitRow).moneyText },
  },
  {
    id: "jobType",
    accessorKey: "jobType",
    header: "Job",
    cell: ({ row }) => (
      <Link
        href={row.original.passId ? `/admin/passes?pass=${encodeURIComponent(row.original.passId)}` : `/admin/customers?customer=${encodeURIComponent(row.original.customerId)}`}
        className="text-primary-dark underline underline-offset-2"
      >
        {row.original.jobLabel}
      </Link>
    ),
    meta: { csv: (r) => (r as VisitRow).jobLabel },
  },
]
