import { Badge } from "@/components/ui/badge"
import type { Pass, PassStatus } from "@/lib/admin/types"
import { formatMoney, visitMonth } from "@/lib/admin/metrics"
import { monthShort } from "./season-line-math"
import type { GridColumnDef } from "./data-grid-table"

// The Passes grid's columns, in the order Hannah reads them: name first (the
// link that opens the pass), then town, zones, blowout week, status, charged
// so far and the next visit. The per-row derivations are small pure functions
// so the tests can read them without a table.

/** "Oct 4" from an ISO date or datetime. */
export const shortDate = (iso: string) => `${monthShort(Number(iso.slice(5, 7)))} ${Number(iso.slice(8, 10))}`

/** Sum of the visit amounts already charged on this pass. */
export const chargedTotal = (pass: Pass) => pass.visits.filter((v) => v.chargedAt).reduce((sum, v) => sum + v.amount, 0)

/** The first uncharged visit: its date when booked, else its window; "Done" when every visit is charged. */
export function nextVisit(pass: Pass): string {
  const visit = pass.visits.find((v) => !v.chargedAt)
  if (!visit) return "Done"
  return visit.scheduledAt ? shortDate(visit.scheduledAt) : visit.window
}

/** The pass's next visit as a sortable day: the booked date, else the first day of the window's month; nothing once every visit is charged. */
export function nextVisitSortKey(pass: Pass): string | undefined {
  const visit = pass.visits.find((v) => !v.chargedAt)
  if (!visit) return undefined
  if (visit.scheduledAt) return visit.scheduledAt.slice(0, 10)
  const month = visitMonth(visit)
  return month ? `${pass.season}-${String(month).padStart(2, "0")}-01` : undefined
}

/** Sentence case for the cells and the filter chips. The StatusPill block takes this over in the screens phase. */
export const STATUS_LABEL: Record<PassStatus, string> = { active: "Active", cancelled: "Cancelled", lapsed: "Lapsed" }
const STATUS_VARIANT: Record<PassStatus, "default" | "outline" | "secondary"> = { active: "default", cancelled: "outline", lapsed: "secondary" }

export const passColumns: GridColumnDef<Pass>[] = [
  { id: "firstName", accessorKey: "firstName", header: "Name" },
  { id: "town", accessorKey: "town", header: "Town" },
  { id: "zones", accessorKey: "zones", header: "Zones", meta: { align: "right" } },
  { id: "blowoutWeek", accessorKey: "blowoutWeek", header: "Blowout week", cell: ({ getValue }) => shortDate(String(getValue())) },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue() as PassStatus
      return (
        <Badge variant={STATUS_VARIANT[status]} className={status === "cancelled" ? "text-muted-foreground" : undefined}>
          {STATUS_LABEL[status]}
        </Badge>
      )
    },
  },
  { id: "charged", accessorFn: chargedTotal, header: "Charged so far", meta: { align: "right" }, cell: ({ getValue }) => formatMoney(Number(getValue())) },
  { id: "nextVisit", accessorFn: nextVisitSortKey, header: "Next visit", sortUndefined: "last", cell: ({ row }) => nextVisit(row.original), meta: { csv: nextVisit } },
]
