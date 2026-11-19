"use client"

import { useMemo } from "react"
import { DataGrid } from "@/components/blocks/DataGrid"
import { PageHeader } from "@/components/blocks/PageHeader"
import type { AdminData } from "@/lib/admin/types"
import type { Outcome } from "./action-types"
import { NewJobButton } from "./NewJob"
import { RecordHost, useOpenRecord } from "./RecordHost"
import { initialRecord } from "@/lib/admin/record-url"
import type { JobActions } from "./job-actions-types"
import type { VisitActions } from "./visit-actions-types"
import { customerColumns } from "./customers-columns"
import { MARKETING_WORDS, SCHEDULED_WORDS, customerRows, customersContext, type CustomerRow } from "./customers-model"

// Everyone Trailhead has worked for, with the pass layered on: the one data
// grid with the normal data (full name, street, town, email, phone), each
// row saying what is next and whether it is scheduled (Hannah, 2026-11-12),
// the customer opening beside it from their name with the same data plus
// the access note, their jobs, the consent history and every message the
// app sent (one-way; Hannah, 2026-11-12 late). Client because the selected
// customer is state; the route's page.tsx supplies `data` and `today`. The
// bulk action only logs in the catalog; "Send pass offer" is the January
// pre-sell. Address, email and phone are there for the admin session and
// absent for a read key, following the API's scope rule.

export interface CustomersScreenProps {
  data: AdminData
  /** ISO datetime; a visit on or after this day is ahead */
  today: string
  /** The customer open on first render; for the catalog, since the prototype has no URL state */
  defaultSelectedId?: string
  /** the job open on first render (`?job=`), when the address holds one */
  defaultJobId?: string
  /** the visit open on first render (`?visit=`), when the address holds one */
  defaultVisitId?: string
  /** a tech reads the customers and changes nothing */
  readOnly?: boolean
  /** the panel's actions; server actions in the app. Without them the catalog's pass-offer buttons only log. */
  actions?: CustomersActions
  /** the visit panel and New job; server actions in the app */
  visitActions?: VisitActions
  /** the job panel, for a job opened from a customer */
  jobActions?: JobActions
}

export interface CustomersActions {
  /** a customer who asked by phone not to get marketing: the newest consent record says so */
  recordMarketingOptOut: (customerId: string) => Promise<Outcome>
}

const TOWNS = ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"]
const option = (value: string, label = value) => ({ value, label })
const log = (action: string) => (rows: CustomerRow[]) => console.info(action, rows.map((r) => r.name))
const BULK_ACTIONS = [{ label: "Send pass offer", onClick: log("send pass offer") }]

function Grid({ rows, offers }: { rows: CustomerRow[]; offers: boolean }) {
  const host = useOpenRecord()
  const filters = useMemo(
    () => [
      { column: "town", label: "Town", options: TOWNS.map((t) => option(t)) },
      { column: "pass", label: "Pass", options: [option("active", "Active"), option("pending", "Pending"), option("none", "None"), option("cancelled", "Canceled"), option("lapsed", "Expired")] },
      { column: "nextState", label: "Scheduled", options: (["booked", "to-schedule", "none"] as const).map((s) => option(s, `${SCHEDULED_WORDS[s]}${s === "to-schedule" ? ", unscheduled" : s === "none" ? ", nothing ahead" : ""}`)) },
      { column: "marketing", label: "Marketing", options: (["yes", "no", "not-asked"] as const).map((m) => option(m, MARKETING_WORDS[m])) },
    ],
    [],
  )
  return (
    <DataGrid
      columns={customerColumns}
      data={rows}
      getRowId={(r) => r.id}
      search={{ column: "name", placeholder: "Search by name" }}
      filters={filters}
      onOpen={(row) => host?.open("customer", row.id)}
      bulkActions={offers ? BULK_ACTIONS : undefined}
      exportName="customers"
      hiddenColumns={["marketing"]}
      pageSize={25}
      noMatchTitle="No customers match."
      emptyTitle="No customers yet"
      emptyLine="Customers appear here as passes are sold and work is booked."
    />
  )
}

export function CustomersScreen({ data, today, defaultSelectedId, defaultJobId, defaultVisitId, readOnly = false, actions, visitActions, jobActions }: CustomersScreenProps) {
  const rows = useMemo(() => customerRows(data, today), [data, today])
  // "Send pass offer" is the January pre-sell and has no API behind it yet, so the live page leaves it out.
  const offers = !actions && !readOnly
  return (
    <div data-slot="customers-screen">
      <RecordHost data={data} today={today} readOnly={readOnly} visitActions={visitActions} jobActions={jobActions} customerActions={actions} initial={initialRecord({ customerId: defaultSelectedId, jobId: defaultJobId, visitId: defaultVisitId })}>
        <PageHeader title="Customers" context={customersContext(rows)} actions={!readOnly && <NewJobButton data={data} today={today} actions={visitActions} />} />
        <Grid rows={rows} offers={offers} />
      </RecordHost>
    </div>
  )
}
