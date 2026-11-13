import { StatusPill } from "@/components/blocks/StatusPill"
import type { GridColumnDef } from "@/components/blocks/data-grid-table"
import { TIME_ZONE, shortDate } from "@/lib/admin/format"
import { MARKETING_WORDS, NEXT_WORDS, type CustomerRow } from "./customers-model"

// The Customers grid's columns, in the order Hannah reads them: name (opens
// the customer), town, pass, what is next and whether it is booked or still
// to schedule, the last visit, and the marketing consent on record.

const NEXT_PILL: Record<CustomerRow["nextState"], Parameters<typeof StatusPill>[0]["status"] | null> = { booked: "scheduled", "to-schedule": "unscheduled", none: null }

export const customerColumns: GridColumnDef<CustomerRow>[] = [
  { id: "firstName", accessorKey: "firstName", header: "Name" },
  { id: "town", accessorKey: "town", header: "Town" },
  {
    id: "pass",
    accessorKey: "pass",
    header: "Pass",
    cell: ({ getValue }) => {
      const status = getValue() as CustomerRow["pass"]
      return status === "none" ? <span className="text-muted-foreground">None</span> : <StatusPill status={status} />
    },
    meta: { csv: (row) => (row as CustomerRow).pass },
  },
  { id: "nextKey", accessorKey: "nextKey", header: "Next", sortUndefined: "last", cell: ({ row }) => row.original.next, meta: { csv: (row) => (row as CustomerRow).next } },
  {
    id: "nextState",
    accessorKey: "nextState",
    header: "Scheduled",
    cell: ({ getValue }) => {
      const state = getValue() as CustomerRow["nextState"]
      const status = NEXT_PILL[state]
      return status ? <StatusPill status={status} label={NEXT_WORDS[state]} /> : <span className="text-muted-foreground">{NEXT_WORDS[state]}</span>
    },
    meta: { csv: (row) => NEXT_WORDS[(row as CustomerRow).nextState] },
  },
  {
    id: "lastVisitAt",
    accessorKey: "lastVisitAt",
    header: "Last visit",
    sortUndefined: "last",
    cell: ({ getValue }) => {
      const at = getValue() as string | undefined
      return at ? shortDate(at, TIME_ZONE) : <span className="text-muted-foreground">None</span>
    },
    meta: { csv: (row) => (row as CustomerRow).lastVisitAt?.slice(0, 10) ?? "" },
  },
  { id: "marketing", accessorKey: "marketing", header: "Marketing", cell: ({ getValue }) => MARKETING_WORDS[getValue() as CustomerRow["marketing"]], meta: { csv: (row) => MARKETING_WORDS[(row as CustomerRow).marketing] } },
]
