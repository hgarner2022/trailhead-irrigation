"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { DataGrid } from "@/components/blocks/DataGrid"
import { PageHeader } from "@/components/blocks/PageHeader"
import { SidePanelLayout } from "@/components/blocks/SidePanel"
import type { AdminData } from "@/lib/admin/types"
import type { JobActions } from "./job-actions-types"
import { JobPanel } from "./JobPanel"
import { jobColumns } from "./jobs-columns"
import { BILLS_OUT, KIND_OPTIONS, MONEY_OPTIONS, STAGE_OPTIONS, billsChip, billsOut, jobRows, jobsContext, seasonOptions, type JobRow } from "./jobs-model"
import { NewJobButton } from "./NewJob"
import type { VisitActions } from "./visit-actions-types"
import { VisitPanelHost } from "./VisitPanelHost"

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
  /** a tech reads the jobs and changes nothing: no New job, no buttons in the panel */
  readOnly?: boolean
  /** the job panel's lines, payments, new visit and the pass's buttons; server actions in the app */
  actions?: JobActions
  /** Send an invoice, Remind and the visit panel's own actions; server actions in the app */
  visitActions?: VisitActions
  /** filter chips set on first render: Home's money line links here with the jobs its figure counts */
  defaultFilters?: { column: string; values: string[] }[]
}

function Grid({ rows, onOpen, defaultFilters }: { rows: JobRow[]; onOpen: (row: JobRow) => void; defaultFilters?: JobsScreenProps["defaultFilters"] }) {
  const filters = useMemo(
    () => [
      { column: "stage", label: "Status", options: STAGE_OPTIONS },
      { column: "money", label: "Money", options: MONEY_OPTIONS },
      { column: "kind", label: "Job", options: KIND_OPTIONS },
      { column: "season", label: "Season", options: seasonOptions(rows) },
    ],
    [rows],
  )
  return (
    <DataGrid
      columns={jobColumns}
      data={rows}
      getRowId={(r) => r.id}
      search={{ column: "name", placeholder: "Search by name, street or pass number" }}
      filters={filters}
      onOpen={onOpen}
      exportName="jobs"
      defaultFilters={defaultFilters}
      pageSize={25}
      emptyTitle="No jobs yet"
      emptyLine="Jobs appear here as passes are sold and work is booked. Add one with New job."
    />
  )
}

export function JobsScreen({ data, today, defaultJobId, readOnly = false, actions, visitActions, defaultFilters }: JobsScreenProps) {
  const rows = useMemo(() => jobRows(data, today), [data, today])
  const [jobId, setJobId] = useState<string | undefined>(defaultJobId)
  const [open, setOpen] = useState(() => rows.some((r) => r.id === defaultJobId))
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
  // One panel at a time: a job opening closes the visit panel, and a visit opening (the host's `onShow`) closes the job's.
  const closeVisit = useRef<(() => void) | null>(null)
  const closeJob = useCallback(() => setOpen(false), [])
  const openJob = (id: string) => {
    closeVisit.current?.()
    setJobId(id)
    setOpen(true)
  }
  const show = (row: JobRow) => openJob(row.id)
  return (
    <div data-slot="jobs-screen">
      <VisitPanelHost data={data} today={today} readOnly={readOnly} actions={visitActions} onShow={closeJob} closeRef={closeVisit}>
        <PageHeader
          title="Jobs"
          context={jobsContext(rows, today)}
          actions={
            <>
              {out > 0 && (
                <Button type="button" variant="outline" className="min-h-11" aria-pressed={billsOn} onClick={toggleBills}>
                  {billsChip(out)}
                </Button>
              )}
              {!readOnly && <NewJobButton data={data} today={today} actions={visitActions} onCreated={({ jobId }) => openJob(jobId)} />}
            </>
          }
        />
        <SidePanelLayout panel={<JobPanel data={data} today={today} jobId={jobId} open={open} onOpenChange={setOpen} readOnly={readOnly} actions={actions} visitActions={visitActions} />}>
          <Grid key={gridKey} rows={rows} onOpen={show} defaultFilters={applied} />
        </SidePanelLayout>
      </VisitPanelHost>
    </div>
  )
}
