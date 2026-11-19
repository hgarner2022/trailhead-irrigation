"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { DataGrid, type GridColumnDef } from "@/components/blocks/DataGrid"
import type { GridCardSlots } from "@/components/blocks/DataGridCard"
import { MoneyCell } from "@/components/blocks/MoneyCell"
import { PageHeader } from "@/components/blocks/PageHeader"
import { RecordChip } from "@/components/blocks/RecordChip"
import { recordHref } from "@/components/blocks/record-preview-model"
import { StatusPill } from "@/components/blocks/StatusPill"
import { useToast } from "@/components/blocks/Toast"
import { CustomerPage } from "../CustomerPage"
import { InvoicePage } from "../InvoicePanel"
import { InvoicesPage } from "../InvoicesPage"
import { JobFlow } from "../JobFlow"
import { JobPage } from "../JobPage"
import { JobPagePass } from "../JobPageTrips"
import { BILLING_WORDS, GRID_WORDS, SERVICE_OPTIONS, WHO_OPTIONS, jobGridCard, jobGridColumns, type BillingState, type GridJob, type GridStatus } from "../JobsGridDesign"
import { CUSTOMER_ROWS, customerIdOf, INVOICES, customerPage, invoicePage, jobView, otherCustomer, type CustomerListRow } from "./data"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { HomeScreen } from "../../HomeScreen"
import { NewJob } from "../../NewJob"
import { ReportsScreen } from "../../ReportsScreen"
import { ScheduleScreen } from "../../ScheduleScreen"
import { SettingsScreen } from "../../SettingsScreen"
import { makeNewJobActions, WALK_DATA, WALK_TODAY } from "./walk-new-job"
import { Placeholder } from "./Placeholder"
import { type Route } from "./routes"

// The screens of the walkthrough, each one of the design pages over the walkthrough's data (docs/plans/2026-11-19-prototype-walkthrough-spec.md,
// section 2). Records open through the links the pages already draw; the two grids pass the router to their `onOpen`. No page component is edited.

// The property chip opens that customer's property, not the list: the grid's own cell links to /admin/customers.
const jobsColumns: GridColumnDef<GridJob>[] = jobGridColumns.map((c) =>
  "id" in c && c.id === "property" ? { ...c, cell: ({ row }) => (row.original.property ? <RecordChip kind="property" name={row.original.property} href={`${recordHref.customer(customerIdOf(row.original.name))}#property-h`} className="text-sm font-medium md:min-h-8" /> : null) } : c,
)
// Home, Schedule, Reports and Settings are the live screens over the repo's own fixture (the catalogue stories use the same); they are not re-keyed to this world's customers.
const LIVE = snapshot as AdminData
const LIVE_TODAY = "2026-11-12T19:56:30Z"
const money = (n: number) => `$${n.toLocaleString("en-US")}`

/** The Jobs grid of the design with New job wired: it opens the sheet, and Add job opens the flow at Schedule. */
export function WalkJobsGrid({ rows, onOpen, onNew }: { rows: GridJob[]; onOpen: (id: string) => void; onNew: () => void }) {
  const out = rows.filter((r) => r.billingState === "bill-sent" || r.billingState === "overdue").length
  return (
    <div data-slot="jobs-grid-design">
      <PageHeader title="Jobs" context={`${rows.length} jobs. ${out} invoices out.`} primary={<Button type="button" className="min-h-11" onClick={onNew}>New job</Button>} />
      <DataGrid
        columns={jobsColumns}
        card={jobGridCard}
        data={rows}
        getRowId={(r: GridJob) => r.id}
        search={{ column: "name", placeholder: "Search by name, street or pass number" }}
        filters={[
          { column: "stage", label: "Status", options: (Object.keys(GRID_WORDS) as GridStatus[]).map((value) => ({ value, label: GRID_WORDS[value] })) },
          { column: "who", label: "Who", options: WHO_OPTIONS },
          { column: "billing", label: "Billing", options: (Object.keys(BILLING_WORDS) as BillingState[]).map((value) => ({ value, label: BILLING_WORDS[value] })) },
          { column: "service", label: "Job", options: SERVICE_OPTIONS },
        ]}
        hiddenColumns={["who", "jobName"]}
        onOpen={(r) => onOpen(r.id)}
        exportName="jobs"
        pageSize={25}
        noMatchTitle="No jobs match."
        emptyTitle="No jobs yet"
        emptyLine="Jobs appear here as passes are sold and work is booked. Add one with New job."
      />
    </div>
  )
}

/** The real New job sheet (`_screens/NewJob.tsx`) over the walkthrough's customers and catalogue; Add job makes a row and opens its page. */
export function NewJobSheet({ open, onClose, onCreated, onMade }: { open: boolean; onClose: () => void; onCreated: (jobId: string) => void; onMade: () => void }) {
  const actions = useMemo(() => makeNewJobActions(onMade), [onMade])
  return <NewJob data={WALK_DATA} today={WALK_TODAY} open={open} onOpenChange={(o) => !o && onClose()} actions={actions} onCreated={(made) => onCreated(made.jobId)} />
}

