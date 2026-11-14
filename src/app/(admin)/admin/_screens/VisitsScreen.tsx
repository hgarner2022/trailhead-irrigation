"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { DataGrid } from "@/components/blocks/DataGrid"
import { PageHeader } from "@/components/blocks/PageHeader"
import type { AdminData } from "@/lib/admin/types"
import { NewVisitButton } from "./NewVisit"
import type { VisitActions } from "./visit-actions-types"
import { VisitPanelHost, useOpenVisit } from "./VisitPanelHost"
import { visitColumns } from "./visits-columns"
import { JOB_TYPE_OPTIONS, KIND_OPTIONS, MONEY_OPTIONS, WORK_OPTIONS, visitRows, visitsContext, type VisitRow } from "./visits-model"

// Every visit of the season (docs/plans build-1): the customer's full name, town, the kind, day, time, truck, the
// two pills (work and money), price and pass number. Filters on both pill sets, kind, truck, town and pass or
// one-off; search by name, street or phone; New visit in the header; a row opens the visit panel beside the
// grid (a sheet on a phone). /admin/passes stays one link away in the header. Client because the open visit is
// state; the route's page.tsx supplies `data`, `today` and the actions.

export interface VisitsScreenProps {
  data: AdminData
  /** ISO datetime the states and "today" are read from */
  today: string
  /** the visit open on first render: `?visit=` on the page, or the catalog */
  defaultVisitId?: string
  /** a tech reads the visits and changes nothing: no New visit, no buttons in the panel */
  readOnly?: boolean
  actions?: VisitActions
}

const TOWNS = ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"]

function Grid({ rows, data }: { rows: VisitRow[]; data: AdminData }) {
  const open = useOpenVisit()
  const filters = useMemo(
    () => [
      { column: "work", label: "Work", options: WORK_OPTIONS },
      { column: "money", label: "Money", options: MONEY_OPTIONS },
      { column: "kind", label: "Visit", options: KIND_OPTIONS },
      { column: "truckId", label: "Truck", options: [...data.settings.trucks.map((t) => ({ value: t.id, label: t.name })), { value: "none", label: "No truck yet" }] },
      { column: "town", label: "Town", options: TOWNS.map((t) => ({ value: t, label: t })) },
      { column: "jobType", label: "Pass", options: JOB_TYPE_OPTIONS },
    ],
    [data.settings.trucks],
  )
  return (
    <DataGrid
      columns={visitColumns}
      data={rows}
      getRowId={(r) => r.id}
      search={{ column: "name", placeholder: "Search by name, street or phone" }}
      filters={filters}
      onOpen={(row) => open?.(row.id)}
      exportName="visits"
      pageSize={25}
      emptyTitle="No visits yet"
      emptyLine="Visits appear here as passes are sold and work is booked. Add one with New visit."
    />
  )
}

export function VisitsScreen({ data, today, defaultVisitId, readOnly = false, actions }: VisitsScreenProps) {
  const rows = useMemo(() => visitRows(data, today), [data, today])
  return (
    <div data-slot="visits-screen">
      <VisitPanelHost data={data} today={today} readOnly={readOnly} actions={actions} defaultVisitId={defaultVisitId}>
        <PageHeader
          title="Visits"
          context={visitsContext(rows)}
          actions={
            <>
              <Button variant="outline" className="min-h-11" asChild>
                <Link href="/admin/passes">Passes</Link>
              </Button>
              {!readOnly && <NewVisitButton data={data} today={today} actions={actions} />}
            </>
          }
        />
        <Grid rows={rows} data={data} />
      </VisitPanelHost>
    </div>
  )
}
