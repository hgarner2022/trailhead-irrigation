"use client"

import { Button } from "@/components/ui/button"
import { DataGrid, type GridColumnDef } from "@/components/blocks/DataGrid"
import type { GridCardSlots } from "@/components/blocks/DataGridCard"
import { MoneyCell } from "@/components/blocks/MoneyCell"
import { PageHeader } from "@/components/blocks/PageHeader"
import { StatTile } from "@/components/blocks/StatTile"
import { StatusPill, type PillStatus } from "@/components/blocks/StatusPill"
import { INVOICE_WORDS, OWED, PAST_DUE, type InvoiceGridRow, type InvoiceStatus } from "./invoice-fixtures"

// Invoices, the screen the left column gets (docs/plans/2026-11-19-job-object-design.md): four tiles (Unpaid, Past due, Paid this
// month, Days to get paid), then one grid of every invoice, past due first. Customer, Invoice, Due, For, Status, Total, Balance (seven
// columns); filters Status and Date; search by customer, number or street; New invoice is the header's one filled button. A row opens the
// invoice panel. Pure props: the rows come in, nothing is fetched or sent.

const TONE: Record<InvoiceStatus, PillStatus> = { sent: "bill-sent", "past-due": "overdue", "part-paid": "owed", paid: "paid", voided: "cancelled" }
const money = (n: number) => `$${n.toLocaleString("en-US")}`

export const invoiceColumns: GridColumnDef<InvoiceGridRow>[] = [
  { id: "name", accessorFn: (r) => `${r.name} ${r.number} ${r.forText}`, header: "Customer", cell: ({ row }) => row.original.name, meta: { csv: (r) => (r as InvoiceGridRow).name } },
  { id: "number", accessorKey: "number", header: "Invoice" },
  { id: "due", accessorKey: "dueOn", header: "Due", cell: ({ row }) => row.original.due },
  { id: "forText", accessorKey: "forText", header: "For" },
  { id: "status", accessorKey: "status", header: "Status", cell: ({ row }) => <StatusPill status={TONE[row.original.status]} label={INVOICE_WORDS[row.original.status]} />, meta: { csv: (r) => INVOICE_WORDS[(r as InvoiceGridRow).status] } },
  { id: "range", accessorKey: "range", header: "Date" },
  { id: "total", accessorKey: "total", header: "Total", cell: ({ row }) => <MoneyCell end text={money(row.original.total)} />, meta: { align: "right", csv: (r) => String((r as InvoiceGridRow).total) } },
  { id: "balance", accessorKey: "balance", header: "Balance", cell: ({ row }) => <MoneyCell end text={row.original.balance > 0 ? money(row.original.balance) : null} tone={row.original.status === "past-due" ? "past-due" : "plain"} />, meta: { align: "right", csv: (r) => String((r as InvoiceGridRow).balance) } },
]

/** On a phone: the customer, what it is for, the status, the due day, and the balance at the right. */
export const invoiceCard: GridCardSlots = { title: "name", line: ["forText"], state: "status", when: ["due"], money: "balance" }

const FILTERS = [
  { column: "status", label: "Status", options: (Object.keys(INVOICE_WORDS) as InvoiceStatus[]).map((value) => ({ value, label: INVOICE_WORDS[value] })) },
  { column: "range", label: "Date", options: [{ value: "this-month", label: "This month" }, { value: "last-30", label: "Last 30 days" }, { value: "earlier", label: "Earlier" }] },
]

export interface InvoicesPageProps {
  rows: InvoiceGridRow[]
  /** "$1,230" */
  paidThisMonth?: string
  /** "6" */
  daysToGetPaid?: string
  /** filter chips set on first render, for the no-match story */
  defaultFilters?: { column: string; values: string[] }[]
}

export function InvoicesPage({ rows, paidThisMonth = "$1,230", daysToGetPaid = "6", defaultFilters }: InvoicesPageProps) {
  const out = rows.filter((r) => r.status === "sent" || r.status === "past-due" || r.status === "part-paid").length
  return (
    <div data-slot="invoices-page">
      <PageHeader title="Invoices" context={rows.length ? `${out} out, ${money(OWED)} unpaid.` : "No invoices yet."} actions={<Button type="button" className="min-h-11">New invoice</Button>} />
      <div data-slot="invoice-tiles" className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Unpaid" value={rows.length ? money(OWED) : "$0"} />
        <StatTile label="Past due" value={rows.length ? money(PAST_DUE) : "$0"} />
        <StatTile label="Paid this month" value={rows.length ? paidThisMonth : "$0"} />
        <StatTile label="Days to get paid" value={rows.length ? daysToGetPaid : "None yet"} />
      </div>
      <DataGrid
        columns={invoiceColumns}
        card={invoiceCard}
        data={rows}
        getRowId={(r) => r.id}
        search={{ column: "name", placeholder: "Search by customer, number or street" }}
        filters={FILTERS}
        defaultFilters={defaultFilters}
        hiddenColumns={["range"]}
        onOpen={() => undefined}
        exportName="invoices"
        pageSize={25}
        noMatchTitle="No invoices match."
        emptyTitle="No invoices yet"
        emptyLine="Invoices appear here when you send one from a done job. Or press New invoice."
      />
    </div>
  )
}
