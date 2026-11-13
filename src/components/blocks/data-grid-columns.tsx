import type { Pass, PassStatus, TimingPreference } from "@/lib/admin/types"
import { TIMING_PREFERENCES, preferenceLabel, shortDate } from "@/lib/admin/format"
import { formatMoney, visitMonth } from "@/lib/admin/metrics"
import { StatusPill, statusLabel } from "./StatusPill"
import type { GridColumnDef } from "./data-grid-table"

// The Passes grid's columns, in the order Hannah reads them: name first (the
// link that opens the pass), then town, zones, the turn-on and blowout timing
// preferences, status, charged so far and the next visit. The per-row
// derivations are small pure functions so the tests can read them without a
// table.

/** The filter chip options for a preference column, earlier to later, labelled in the customer's words. */
export const preferenceOptions = (kind: "turn-on" | "blowout") => TIMING_PREFERENCES.map((value) => ({ value, label: preferenceLabel(kind, value) }))

const rank = (value: unknown) => TIMING_PREFERENCES.indexOf(value as TimingPreference)

/** A preference column: the raw value for the chip filter and the sort (earlier to later), the customer's words in the cell and the CSV. */
function preferenceColumn(id: "turnOn" | "blowout", key: "turnOnPreference" | "blowoutPreference", kind: "turn-on" | "blowout", header: string): GridColumnDef<Pass> {
  const label = (pass: Pass) => preferenceLabel(kind, pass[key])
  return {
    id,
    accessorKey: key,
    header,
    sortFn: (a, b) => rank(a.getValue(id)) - rank(b.getValue(id)),
    cell: ({ row }) => label(row.original),
    meta: { csv: (pass) => label(pass as Pass) },
  }
}

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

export const passColumns: GridColumnDef<Pass>[] = [
  { id: "firstName", accessorKey: "firstName", header: "Name" },
  { id: "town", accessorKey: "town", header: "Town" },
  { id: "zones", accessorKey: "zones", header: "Zones", meta: { align: "right" } },
  preferenceColumn("turnOn", "turnOnPreference", "turn-on", "Turn-on"),
  preferenceColumn("blowout", "blowoutPreference", "blowout", "Blowout"),
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => <StatusPill status={getValue() as PassStatus} />,
    meta: { csv: (pass) => statusLabel((pass as Pass).status) },
  },
  { id: "charged", accessorFn: chargedTotal, header: "Charged so far", meta: { align: "right" }, cell: ({ getValue }) => formatMoney(Number(getValue())) },
  { id: "nextVisit", accessorFn: nextVisitSortKey, header: "Next visit", sortUndefined: "last", cell: ({ row }) => nextVisit(row.original), meta: { csv: nextVisit } },
]
