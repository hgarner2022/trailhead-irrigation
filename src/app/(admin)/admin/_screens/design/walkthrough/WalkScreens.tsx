"use client"

import { Fragment } from "react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
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
import { BILLING_WORDS, GRID_WORDS, SEASON_OPTIONS, SERVICE_OPTIONS, WHO_OPTIONS, jobGridCard, jobGridColumns, type BillingState, type GridJob, type GridStatus } from "../JobsGridDesign"
import { CUSTOMER_ROWS, GRID_ROWS, customerIdOf, INVOICES, customerPage, invoicePage, jobView, otherCustomer, type CustomerListRow } from "./data"
import { Placeholder } from "./Placeholder"
import { dayTitle, type Route } from "./routes"

// The screens of the walkthrough, each one of the design pages over the walkthrough's data (docs/plans/2026-11-19-prototype-walkthrough-spec.md,
// section 2). Records open through the links the pages already draw; the two grids pass the router to their `onOpen`. No page component is edited.

// The property chip opens that customer's property, not the list: the grid's own cell links to /admin/customers.
const jobsColumns: GridColumnDef<GridJob>[] = jobGridColumns.map((c) =>
  "id" in c && c.id === "property" ? { ...c, cell: ({ row }) => (row.original.property ? <RecordChip kind="property" name={row.original.property} href={`${recordHref.customer(customerIdOf(row.original.name))}#property-h`} className="text-sm font-medium md:min-h-8" /> : null) } : c,
)
const money = (n: number) => `$${n.toLocaleString("en-US")}`

/** The Jobs grid of the design with New job wired: it opens the sheet, and Add job opens the flow at Schedule. */
export function WalkJobsGrid({ onOpen, onNew }: { onOpen: (id: string) => void; onNew: () => void }) {
  const out = GRID_ROWS.filter((r) => r.billingState === "bill-sent" || r.billingState === "overdue").length
  return (
    <div data-slot="jobs-grid-design">
      <PageHeader title="Jobs" context={`${GRID_ROWS.length} jobs. ${out} invoices out.`} primary={<Button type="button" className="min-h-11" onClick={onNew}>New job</Button>} />
      <DataGrid
        columns={jobsColumns}
        card={jobGridCard}
        data={GRID_ROWS}
        getRowId={(r: GridJob) => r.id}
        search={{ column: "name", placeholder: "Search by name, street or pass number" }}
        filters={[
          { column: "stage", label: "Status", options: (Object.keys(GRID_WORDS) as GridStatus[]).map((value) => ({ value, label: GRID_WORDS[value] })) },
          { column: "who", label: "Who", options: WHO_OPTIONS },
          { column: "season", label: "Season", options: SEASON_OPTIONS },
          { column: "billing", label: "Billing", options: (Object.keys(BILLING_WORDS) as BillingState[]).map((value) => ({ value, label: BILLING_WORDS[value] })) },
          { column: "service", label: "Job", options: SERVICE_OPTIONS },
        ]}
        hiddenColumns={["who", "season"]}
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

/** The New job sheet is a stand-in here: it says what the live sheet does, and Add job lands on a repair waiting for a day. */
export function NewJobSheet({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: () => void }) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="New job"
      message="The live sheet asks who it is for, what we are doing (a Season Pass or one service), and an optional day. It adds the job with the lines and prices and, with a day, texts the customer. Here, Add job makes Andrea Dalton's repair, waiting for a day."
      confirmLabel="Add job"
      slot="walkthrough-new-job"
      onConfirm={async () => (onAdd(), { ok: true })}
    />
  )
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
export function RouteScreen({ route, onOpenJob, onOpenCustomer, onNew }: { route: Route; onOpenJob: (id: string) => void; onOpenCustomer: (id: string) => void; onNew: () => void }) {
  switch (route.screen) {
    case "jobs":
      return <WalkJobsGrid onOpen={onOpenJob} onNew={onNew} />
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
      return (
        <Placeholder title="Home" live="/admin" line="Home is Today: the day's stops, the money strip and what needs you. The live screen is /admin. Start from a job instead.">
          <Fragment>
            <RecordChip kind="job" name="Andrea Dalton, Sprinkler repair visit" href={recordHref.job("andrea-repair")} />
            <RecordChip kind="customer" name="Andrea Dalton" href={recordHref.customer("andrea")} />
          </Fragment>
        </Placeholder>
      )
    case "schedule":
      return (
        <Placeholder title={route.id ? dayTitle(route.id) : "Schedule"} live="/admin/schedule" line={route.id ? `The Day view of ${dayTitle(route.id)}. The live screen is /admin/schedule.` : "Week, Day and List. The live screen is /admin/schedule."}>
          <p className="text-muted-foreground">The job that day holds:</p>
          <RecordChip kind="job" name="Andrea Dalton, Sprinkler repair visit" href={recordHref.job("andrea-repair")} />
        </Placeholder>
      )
    case "reports":
      return (
        <Placeholder title="Reports" live="/admin/reports">
          <RecordChip kind="invoice" name="Invoices" href="/admin/invoices" />
        </Placeholder>
      )
    case "settings":
      return (
        <Placeholder title="Settings" live="/admin/settings" line="People, Services, Billing, Messages and API keys. The live screen is /admin/settings.">
          <RecordChip kind="job" name="Jobs" href="/admin/jobs" />
        </Placeholder>
      )
  }
}
