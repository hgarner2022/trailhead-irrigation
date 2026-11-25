"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { DataGrid } from "@/components/blocks/DataGrid"
import { routePeople } from "@/lib/admin/people"
import type { AdminData } from "@/lib/admin/types"
import { useOpenVisit } from "./RecordHost"
import { visitColumns, visitCard } from "./visits-columns"
import { KIND_OPTIONS, MONEY_OPTIONS, WORK_OPTIONS, visitRows, visitsContext, type VisitRow } from "./visits-model"

// The Schedule's third view, List (docs/plans/2026-11-18-admin-holistic-design.md, 4 and 5.2): every visit of the season on the one data grid,
// the old Visits page under another name. Customer, Town, Service, Day, Time, Who, Status (the pill, with the reason after a Not done) and Money (one
// cell: the price, then what happened to it); filters in the same names; search by name or street. A row opens the visit's panel in place through the
// screen's record host. `forJob` (`?forJob=` in the address) keeps only one job's visits and says so, with a link back to all of them. Work with no day
// is Unscheduled, a day's work is Day, today's is Home; any other slice is this view.

export interface VisitsListProps {
  data: AdminData
  /** ISO datetime the states and "today" are read from */
  today: string
  /** only this job's visits, from `?forJob=` */
  forJob?: string
  /** filter chips set on first render: Home's money line links here with the visits its figure counts */
  defaultFilters?: { column: string; values: string[] }[]
  /** a row opens somewhere other than the panel (the prototype's job page) */
  onOpenVisit?: (visitId: string) => void
}

const TOWNS = ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"]

/** The line over the grid when the list is filtered to one job: which job and how many visits. */
const jobLine = (rows: VisitRow[]) => (rows.length === 0 ? "No visits on that job." : `${rows[0]!.jobLabel}: ${rows.length} ${rows.length === 1 ? "visit" : "visits"}.`)

export function VisitsList({ data, today, forJob, defaultFilters, onOpenVisit }: VisitsListProps) {
  const host = useOpenVisit()
  const open = onOpenVisit ?? host
  const all = useMemo(() => visitRows(data, today), [data, today])
  const rows = useMemo(() => (forJob ? all.filter((r) => r.jobId === forJob) : all), [all, forJob])
  const filters = useMemo(
    () => [
      { column: "work", label: "Status", options: WORK_OPTIONS },
      { column: "money", label: "Money", options: MONEY_OPTIONS },
      { column: "kind", label: "Service", options: KIND_OPTIONS },
      { column: "personId", label: "Who", options: [...routePeople(data.settings.people).map((p) => ({ value: p.id, label: p.name })), { value: "none", label: "No one yet" }] },
      { column: "town", label: "Town", options: TOWNS.map((t) => ({ value: t, label: t })) },
    ],
    [data.settings.people],
  )
  return (
    <div data-slot="visits-list" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p data-slot="list-context" className="text-sm text-muted-foreground">
          {forJob ? jobLine(rows) : visitsContext(rows)}
        </p>
        {forJob && (
          <Button variant="outline" asChild>
            <Link href="/admin/schedule?view=list">Show all</Link>
          </Button>
        )}
      </div>
      <DataGrid
        columns={visitColumns}
      card={visitCard}
        data={rows}
        getRowId={(r) => r.id}
        search={{ column: "name", placeholder: "Search by name or street" }}
        filters={filters}
        onOpen={(row) => open?.(row.id)}
        exportName="visits"
        defaultFilters={defaultFilters}
        pageSize={25}
        noMatchTitle="No visits match."
        emptyTitle="No visits yet"
        emptyLine="Visits appear here as passes are sold and work is booked. Add one with New job."
      />
    </div>
  )
}
