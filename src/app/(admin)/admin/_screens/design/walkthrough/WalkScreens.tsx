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
import { allRows, customerRows, customerIdOf, INVOICES, customerPage, invoicePage, jobView, type CustomerListRow } from "./data"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { HomeScreen } from "../../HomeScreen"
import { NewJob } from "../../NewJob"
import { EMPTY_PERSON, type CustomerChoice } from "../../CustomerPicker"
import { NewJobContext } from "./new-job-context"
import { ReportsScreen } from "../../ReportsScreen"
import { WalkSettings } from "./WalkSettings"
import { makeNewJobActions, WALK_DATA, WALK_TODAY } from "./walk-new-job"
import { Placeholder } from "./Placeholder"
import { HomeRequestRows, RequestRoute, RequestsRoute } from "./WalkRequests"
import { ApprovedJobRoute, QuoteRoute, QuotesRoute } from "./WalkQuotes"
import { ReceiptRoute } from "./receipts"
import { type Route } from "./routes"
import { WalkBestTimes, WalkSchedule } from "./WalkSchedule"
import { bestTimesFor } from "../schedule-best-times"
import { walkRoutePeople } from "./visits-data"
import { HOME_NOW, homeData } from "./walk-home"
import { WALK_SCHEDULE_WORLD, walkSchedule } from "./walk-schedule"
import { useWorldState } from "../schedule-world-store"

// The screens of the walkthrough, each one of the design pages over the walkthrough's data (docs/plans/2026-11-19-prototype-walkthrough-spec.md,
// section 2). Records open through the links the pages already draw; the two grids pass the router to their `onOpen`. No page component is edited.

// The property chip opens that customer's property, not the list: the grid's own cell links to /admin/customers.
const jobsColumns: GridColumnDef<GridJob>[] = jobGridColumns.map((c) =>
  "id" in c && c.id === "property" ? { ...c, cell: ({ row }) => (row.original.property ? <RecordChip kind="property" name={row.original.property} href={`${recordHref.customer(customerIdOf(row.original.name))}#property-h`} className="text-sm font-medium md:min-h-8" /> : null) } : c,
)
// Home, Reports and Settings are the live screens over the repo's own fixture (the catalogue stories use the same); they are not re-keyed to this world's customers. The Schedule is the Schedule prototype over this world's own calendar (`WalkSchedule`).
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
        pageSize={50}
        noMatchTitle="No jobs match."
        emptyTitle="No jobs yet"
        emptyLine="Jobs appear here as passes are sold and work is booked. Add one with New job."
      />
    </div>
  )
}

/** The best times the New job sheet lists under its Day: over the Schedule's calendar as it stands, for the customer's town and the service's minutes. */
const bestTimes = (town: Parameters<typeof bestTimesFor>[0]["town"], minutes: number, kind?: string) => bestTimesFor({ state: walkSchedule().getSnapshot(), people: walkRoutePeople(), today: WALK_SCHEDULE_WORLD.today, town, minutes, kind })

