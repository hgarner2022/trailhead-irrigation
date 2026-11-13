import type { Pass, PassStatus, PassVisit } from "@/lib/admin/types"
import { fullName, shortDate } from "@/lib/admin/format"
import { dayWords } from "@/lib/admin/jobs"
import { formatMoney } from "@/lib/admin/metrics"
import { StatusPill, statusLabel } from "./StatusPill"
import type { GridColumnDef } from "./data-grid-table"

// The Passes grid's columns, in the order Hannah reads them: the customer's
// full name first (the link that opens the pass), then town, zones, the day
// each visit has (Turn-on, Inspection, Blowout: "Apr 26", with its window
// once one is set, "Needs a day" before; never a timing preference), status
// (Pending for an unpaid attempt, never Active), charged so far and the next
// visit. Every day is read off the visit row. The per-row derivations are
// small pure functions so the tests can read them without a table.

const NEEDS_DAY = "Needs a day"

/** The visit of a kind on the pass; undefined when the pass has none (no July inspection). */
const visitOf = (pass: Pass, kind: PassVisit["kind"]): PassVisit | undefined => pass.visits.find((v) => v.kind === kind)

/** A visit column's text: its day and window, "Needs a day", or "None" for a visit the pass does not have. */
export function visitDayText(pass: Pass, kind: PassVisit["kind"]): string {
  const visit = visitOf(pass, kind)
  return visit ? dayWords(visit) || NEEDS_DAY : "None"
}

/** The day a visit has as a sortable key; nothing before it has one. */
function visitDayKey(pass: Pass, kind: PassVisit["kind"]): string | undefined {
  const visit = visitOf(pass, kind)
  return visit?.scheduledOn ?? visit?.scheduledAt?.slice(0, 10)
}

function visitColumn(kind: PassVisit["kind"], header: string): GridColumnDef<Pass> {
  return {
    id: kind === "turn-on" ? "turnOn" : kind,
    accessorFn: (pass) => visitDayKey(pass, kind),
    header,
    sortUndefined: "last",
    cell: ({ row }) => visitDayText(row.original, kind),
    meta: { csv: (pass) => visitDayText(pass as Pass, kind) },
  }
}

/** Sum of the visit amounts already charged on this pass. */
export const chargedTotal = (pass: Pass) => pass.visits.filter((v) => v.chargedAt).reduce((sum, v) => sum + v.amount, 0)

/** The first uncharged visit: its day when it has one, else "Needs a day"; "Done" when every visit is charged. */
export function nextVisit(pass: Pass): string {
  const visit = pass.visits.find((v) => !v.chargedAt)
  if (!visit) return "Done"
  return dayWords(visit) ? shortDate(visit.scheduledOn ?? visit.scheduledAt!) : NEEDS_DAY
}

/** Sorts after every real day: a next visit with no day comes after the ones that have one, and before a finished pass. */
const NEEDS_DAY_KEY = "9999-99-99"

/** The pass's next visit as a sortable day: its day, else a key after every day while it needs one; nothing once every visit is charged. */
export function nextVisitSortKey(pass: Pass): string | undefined {
  const visit = pass.visits.find((v) => !v.chargedAt)
  if (!visit) return undefined
  return visit.scheduledOn ?? visit.scheduledAt?.slice(0, 10) ?? NEEDS_DAY_KEY
}

export const passColumns: GridColumnDef<Pass>[] = [
  { id: "name", accessorFn: (pass) => fullName(pass.firstName, pass.lastName), header: "Name" },
  { id: "town", accessorKey: "town", header: "Town" },
  { id: "zones", accessorKey: "zones", header: "Zones", meta: { align: "right" } },
  visitColumn("turn-on", "Turn-on"),
  visitColumn("inspection", "Inspection"),
  visitColumn("blowout", "Blowout"),
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
