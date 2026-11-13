import { StatusPill } from "@/components/blocks/StatusPill"
import type { GridColumnDef } from "@/components/blocks/data-grid-table"
import { TIME_ZONE, shortDate } from "@/lib/admin/format"
import { formatPhone } from "@/lib/format/contact"
import { MARKETING_WORDS, SCHEDULED_WORDS, type CustomerRow } from "./customers-model"

// The Customers grid's columns, in the order Hannah reads them: the full
// name (opens the customer), street, town, email, phone, the pass (season
// and status), the next job's day, whether it is scheduled, the last visit
// and the marketing consent on record. Address, email and phone are empty
// for a caller without the write scope.

const muted = (text: string) => <span className="text-muted-foreground">{text}</span>

export const customerColumns: GridColumnDef<CustomerRow>[] = [
  { id: "name", accessorKey: "name", header: "Name" },
  { id: "address", accessorKey: "address", header: "Address", cell: ({ getValue }) => (getValue() as string | undefined) ?? muted("None") },
  { id: "town", accessorKey: "town", header: "Town" },
  { id: "email", accessorKey: "email", header: "Email", cell: ({ getValue }) => (getValue() as string | undefined) ?? muted("None") },
  {
    id: "phone",
    accessorKey: "phone",
    header: "Phone",
    cell: ({ getValue }) => formatPhone(getValue() as string | undefined) || muted("None"),
    meta: { csv: (row) => formatPhone((row as CustomerRow).phone) },
  },
  {
    id: "pass",
    accessorKey: "pass",
    header: "Pass",
    cell: ({ row }) =>
      row.original.pass === "none" ? (
        muted("None")
      ) : (
        <span className="inline-flex items-center gap-2">
          <span className="tabular-nums">{row.original.season}</span>
          <StatusPill status={row.original.pass} />
        </span>
      ),
    meta: { csv: (row) => ((row as CustomerRow).pass === "none" ? "None" : `${(row as CustomerRow).season} ${(row as CustomerRow).pass}`) },
  },
  {
    id: "nextKey",
    accessorKey: "nextKey",
    header: "Next",
    sortUndefined: "last",
    cell: ({ row }) => (row.original.nextState === "none" ? muted(row.original.next) : row.original.next),
    meta: { csv: (row) => (row as CustomerRow).next },
  },
  {
    id: "nextState",
    accessorKey: "nextState",
    header: "Scheduled",
    cell: ({ getValue }) => SCHEDULED_WORDS[getValue() as CustomerRow["nextState"]],
    meta: { csv: (row) => SCHEDULED_WORDS[(row as CustomerRow).nextState] },
  },
  {
    id: "lastVisitAt",
    accessorKey: "lastVisitAt",
    header: "Last visit",
    sortUndefined: "last",
    cell: ({ getValue }) => {
      const at = getValue() as string | undefined
      return at ? shortDate(at, TIME_ZONE) : muted("None")
    },
    meta: { csv: (row) => (row as CustomerRow).lastVisitAt?.slice(0, 10) ?? "" },
  },
  { id: "marketing", accessorKey: "marketing", header: "Marketing", cell: ({ getValue }) => MARKETING_WORDS[getValue() as CustomerRow["marketing"]], meta: { csv: (row) => MARKETING_WORDS[(row as CustomerRow).marketing] } },
]