const customerColumns: GridColumnDef<CustomerListRow>[] = [
  { id: "name", accessorFn: (r) => `${r.name} ${r.street}`, header: "Customer", cell: ({ row }) => row.original.name, meta: { csv: (r) => (r as CustomerListRow).name } },
  { id: "street", accessorKey: "street", header: "Property", cell: ({ row }) => <RecordChip kind="property" name={row.original.street} href={`/admin/customers?customer=${row.original.id}#property-h`} className="text-sm font-medium md:min-h-8" /> },
  { id: "next", accessorKey: "next", header: "Next visit" },
  { id: "unpaid", accessorKey: "unpaid", header: "Unpaid", cell: ({ row }) => <MoneyCell end text={row.original.unpaid ? money(row.original.unpaid) : null} />, meta: { align: "right", csv: (r) => String((r as CustomerListRow).unpaid) } },
  { id: "pass", accessorKey: "pass", header: "Season Pass", cell: ({ row }) => (row.original.pass ? <StatusPill status="active" label={row.original.pass} /> : null) },
]
const customerCard: GridCardSlots = { title: "name", line: ["street"], state: "pass", when: ["next"], money: "unpaid" }

/** The three customers of the prototype, on the embedded DataGrid recipe: name, street, next visit, unpaid, pass. */
export function CustomersList({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div data-slot="walkthrough-customers">
      <PageHeader title="Customers" context="3 customers" />
      <DataGrid
        columns={customerColumns}
        card={customerCard}
        data={CUSTOMER_ROWS}
        getRowId={(r: CustomerListRow) => r.id}
        search={{ column: "name", placeholder: "Search by name or street" }}
        onOpen={(r) => onOpen(r.id)}
        noMatchTitle="No customers match."
        emptyTitle="No customers yet"
        emptyLine="Customers appear as they book or as you add them."
      />
    </div>
  )
}

function StaticJob({ id }: { id: string }) {
  const toast = useToast()
  const v = jobView(id)
  if (v.kind === "page") return <JobPage job={v.data} onDo={(label) => toast(`${label}: this job is the catalogue state. The clickable one is Andrea Dalton's repair.`)} />
  return null
}

const NotFound = ({ what }: { what: string }) => (
  <Placeholder title="Not in this prototype" line={`${what} is not in the prototype's world. Jobs has every record that opens.`}>
    <RecordChip kind="job" name="Back to Jobs" href="/admin/jobs" />
  </Placeholder>
)

/** One route, rendered. Keyed by the caller so a record's state resets when another opens. */
export function RouteScreen({ route, rows, onOpenJob, onOpenCustomer, onNew }: { route: Route; rows: GridJob[]; onOpenJob: (id: string) => void; onOpenCustomer: (id: string) => void; onNew: () => void }) {
  switch (route.screen) {
    case "jobs":
      return <WalkJobsGrid rows={rows} onOpen={onOpenJob} onNew={onNew} />
    case "customers":
      return <CustomersList onOpen={onOpenCustomer} />
    case "invoices":
      return <InvoicesPage rows={INVOICES} />
    case "job": {
      const v = jobView(route.id ?? "")
      if (v.kind === "flow") return <JobFlow />
      if (v.kind === "trips") return <JobPagePass data={v.data} />
      if (v.kind === "page") return <StaticJob id={route.id!} />
      if (v.kind === "dale")
        return (
          <Placeholder title={v.row.title} line="The pass page is shown on Andrea Dalton's Season Pass. Dale's pass is the same page with his name and card.">
            <RecordChip kind="customer" name="Dale Whitaker" href={recordHref.customer("dale")} />
            <RecordChip kind="job" name="Andrea Dalton, Season Pass TH-2027-0008" href={recordHref.job("pass-2027")} />
          </Placeholder>
        )
      return <NotFound what="That job" />
    }
    case "customer": {
      const d = customerPage(route.id ?? "")
      if (d) return <CustomerPage customer={d} />
      const other = otherCustomer(route.id ?? "")
      if (other)
        return (
          <Placeholder title={other.name} line={`${other.street}. Only Andrea Dalton, Marcus Bell and Dale Whitaker have customer pages in this prototype.`}>
            <RecordChip kind="customer" name="Andrea Dalton" href={recordHref.customer("andrea")} />
            <RecordChip kind="customer" name="Customers list" href="/admin/customers" />
          </Placeholder>
        )
      return <NotFound what="That customer" />
    }
    case "invoice": {
      const inv = invoicePage(route.id ?? "")
      return inv ? <InvoicePage invoice={inv} /> : <NotFound what="That invoice" />
    }
    case "home":
      return <HomeScreen data={LIVE} today={LIVE_TODAY} />
    case "schedule":
      return <ScheduleScreen data={LIVE} today={LIVE_TODAY} defaultDay={route.id} />
    case "reports":
      return <ReportsScreen data={LIVE} today={LIVE_TODAY} />
    case "settings":
      return <SettingsScreen data={LIVE} today={LIVE_TODAY} />
  }
}
