"use client"

import { ExternalLink } from "lucide-react"
import type { InvoiceRowData, PaymentRowData } from "@/components/blocks/BillingTables"
import { MoneyCell } from "@/components/blocks/MoneyCell"
import { RecordFacts } from "@/components/blocks/RecordPanel"
import { SectionCard } from "@/components/blocks/SectionCard"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { InvoicesTable, PaymentsTable } from "./CustomerTables"
import type { CustomerBillingData } from "./customer-fixtures"

// The Billing card of the customer's page, in the same state model as a job's (docs/plans/2026-11-19-job-object-design.md): one line that says
// "Paid in full" or "$145 unpaid", the facts (Total, Paid, Unpaid, Card on file with Update card and Open in Stripe), then the Payments table and
// the Invoices table on `DataGrid` (embedded). A card on file is a Stripe customer's card: Update card sends the customer the card link (it confirms
// first), Open in Stripe leaves the app. Refund is under More on a payment row. Nothing here shows a result: an action's result is a toast and
// the table gains a row. Pure props.

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

export function CustomerBilling({ billing, customerName, onUpdateCard, onRefund, onRemind }: CustomerBillingProps) {
  const { card } = billing
  const paidInFull = billing.line === "Paid in full"
  const facts = [
    ["Total", billing.total],
    ["Paid", billing.paid],
    ["Unpaid", billing.unpaid],
    [
      "Card on file",
      card ? (
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
      ),
    ],
  ] as const
  return (
    <SectionCard
      title="Billing"
      id="billing-h"
      flush
    >
      <div className="px-5 py-4">
        <p data-slot="billing-state" className="mb-2 text-base font-semibold">
          {paidInFull ? <span className="text-positive-deep">Paid in full</span> : billing.unpaid === "$0" ? <span className="text-muted-foreground">{billing.line}</span> : <MoneyCell text={billing.line} tone={billing.tone} />}
        </p>
        <RecordFacts divided rows={facts.map(([k, v]) => [k, v])} />
      </div>
      <section aria-label={`${customerName}'s payments`} className="border-t border-border">
        <div className="px-5 pt-3">
          <SectionHeading level={3} id="payments-h">Payments</SectionHeading>
        </div>
        {billing.payments.length ? <PaymentsTable rows={billing.payments} customer={customerName} cardWords={billing.card ? `${billing.card.brand} ending ${billing.card.last4}` : undefined} onRefund={onRefund} /> : <p className="px-5 py-4 text-sm text-muted-foreground">No payments yet. A payment shows here with its receipt.</p>}
      </section>
      <section aria-label={`${customerName}'s invoices`} className="border-t border-border">
        <div className="px-5 pt-3">
          <SectionHeading level={3} id="invoices-h">Invoices</SectionHeading>
        </div>
        {billing.invoices.length ? <InvoicesTable rows={billing.invoices} customer={customerName} onRemind={onRemind} /> : <p className="px-5 py-4 text-sm text-muted-foreground">No invoices yet. An invoice shows here when a done job is sent to be paid.</p>}
      </section>
    </SectionCard>
  )
}
