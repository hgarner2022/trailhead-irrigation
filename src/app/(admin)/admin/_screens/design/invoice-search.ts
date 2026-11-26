import { recordHref } from "@/components/blocks/record-preview-model"
import { money } from "@/lib/admin/format"
import type { SearchHit } from "@/lib/admin/search-hit"
import { INVOICE_PILL, type InvoiceListRow } from "./invoice-fixtures"

// Cmd+K over the invoices (Hannah, Nov 25 2026: an invoice is found by its number, as Jobber's search finds one): by the number
// ("INV-2026-0042", or just "0042"), the customer's name or the street. A hit is titled with the number, as the invoice's page is, and opens that page.

/** The invoices a query finds, each a hit that opens the invoice's own page. */
export function invoiceHits(rows: readonly InvoiceListRow[], query: string): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  return rows
    .filter((r) => `${r.number} ${r.customer} ${r.street}`.toLowerCase().includes(q))
    .map((r) => ({ kind: "invoice" as const, id: r.id, title: r.number, detail: `${r.customer}, ${r.jobName}, ${money(r.amount)} · ${INVOICE_PILL[r.status].label}`, href: recordHref.invoice(r.id) }))
}

/** How many invoices are past due: the count beside Invoices in the rail and in the phone's More. */
export const pastDueCount = (rows: readonly InvoiceListRow[]) => rows.filter((r) => r.status === "past-due").length
