"use client"

import { Button } from "@/components/ui/button"
import { DataGrid, type GridColumnDef } from "@/components/blocks/DataGrid"
import type { GridCardSlots } from "@/components/blocks/DataGridCard"
import { RecordChip } from "@/components/blocks/RecordChip"
import { recordHref } from "@/components/blocks/record-preview-model"
import { MoneyCell } from "@/components/blocks/MoneyCell"
import { PageHeader } from "@/components/blocks/PageHeader"
import { StatusPill, type PillStatus } from "@/components/blocks/StatusPill"

// The Jobs grid with the column the design proposes: Billing in place of Money (docs/plans/2026-11-19-job-object-design.md). One row per job:
// Customer, Job, Property, Status, Visits, Total, Billing, Next (eight columns). Billing is the money word of the job from `words.ts`
// ("Invoice sent, due Dec 2", "Past due since Nov 17", "$145 unpaid", "Paid, Venmo") and is empty while nothing is due. The Job filter lists
// the services. A row opens the job page. Pure props.

export type BillingState = "owed" | "bill-sent" | "overdue" | "paid" | "refunded"
export const BILLING_WORDS: Record<BillingState, string> = { owed: "Unpaid", "bill-sent": "Invoice sent", overdue: "Past due", paid: "Paid", refunded: "Refunded" }

export type GridStatus = "today" | "active" | "unscheduled" | "scheduled" | "late" | "done" | "cancelled"
export const GRID_WORDS: Record<GridStatus, string> = { today: "Today", active: "Active", unscheduled: "Unscheduled", scheduled: "Scheduled", late: "Late", done: "Done", cancelled: "Canceled" }
const GRID_TONE: Record<GridStatus, PillStatus> = { today: "today", active: "job-active", unscheduled: "needs-a-day", scheduled: "scheduled", late: "overdue", done: "done", cancelled: "cancelled" }
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

const money = (n: number) => `$${n.toLocaleString("en-US")}`

export const jobGridColumns: GridColumnDef<GridJob>[] = [
  { id: "name", accessorFn: (r) => `${r.name} ${r.property} ${r.title}`, header: "Customer", cell: ({ row }) => row.original.name, meta: { csv: (r) => (r as GridJob).name } },
  { id: "service", accessorKey: "service", header: "Job", cell: ({ row }) => <RecordChip kind="job" name={row.original.title} href={recordHref.job(row.original.id)} className="text-sm font-medium md:min-h-8" />, meta: { csv: (r) => (r as GridJob).title } },
  /** the job's plain name for the phone card, which is itself one button and cannot hold a chip; the table shows the chip instead */
  { id: "jobName", accessorKey: "title", header: "Job name" },
  { id: "property", accessorKey: "property", header: "Property", cell: ({ row }) => (row.original.property ? <RecordChip kind="property" name={row.original.property} href="/admin/customers" className="text-sm font-medium md:min-h-8" /> : null) },
  { id: "stage", accessorKey: "stage", header: "Status", cell: ({ row }) => <StatusPill status={GRID_TONE[row.original.stage]} label={GRID_WORDS[row.original.stage]} data-pill="work" />, meta: { csv: (r) => GRID_WORDS[(r as GridJob).stage] } },
  { id: "who", accessorKey: "who", header: "Who", cell: ({ row }) => (row.original.who && !/^No one/.test(row.original.who) ? <RecordChip kind="person" name={row.original.who} href={recordHref.person()} className="text-sm font-medium md:min-h-8" /> : row.original.who) },
  { id: "visits", accessorKey: "visits", header: "Visits" },
  { id: "total", accessorKey: "total", header: "Total", cell: ({ row }) => (row.original.stage === "cancelled" ? null : <MoneyCell end text={row.original.total > 0 ? money(row.original.total) : "Quote later"} />), meta: { align: "right", csv: (r) => String((r as GridJob).total) } },
  { id: "billing", accessorFn: (r) => r.billingState ?? "", header: "Billing", cell: ({ row }) => <MoneyCell text={row.original.billing || null} tone={row.original.billingState === "overdue" ? "past-due" : "plain"} />, meta: { csv: (r) => (r as GridJob).billing } },
  { id: "next", accessorKey: "next", header: "Next" },
]

/** On a phone: the customer, the service, where it stands, the next day, and the billing word at the right. */
export const jobGridCard: GridCardSlots = { title: "name", line: ["jobName"], state: "stage", when: ["next"], money: "billing" }

export const SERVICE_OPTIONS = ["Season Pass", "Spring turn-on", "Fall blowout", "Sprinkler repair", "New sprinkler system installation", "Core aeration", "Christmas lights"].map((s) => ({ value: s, label: s }))

export interface JobsGridDesignProps {
  rows: GridJob[]
  defaultFilters?: { column: string; values: string[] }[]
}

export function JobsGridDesign({ rows, defaultFilters }: JobsGridDesignProps) {
  const out = rows.filter((r) => r.billingState === "bill-sent" || r.billingState === "overdue").length
  return (
    <div data-slot="jobs-grid-design">
      <PageHeader title="Jobs" context={rows.length ? `${rows.length} jobs. ${out} invoices out.` : "No jobs yet."} actions={<Button type="button" className="min-h-11">New job</Button>} />
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
        hiddenColumns={["who", "jobName"]}
        onOpen={() => undefined}
        exportName="jobs"
        pageSize={25}
        noMatchTitle="No jobs match."
        emptyTitle="No jobs yet"
        emptyLine="Jobs appear here as passes are sold and work is booked. Add one with New job."
      />
    </div>
  )
}
