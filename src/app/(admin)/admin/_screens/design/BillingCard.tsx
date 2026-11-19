"use client"

import { AlertCircle, CheckCircle2, Clock, Undo2 } from "lucide-react"
import { RecordChip } from "@/components/blocks/RecordChip"
import { BillingSection, type BillingRowData } from "@/components/blocks/BillingSection"
import { InvoiceTable, PaymentTable, type InvoiceRowData, type PaymentRowData } from "@/components/blocks/BillingTables"
import { MoneyCell } from "@/components/blocks/MoneyCell"
import { RecordFacts } from "@/components/blocks/RecordPanel"
import { SectionCard } from "@/components/blocks/SectionCard"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { cn } from "@/lib/utils"
import type { BillingData, JobPageData } from "./job-fixtures"

// A job page's Billing card (Hannah, Nov 19 2026: billing never holds a result message, and after a payment it is a state, not a line).
// Top to bottom: the settled line when there is one (green "Paid in full" with how, when and by whom, or a grey "Refunded"), the facts
// (Total, Paid, Unpaid, Card on file), the Payments table, the Invoices table. "No invoice or payment yet." shows only when there is
// neither. A charge, a recorded payment or an invoice changes this card and says so in a toast; the card never holds the answer or a
// Close. The older one-line rows the pass and return-trip pages use still render through `BillingSection`. Pure props.

const TONE = {
  paid: "border-positive/30 bg-positive/10 text-positive-deep",
  unpaid: "border-warning/40 bg-warning/14 text-warning-ink",
  pastdue: "border-destructive/30 bg-destructive/10 text-destructive",
  refunded: "border-border bg-stone text-muted-foreground",
} as const

function SettledLine({ line }: { line: NonNullable<BillingData["paidLine"]> }) {
  const Icon = { paid: CheckCircle2, unpaid: Clock, pastdue: AlertCircle, refunded: Undo2 }[line.tone]
  const [before, after] = line.invoice ? line.text.split("{invoice}") : [line.text, ""]
  return (
    <p data-slot="settled-line" data-tone={line.tone} className={cn("mb-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm", TONE[line.tone])}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        <span className="font-semibold">{line.title}.</span> {before}
        {line.invoice && <RecordChip kind="invoice" name={line.invoice.name} href={line.invoice.href} />}
        {after}
      </span>
    </p>
  )
}

export function BillingCard({ data, onRemind, onRefund }: { data: Pick<JobPageData, "billing">; onRemind?: (row: InvoiceRowData) => void; onRefund?: (row: PaymentRowData) => void }) {
  const { billing } = data
  const tabled = Boolean(billing.paidLine || billing.payments?.length || billing.invoices?.length)
  if (!tabled) {
    const status = billing.status
    return (
      <SectionCard title="Billing" id="billing-h">
        {status && <p className="mb-2 text-sm font-medium"><MoneyCell text={status.text} tone={status.tone} /></p>}
        <BillingSection summary={billing.summary} rows={billing.rows as BillingRowData[]} emptyLine={billing.emptyLine} />
      </SectionCard>
    )
  }
  const payments = billing.payments ?? []
  const invoices = billing.invoices ?? []
  return (
    <SectionCard title="Billing" id="billing-h">
      {billing.paidLine && <SettledLine line={billing.paidLine} />}
      {billing.summary.length > 0 && <RecordFacts rows={billing.summary} className="mt-0" />}
      {payments.length > 0 && (
        <div className="mt-5 flex flex-col gap-2">
          <SectionHeading id="payments-h">Payments</SectionHeading>
          <PaymentTable rows={payments} onRefund={onRefund} />
        </div>
      )}
      {invoices.length > 0 && (
        <div className="mt-5 flex flex-col gap-2">
          <SectionHeading id="invoices-h">Invoices</SectionHeading>
          <InvoiceTable rows={invoices} onRemind={onRemind} />
        </div>
      )}
      {payments.length === 0 && invoices.length === 0 && !billing.paidLine && billing.emptyLine && <p className="mt-3 text-sm text-muted-foreground">{billing.emptyLine}</p>}
    </SectionCard>
  )
}
