"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { DataGrid } from "@/components/blocks/DataGrid"
import { PageHeader } from "@/components/blocks/PageHeader"
import type { AdminData } from "@/lib/admin/types"
import type { JobActions } from "./job-actions-types"
import { jobColumns, jobCard } from "./jobs-columns"
import { BILLS_OUT, MONEY_OPTIONS, STAGE_OPTIONS, billsChip, billsOut, jobRows, jobsContext, seasonOptions, serviceOptions, type JobRow } from "./jobs-model"
import { NewJobButton } from "./NewJob"
import type { VisitActions } from "./visit-actions-types"
import { RecordHost, useOpenRecord } from "./RecordHost"
import { initialRecord } from "@/lib/admin/record-url"
import type { CustomersActions } from "./CustomersScreen"

// Every job of the season: a Season Pass or a one-off (repair, installation, other), one row each, on the one data grid. A
// customer has jobs and a job is done in visits (docs/DESIGN.md), so this is the parent of Visits: Customer, Job, Property, Sold,
// Status, Visits, Total, Money and Next; filters for Status, Money, Job and Season; search by name, street or pass number; Export
// like the others; New job in the header. The invoices that are out come first, and "N invoices out" in the header applies the Money
// filter that shows them. A row opens the job panel over the grid (a drawer on a laptop, a sheet on a phone); a visit in the panel
// opens the visit panel. Client because the open job is state; the route's page.tsx supplies `data`, `today` and the actions.

export interface JobsScreenProps {
  data: AdminData
  /** ISO datetime the states and "today" are read from */
  today: string
  /** the job open on first render: `?job=` on the page, or the catalog */
  defaultJobId?: string
  /** the visit open on first render (`?visit=`), when the address holds one */
  defaultVisitId?: string
  /** a tech reads the jobs and changes nothing: no New job, no buttons in the panel */
  readOnly?: boolean
  /** the job panel's lines, payments, new visit and the pass's buttons; server actions in the app */
  actions?: JobActions
  /** Send an invoice, Remind and the visit panel's own actions; server actions in the app */
  visitActions?: VisitActions
  /** the customer panel's marketing opt-out, for a customer opened from a job */
  customerActions?: CustomersActions
  /** filter chips set on first render: Home's money line links here with the jobs its figure counts */
  defaultFilters?: { column: string; values: string[] }[]
}

function Grid({ rows, services, defaultFilters }: { rows: JobRow[]; services: AdminData["services"]; defaultFilters?: JobsScreenProps["defaultFilters"] }) {
  const host = useOpenRecord()
  const filters = useMemo(
    () => [
      { column: "stage", label: "Status", options: STAGE_OPTIONS },
      { column: "money", label: "Money", options: MONEY_OPTIONS },
      { column: "kind", label: "Job", options: serviceOptions(services, rows) },
      { column: "season", label: "Season", options: seasonOptions(rows) },
    ],
    [rows, services],
  )
  return (
    <DataGrid
      columns={jobColumns}
      card={jobCard}
      data={rows}
      getRowId={(r) => r.id}
      search={{ column: "name", placeholder: "Search by name, street or pass number" }}
      filters={filters}
      onOpen={(row) => host?.open("job", row.id)}
      exportName="jobs"
      defaultFilters={defaultFilters}
      pageSize={25}
      noMatchTitle="No jobs match."
      emptyTitle="No jobs yet"
      emptyLine="Jobs appear here as passes are sold and work is booked. Add one with New job."
    />
  )
}

export function JobsScreen({ data, today, defaultJobId, defaultVisitId, readOnly = false, actions, visitActions, customerActions, defaultFilters }: JobsScreenProps) {
  const rows = useMemo(() => jobRows(data, today), [data, today])
  // The grid reads its filters once, so the "invoices out" chip starts it over: with the Money filter set to the two invoice states, or
  // with none when pressed again.
  const [applied, setApplied] = useState(defaultFilters)
  const [gridKey, setGridKey] = useState(0)
  const billsOn = Boolean(applied?.some((f) => f.column === "money" && BILLS_OUT.every((v) => f.values.includes(v))))
  const toggleBills = () => {
    setApplied(billsOn ? undefined : [{ column: "money", values: [...BILLS_OUT] }])
    setGridKey((k) => k + 1)
  }
  const out = billsOut(rows)
  return (
    <div data-slot="jobs-screen">
      <RecordHost data={data} today={today} readOnly={readOnly} visitActions={visitActions} jobActions={actions} customerActions={customerActions} initial={initialRecord({ jobId: defaultJobId, visitId: defaultVisitId })}>
        <PageHeader
          title="Jobs"
          context={jobsContext(rows, today)}
          actions={
            <>
              {out > 0 && (
                <Button size="touch" type="button" variant="outline" aria-pressed={billsOn} onClick={toggleBills}>
                  {billsChip(out)}
                </Button>
              )}
              {!readOnly && <NewJobButton data={data} today={today} actions={visitActions} />}
            </>
          }
        />
        <Grid key={gridKey} rows={rows} services={data.services} defaultFilters={applied} />
      </RecordHost>
    </div>
  )
}
