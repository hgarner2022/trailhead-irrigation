"use client"

import { Button } from "@/components/ui/button"
import { DataGrid, type GridColumnDef } from "@/components/blocks/DataGrid"
import type { GridCardSlots } from "@/components/blocks/DataGridCard"
import { recordHref } from "@/components/blocks/record-preview-model"
import { MoneyCell } from "@/components/blocks/MoneyCell"
import { PageHeader } from "@/components/blocks/PageHeader"
import { StatusPill, type PillStatus } from "@/components/blocks/StatusPill"
import { money } from "@/lib/admin/format"

// The Jobs grid with the column the design proposes: Billing in place of Money (docs/plans/2026-11-19-job-object-design.md). One row per job:
// Job, Customer (with the street under the name), Status, Visits, Total, Billing, Next. Billing is the money word of the job from `words.ts`
// ("Invoice sent, due Dec 2", "Past due since Nov 17", "$145 unpaid", "Paid, Venmo") and is empty while nothing is due. The Job filter lists
// the services. The job's name is the row's one link and the whole row opens the job page; nothing else in a row is a link. Pure props.

export type BillingState = "owed" | "bill-sent" | "overdue" | "paid" | "refunded"
export const BILLING_WORDS: Record<BillingState, string> = { owed: "Unpaid", "bill-sent": "Invoice sent", overdue: "Past due", paid: "Paid", refunded: "Refunded" }

// The Jobs list holds only real work (Hannah, Nov 22 2026: a quote is its own record and a job is made when it is approved), so Needs a quote and Quote sent are not job statuses: they are the quote's Draft and Sent, on the Quotes list
export type GridStatus = "today" | "active" | "unscheduled" | "scheduled" | "late" | "done" | "cancelled"
export const GRID_WORDS: Record<GridStatus, string> = { today: "Today", active: "Active", unscheduled: "Unscheduled", scheduled: "Scheduled", late: "Late", done: "Done", cancelled: "Canceled" }
export const GRID_TONE: Record<GridStatus, PillStatus> = { today: "today", active: "job-active", unscheduled: "needs-a-day", scheduled: "scheduled", late: "overdue", done: "done", cancelled: "cancelled" }
export const WHO_OPTIONS = ["Ryan Garner", "Hannah Garner", "No one yet"].map((w) => ({ value: w, label: w }))

export interface GridJob {
  id: string
  name: string
  /** the service the Job filter lists */
  service: string
  title: string
  property: string
  /** where the job stands today: Today (a visit is today) comes first */
  stage: GridStatus
  /** the person on the job's next visit: Ryan Garner, Hannah Garner or No one yet */
  who: string
  /** the Season Pass season, empty for a one-off */
  season: string
  visits: string
  total: number
  billingState: BillingState | null
  billing: string
  next: string
}


/** The customer in a row that is not the customer's own: plain text (the row's one link is the job), with the street as a quiet second line. */
const CustomerCell = ({ name, street }: { name: string; street: string }) => (
  <span className="block leading-tight">
    <span className="block">{name}</span>
    {street && <span className="block text-xs text-muted-foreground">{street}</span>}
  </span>
)

// One link a row (Hannah, Nov 25 2026): the first cell is the job's own name and opens the job, and the whole row opens it too. The customer, the street and the person are plain text.
export const jobGridColumns: GridColumnDef<GridJob>[] = [
  { id: "name", accessorFn: (r) => `${r.title} ${r.name} ${r.property}`, header: "Job", cell: ({ row }) => row.original.title, meta: { href: (r) => recordHref.job((r as GridJob).id), csv: (r) => (r as GridJob).title } },
  { id: "customer", accessorKey: "name", header: "Customer", cell: ({ row }) => <CustomerCell name={row.original.name} street={row.original.property} /> },
  /** the service, for the Job filter; the first column already says it, so it is not shown */
  { id: "service", accessorKey: "service", header: "Service" },
  { id: "stage", accessorKey: "stage", header: "Status", cell: ({ row }) => <StatusPill status={GRID_TONE[row.original.stage]} label={GRID_WORDS[row.original.stage]} data-pill="work" />, meta: { csv: (r) => GRID_WORDS[(r as GridJob).stage] } },
  { id: "who", accessorKey: "who", header: "Who" },
  { id: "visits", accessorKey: "visits", header: "Visits" },
  { id: "total", accessorKey: "total", header: "Total", cell: ({ row }) => (row.original.stage === "cancelled" ? null : <MoneyCell end text={row.original.total > 0 ? money(row.original.total) : "Quote later"} />), meta: { align: "right", csv: (r) => String((r as GridJob).total) } },
  { id: "billing", accessorFn: (r) => r.billingState ?? "", header: "Billing", cell: ({ row }) => <MoneyCell text={row.original.billing || null} tone={row.original.billingState === "overdue" ? "past-due" : "plain"} />, meta: { csv: (r) => (r as GridJob).billing } },
  { id: "next", accessorKey: "next", header: "Next" },
]

/** On a phone: the job, the customer and the street, where it stands, the next day, and the billing word at the right. */
export const jobGridCard: GridCardSlots = { title: "name", line: ["customer"], state: "stage", when: ["next"], money: "billing" }
/** columns that are there to filter by, not to read */
export const JOB_GRID_HIDDEN = ["who", "service"]

export const SERVICE_OPTIONS = ["Season Pass", "Spring turn-on", "Fall blowout", "Sprinkler repair", "Larger sprinkler repair", "New sprinkler system installation", "Core aeration", "Christmas lights"].map((s) => ({ value: s, label: s }))

export interface JobsGridDesignProps {
  rows: GridJob[]
  defaultFilters?: { column: string; values: string[] }[]
}

export function JobsGridDesign({ rows, defaultFilters }: JobsGridDesignProps) {
  const out = rows.filter((r) => r.billingState === "bill-sent" || r.billingState === "overdue").length
  return (
    <div data-slot="jobs-grid-design">
      <PageHeader title="Jobs" context={rows.length ? `${rows.length} jobs. ${out} invoices out.` : "No jobs yet."} actions={<Button size="touch" type="button">New job</Button>} />
      <DataGrid
        columns={jobGridColumns}
        card={jobGridCard}
        data={rows}
        getRowId={(r) => r.id}
        search={{ column: "name", placeholder: "Search by name, street or pass number" }}
        filters={[
          { column: "stage", label: "Status", options: (Object.keys(GRID_WORDS) as GridStatus[]).map((value) => ({ value, label: GRID_WORDS[value] })) },
          { column: "who", label: "Who", options: WHO_OPTIONS },
          { column: "billing", label: "Billing", options: (Object.keys(BILLING_WORDS) as BillingState[]).map((value) => ({ value, label: BILLING_WORDS[value] })) },
          { column: "service", label: "Job", options: SERVICE_OPTIONS },
        ]}
        defaultFilters={defaultFilters}
        hiddenColumns={JOB_GRID_HIDDEN}
        rowOpens
        exportName="jobs"
        pageSize={25}
        noMatchTitle="No jobs match."
        emptyTitle="No jobs yet"
        emptyLine="Jobs appear here as passes are sold and work is booked. Add one with New job."
      />
    </div>
  )
}
