"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { DataGrid, type GridColumnDef } from "@/components/blocks/DataGrid"
import type { GridCardSlots } from "@/components/blocks/DataGridCard"
import { MoneyCell } from "@/components/blocks/MoneyCell"
import { PageHeader } from "@/components/blocks/PageHeader"
import { RecordChip } from "@/components/blocks/RecordChip"
import { recordHref } from "@/components/blocks/record-preview-model"
import { StatusPill } from "@/components/blocks/StatusPill"
import { DoNotServiceTag } from "@/components/blocks/DoNotServiceTag"
import { CUSTOMER_STATUS_WORDS, type CustomerStatus } from "@/lib/customers/status"
import { STATUS_PILL } from "../customer-fixtures"
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
import { EMPTY_PERSON } from "../../CustomerPicker"
import { NewJobContext } from "./new-job-context"
import { ReportsScreen } from "../../ReportsScreen"
import { ScheduleScreen } from "../../ScheduleScreen"
import { SettingsScreen } from "../../SettingsScreen"
import { makeNewJobActions, WALK_DATA, WALK_TODAY } from "./walk-new-job"
import { Placeholder } from "./Placeholder"
import { ReceiptRoute } from "./receipts"
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
export function NewJobSheet({ sheet, onClose, onCreated, onMade }: { sheet: { customer?: string; key: number } | null; onClose: () => void; onCreated: (jobId: string) => void; onMade: () => void }) {
  const actions = useMemo(() => makeNewJobActions(onMade), [onMade])
  if (!sheet) return null
  // Started from a customer: the customer is already chosen (with Change), as if picked from the list. Opened empty from the Jobs grid, the header or search.
  const initial = sheet.customer ? { customer: { chosen: sheet.customer, isNew: false, person: EMPTY_PERSON, query: "", email: "" } } : undefined
  return (
    <>
      <NewJob key={sheet.key} data={WALK_DATA} today={WALK_TODAY} open onOpenChange={(o) => !o && onClose()} actions={actions} initial={initial} onCreated={(made) => onCreated(made.jobId)} />
      <NewJobContext focusWhat={Boolean(sheet.customer)} />
    </>
  )
}

/** A row of the Customers list with the status read from the customer's jobs by `customerStatusOf`, and the Do not service mark. */
type ListRow = CustomerListRow & { status: CustomerStatus; dns?: { reason?: string } }
const customerColumns: GridColumnDef<ListRow>[] = [
  { id: "name", accessorFn: (r) => `${r.name} ${r.street}`, header: "Customer", cell: ({ row }) => <span className="inline-flex items-center gap-2">{row.original.name}{row.original.dns && <DoNotServiceTag size="sm" reason={row.original.dns.reason} />}</span>, meta: { csv: (r) => (r as CustomerListRow).name } },
  { id: "status", accessorFn: (r) => r.status, header: "Status", cell: ({ row }) => <StatusPill status={STATUS_PILL[row.original.status].status} label={STATUS_PILL[row.original.status].label} />, meta: { csv: (r) => CUSTOMER_STATUS_WORDS[(r as ListRow).status] } },
  { id: "street", accessorKey: "street", header: "Property", cell: ({ row }) => <RecordChip kind="property" name={row.original.street} href={`/admin/customers?customer=${row.original.id}#property-h`} className="text-sm font-medium md:min-h-8" /> },
  { id: "next", accessorKey: "next", header: "Next visit" },
  { id: "unpaid", accessorKey: "unpaid", header: "Unpaid", cell: ({ row }) => <MoneyCell end text={row.original.unpaid ? money(row.original.unpaid) : null} />, meta: { align: "right", csv: (r) => String((r as CustomerListRow).unpaid) } },
  { id: "pass", accessorKey: "pass", header: "Season Pass", cell: ({ row }) => (row.original.pass ? <StatusPill status="active" label={row.original.pass} /> : null) },
  { id: "newjob", header: "", enableSorting: false, cell: ({ row }) => <Button asChild variant="outline" size="sm" className="min-h-8"><a href={`/admin/jobs?new=1&customer=${row.original.id}`} aria-label={`New job for ${row.original.name}`}>New job</a></Button> },
]
const customerCard: GridCardSlots = { title: "name", line: ["street"], state: "status", when: ["next"], money: "unpaid" }

const STATUS_OPTIONS = (["active", "new", "past", "archived"] as const).map((value) => ({ value, label: CUSTOMER_STATUS_WORDS[value] }))
const SHOWN_BY_DEFAULT = ["active", "new", "past"]

/** The three customers of the prototype, on the embedded DataGrid recipe: name, status, street, next visit, unpaid, pass. Archived customers are hidden until "Show archived" is pressed; Cmd+K still finds them. */
export function CustomersList({ onOpen }: { onOpen: (id: string) => void }) {
  const [showArchived, setShowArchived] = useState(false)
  const data = useMemo<ListRow[]>(() => CUSTOMER_ROWS.map((r) => { const p = customerPage(r.id); return { ...r, status: p?.status ?? "active", dns: p?.doNotService } }), [])
  return (
    <div data-slot="walkthrough-customers">
      <PageHeader title="Customers" context={`${data.filter((r) => showArchived || r.status !== "archived").length} customers`} actions={<Button type="button" variant={showArchived ? "default" : "outline"} aria-pressed={showArchived} className="min-h-11" onClick={() => setShowArchived((v) => !v)}>Show archived</Button>} />
      <DataGrid
        key={String(showArchived)}
        columns={customerColumns}
        card={customerCard}
        data={data}
        getRowId={(r: ListRow) => r.id}
        search={{ column: "name", placeholder: "Search by name or street" }}
        filters={[{ column: "status", label: "Status", options: STATUS_OPTIONS }]}
        defaultFilters={showArchived ? [] : [{ column: "status", values: SHOWN_BY_DEFAULT }]}
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
export function RouteScreen({ route, rows, onBack, onOpenJob, onOpenCustomer, onNew }: { route: Route; rows: GridJob[]; onBack: () => void; onOpenJob: (id: string) => void; onOpenCustomer: (id: string) => void; onNew: () => void }) {
  switch (route.screen) {
    case "jobs":
      return <WalkJobsGrid rows={rows} onOpen={onOpenJob} onNew={onNew} />
    case "customers":
      return <CustomersList onOpen={onOpenCustomer} />
    case "invoices":
      return <InvoicesPage rows={INVOICES} />
    case "job": {
      const v = jobView(route.id ?? "")
      if (v.kind === "flow") return <JobFlow embedded invoice={{ id: "inv-42", number: "INV-2026-0042" }} />
      if (v.kind === "trips") return <JobPagePass data={v.data} customer={v.customer} />
      if (v.kind === "page") return <StaticJob id={route.id!} />
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
    case "receipt":
      return <ReceiptRoute id={route.id ?? "card"} onBack={onBack} />
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
