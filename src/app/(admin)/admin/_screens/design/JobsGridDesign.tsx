"use client"

import { Button } from "@/components/ui/button"
import { DataGrid, type GridColumnDef } from "@/components/blocks/DataGrid"
import type { GridCardSlots } from "@/components/blocks/DataGridCard"
import { MoneyCell } from "@/components/blocks/MoneyCell"
import { PageHeader } from "@/components/blocks/PageHeader"
import { STAGE_WORDS, type JobStage } from "@/lib/jobs/stage"
import { StagePill } from "../JobPills"

// The Jobs grid with the column the design proposes: Billing in place of Money (docs/plans/2026-11-19-job-object-design.md). One row per job:
// Customer, Job, Property, Status, Visits, Total, Billing, Next (eight columns). Billing is the money word of the job from `words.ts`
// ("Invoice sent, due Dec 2", "Past due since Nov 17", "$145 unpaid", "Paid, Venmo") and is empty while nothing is due. The Job filter lists
// the services. A row opens the job page. Pure props.

export type BillingState = "owed" | "bill-sent" | "overdue" | "paid"
export const BILLING_WORDS: Record<BillingState, string> = { owed: "Unpaid", "bill-sent": "Invoice sent", overdue: "Past due", paid: "Paid" }

export interface GridJob {
  id: string
  name: string
  /** the service the Job filter lists */
  service: string
  title: string
  property: string
  stage: JobStage
  visits: string
  total: number
  billingState: BillingState | null
  billing: string
  next: string
}

const money = (n: number) => `$${n.toLocaleString("en-US")}`

export const jobGridColumns: GridColumnDef<GridJob>[] = [
  { id: "name", accessorFn: (r) => `${r.name} ${r.property} ${r.title}`, header: "Customer", cell: ({ row }) => row.original.name, meta: { csv: (r) => (r as GridJob).name } },
  { id: "service", accessorKey: "service", header: "Job", cell: ({ row }) => row.original.title, meta: { csv: (r) => (r as GridJob).title } },
  { id: "property", accessorKey: "property", header: "Property" },
  { id: "stage", accessorKey: "stage", header: "Status", cell: ({ row }) => <StagePill stage={row.original.stage} />, meta: { csv: (r) => STAGE_WORDS[(r as GridJob).stage] } },
  { id: "visits", accessorKey: "visits", header: "Visits" },
  { id: "total", accessorKey: "total", header: "Total", cell: ({ row }) => (row.original.stage === "cancelled" ? null : <MoneyCell end text={row.original.total > 0 ? money(row.original.total) : "Quote later"} />), meta: { align: "right", csv: (r) => String((r as GridJob).total) } },
  { id: "billing", accessorFn: (r) => r.billingState ?? "", header: "Billing", cell: ({ row }) => <MoneyCell text={row.original.billing || null} tone={row.original.billingState === "overdue" ? "past-due" : "plain"} />, meta: { csv: (r) => (r as GridJob).billing } },
  { id: "next", accessorKey: "next", header: "Next" },
]

/** On a phone: the customer, the service, where it stands, the next day, and the billing word at the right. */
export const jobGridCard: GridCardSlots = { title: "name", line: ["service"], state: "stage", when: ["next"], money: "billing" }

export const SERVICE_OPTIONS = ["Season Pass", "Spring turn-on", "Fall blowout", "Sprinkler repair visit", "New sprinkler system installation", "Core aeration", "Christmas lights"].map((s) => ({ value: s, label: s }))

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
          { column: "stage", label: "Status", options: (Object.keys(STAGE_WORDS) as JobStage[]).map((value) => ({ value, label: STAGE_WORDS[value] })) },
          { column: "billing", label: "Billing", options: (Object.keys(BILLING_WORDS) as BillingState[]).map((value) => ({ value, label: BILLING_WORDS[value] })) },
          { column: "service", label: "Job", options: SERVICE_OPTIONS },
        ]}
        defaultFilters={defaultFilters}
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