/** The real New job sheet (`_screens/NewJob.tsx`) over the walkthrough's customers and catalogue; Add job makes a row and opens its page. */
export function NewJobSheet({ sheet, onClose, onCreated, onMade, onActiveAgain, onNewQuote }: { sheet: { customer?: string; day?: string; key: number } | null; onClose: () => void; onCreated: (jobId: string) => void; onMade: () => void; onActiveAgain?: (name: string) => void; onNewQuote: (o: { customer: CustomerChoice; serviceName: string }) => void }) {
  const actions = useMemo(() => makeNewJobActions(onMade, onActiveAgain), [onMade, onActiveAgain])
  if (!sheet) return null
  // Started from a customer: the customer is already chosen (with Change), as if picked from the list. Opened empty from the Jobs grid, the header or search.
  const initial = sheet.customer ? { customer: { chosen: sheet.customer, isNew: false, person: EMPTY_PERSON, query: "", email: "" } } : undefined
  return (
    <>
      <NewJob key={sheet.key} data={WALK_DATA} today={WALK_TODAY} day={sheet.day} open onOpenChange={(o) => !o && onClose()} actions={actions} initial={initial} quotes onNewQuote={onNewQuote} onCreated={(made) => onCreated(made.jobId)} bestTimes={bestTimes} />
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
  { id: "newjob", header: () => <span className="sr-only">Actions</span>, enableSorting: false, cell: ({ row }) => <Button asChild variant="outline" size="sm" className="min-h-8"><a href={`/admin/jobs?new=1&customer=${row.original.id}`} aria-label={`New job for ${row.original.name}`}>New job</a></Button> },
]
const customerCard: GridCardSlots = { title: "name", line: ["street"], state: "status", when: ["next"], money: "unpaid" }

const STATUS_OPTIONS = (["active", "new", "past", "archived"] as const).map((value) => ({ value, label: CUSTOMER_STATUS_WORDS[value] }))
const SHOWN_BY_DEFAULT = ["active", "new", "past"]

/** Every customer of the prototype (Andrea, Marcus and Dale with full histories, Priya, Hal, Ivy and Gus for the four statuses, then everyone else with jobs, invoices or quotes), each opening a real customer page, on the embedded DataGrid recipe: name, status, street, next visit, unpaid, pass. Archived customers are hidden until "Show archived" is pressed; Cmd+K still finds them. */
export function CustomersList({ onOpen }: { onOpen: (id: string) => void }) {
  const [showArchived, setShowArchived] = useState(false)
  // the next visit reads a job made here ("Unscheduled") before the row's own words
  const data = useMemo<ListRow[]>(() => customerRows().map((r) => { const p = customerPage(r.id); const made = allRows().find((j) => j.id.startsWith("new-") && customerIdOf(j.name) === r.id); return { ...r, next: made?.next ?? r.next, status: p?.status ?? "active", dns: p?.doNotService } }), [])
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

/** Home over the Schedule's own calendar: today's stops are the Schedule's, and a stop opens the job page as a block of the Schedule does. */
function WalkHome({ onOpenJob }: { onOpenJob: (id: string, visit?: string) => void }) {
  const state = useWorldState(walkSchedule())
  const data = useMemo(() => homeData(state), [state])
  return <HomeScreen data={data} today={HOME_NOW} needsActionLead={<HomeRequestRows />} onOpenVisit={(id) => onOpenJob(id)} />
}

function StaticJob({ id }: { id: string }) {
  const toast = useToast()
  const v = jobView(id)
  // Schedule and Move are the one dialog: the calendar and the confirmation speak for it, the page itself stays the catalogue state
  if (v.kind === "page") return <JobPage job={v.data} onDo={(label) => (label === "Schedule" || label === "Move" ? undefined : toast(`${label}: this job is the catalogue state. The clickable one is Andrea Dalton's repair.`))} />
  return null
}

const NotFound = ({ what }: { what: string }) => (
  <Placeholder title="Not in this prototype" line={`${what} is not in the prototype's world. Jobs has every record that opens.`}>
    <RecordChip kind="job" name="Back to Jobs" href="/admin/jobs" />
  </Placeholder>
)

/** One route, rendered. Keyed by the caller so a record's state resets when another opens. */
export function RouteScreen({ route, ...rest }: RouteScreenProps) {
  // the page is drawn from the one calendar, so it is drawn again when a visit moves
  useWorldState(walkSchedule())
  // a job's Schedule and Move dialog lists the best times over the Schedule's calendar
  if (route.screen === "job" && route.id) return <WalkBestTimes jobId={route.id}><RouteScreenBody route={route} {...rest} /></WalkBestTimes>
  return <RouteScreenBody route={route} {...rest} />
}

export interface RouteScreenProps { route: Route; rows: GridJob[]; onBack: () => void; onOpenJob: (id: string, visit?: string) => void; onOpenSettings?: () => void; onOpenCustomer: (id: string) => void; onOpenRequest: (id: string) => void; onNew: (day?: string) => void; onNewQuote: () => void; onJobCreated?: (id: string, message: string, mode: "job" | "quote") => void }

function RouteScreenBody({ route, rows, onBack, onOpenJob, onOpenCustomer, onOpenRequest, onNew, onNewQuote, onJobCreated, onOpenSettings }: RouteScreenProps) {
  switch (route.screen) {
    case "requests":
      return <RequestsRoute filter={route.filter === "new" ? "new" : undefined} onOpen={onOpenRequest} />
    case "request":
      return <RequestRoute id={route.id ?? ""} onJobCreated={onJobCreated} />
    case "quotes":
      return <QuotesRoute filter={route.filter === "sent" ? "sent" : undefined} onNewQuote={onNewQuote} />
    case "quote":
      return <QuoteRoute id={route.id ?? ""} />
    case "jobs":
      return <WalkJobsGrid rows={rows} onOpen={onOpenJob} onNew={() => onNew()} />
    case "customers":
      return <CustomersList onOpen={onOpenCustomer} />
    case "invoices":
      return <InvoicesPage rows={INVOICES} />
    case "job": {
      const v = jobView(route.id ?? "")
      if (v.kind === "quote-job") return <ApprovedJobRoute id={route.id ?? ""} />
      if (v.kind === "flow") return <JobFlow embedded invoice={{ id: "inv-42", number: "INV-2026-0042" }} />
      if (v.kind === "trips") return <JobPagePass data={v.data} customer={v.customer} defaultOpen={route.visit} />
      if (v.kind === "page") return <StaticJob id={route.id!} />
      return <NotFound what="That job" />
    }
    case "customer": {
      const d = customerPage(route.id ?? "")
      if (d) return <CustomerPage customer={d} />
      return <NotFound what="That customer" />
    }
    case "invoice": {
      const inv = invoicePage(route.id ?? "")
      return inv ? <InvoicePage invoice={inv} /> : <NotFound what="That invoice" />
    }
    case "receipt":
      return <ReceiptRoute id={route.id ?? "card"} onBack={onBack} />
    case "home":
      return <WalkHome onOpenJob={onOpenJob} />
    case "schedule":
      return <WalkSchedule day={route.id} onOpenJob={(jobId, visitId) => onOpenJob(jobId, jobId === visitId ? undefined : visitId)} onNewJob={onNew} onOpenSettings={() => onOpenSettings?.()} />
    case "reports":
      return <ReportsScreen data={LIVE} today={LIVE_TODAY} />
    case "settings":
      return <WalkSettings />
  }
}
