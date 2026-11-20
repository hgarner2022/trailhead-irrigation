"use client"

import { useMemo } from "react"
import { ExternalLink } from "lucide-react"
import { BillingBody, type BillingLine } from "@/components/blocks/BillingBody"
import type { InvoiceRowData, PaymentRowData } from "@/components/blocks/BillingTables"
import { SectionCard } from "@/components/blocks/SectionCard"
import { recordHref } from "@/components/blocks/record-preview-model"
import { sortInvoices, toInvoiceRows, toPaymentRows } from "./CustomerTables"
import type { CustomerBillingData } from "./customer-fixtures"

// The Billing card of the customer's page, on the same `BillingBody` as a job's (docs/plans/2026-11-19-job-object-design.md; Hannah, Nov 20 2026):
// one status line ("Paid in full", "$145 unpaid. Invoice INV-2026-0042 sent Nov 12, due Dec 2.", "Past due since ...", "Refunded"), the three
// figures only when they add something, the customer's card row (it is managed here, so it stays: Update card sends the customer the card link,
// Open in Stripe leaves the app), then "Invoices and payments" (a paid invoice and its payment are one row) and "Payments" for the ones with no
// invoice. Refund is under More on a payment row. Nothing here shows a result: an action's result is a toast and the table gains a row. Pure props.

const LINK = "inline-flex min-h-11 items-center gap-1 rounded-sm text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"

export interface CustomerBillingProps {
  billing: CustomerBillingData
  customerName: string
  /** Update card: opens the card-link confirmation */
  onUpdateCard: () => void
  /** Refund, from a payment row's More: opens the refund confirmation */
  onRefund: (row: PaymentRowData) => void
  /** Remind, from an invoice row: opens the reminder dialog */
  onRemind: (row: InvoiceRowData) => void
}

/** The headline, from the customer's money: the invoice still out (newest first, past due on top) is named in the sentence. */
export function lineOf(billing: CustomerBillingData): BillingLine {
  const out = sortInvoices(billing.invoices).find((i) => i.status === "overdue" || i.status === "bill-sent")
  const invoice = out ? { name: out.number, href: recordHref.invoice(out.id) } : undefined
  if (billing.settled === "paid") return { tone: "paid", title: billing.line }
  if (billing.settled === "refunded" || billing.unpaid === "$0") return { tone: "refunded", title: billing.line }
  if (billing.tone === "past-due") return { tone: "pastdue", title: billing.line, text: out ? `${billing.unpaid} unpaid. Invoice {invoice} sent ${out.sent}.` : `${billing.unpaid} unpaid.`, invoice }
  return { tone: "unpaid", title: billing.line, text: out ? `Invoice {invoice} sent ${out.sent}, due ${out.due}.` : undefined, invoice }
}

export function CustomerBilling({ billing, customerName, onUpdateCard, onRefund, onRemind }: CustomerBillingProps) {
  const { card } = billing
  const facts: [string, string][] = [["Total", billing.total], ["Paid", billing.paid], billing.refunded ? ["Refunded", billing.refunded] : ["Unpaid", billing.unpaid]]
  const cardWords = card ? `${card.brand} ending ${card.last4}` : undefined
  const payments = useMemo(() => toPaymentRows(billing.payments, customerName, { cardWords, canRefund: true }), [billing.payments, customerName, cardWords])
  const invoices = useMemo(() => toInvoiceRows(billing.invoices, customerName), [billing.invoices, customerName])
  const cardRow = card ? (
    <span id="card-row" className="flex flex-wrap items-center gap-x-4">
      <span>
        {card.brand} ending {card.last4}, expires {card.expires}
      </span>
      <button type="button" onClick={onUpdateCard} className={LINK}>
        Update card
      </button>
      <a href={card.stripeUrl} target="_blank" rel="noreferrer" className={LINK}>
        Open in Stripe
        <ExternalLink className="size-3.5" aria-hidden />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </span>
  ) : (
    <span id="card-row" className="flex flex-wrap items-center gap-x-4">
      <span className="text-muted-foreground">No card yet</span>
      <button type="button" onClick={onUpdateCard} className={LINK}>
        Send card link
      </button>
    </span>
  )
  return (
    <SectionCard title="Billing" id="billing-h">
      <BillingBody line={lineOf(billing)} facts={facts} invoices={invoices} payments={payments} card={cardRow} emptyLine="No invoice or payment yet. They show here when a job is done." onRemind={onRemind} onRefund={onRefund} />
    </SectionCard>
  )
}
