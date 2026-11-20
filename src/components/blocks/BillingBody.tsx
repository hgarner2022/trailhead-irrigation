"use client"

import { AlertCircle, CheckCircle2, Clock, Undo2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { InvoiceTable, PaymentTable } from "./BillingTables"
import { billingFigures, splitBilling, type InvoiceRowData, type PaymentRowData } from "./billing-model"
import { RecordChip } from "./RecordChip"
import { RecordFacts } from "./RecordPanel"
import { SectionHeading } from "./SectionHeading"

// The inside of a Billing card, one body for a job page and a customer page (Hannah, Nov 20 2026: "this could be cleaned up"). Top to bottom:
//   1. the status line, the headline: "Paid in full", "Refunded", "$145 unpaid. Invoice INV-2026-0042 sent Nov 18, due Dec 2.", "Past due since Nov 17";
//   2. one quiet row of three figures (Total, Paid, Unpaid or Refunded), only when it adds something the line does not say (`billingFigures`);
//   3. Card on file, only while something is unpaid (the customer page passes `card` for its own card row, which holds Update card);
//   4. "Invoices and payments": a paid invoice and its payment are one row, a refund is a grey row under its payment;
//   5. "Payments": only the payments with no invoice (check, Venmo, cash, a card charged directly) and their refunds.
// Gaps: 12px inside the top block, 24px above every sub-heading, 8px under it. Pure props; the caller says what a button does.

export interface BillingLine {
  tone: "paid" | "unpaid" | "pastdue" | "refunded"
  title: string
  /** the rest of the sentence after "Title."; `{invoice}` is the invoice's chip */
  text?: string
  invoice?: { name: string; href: string }
}

const TONE = {
  paid: "border-positive/30 bg-positive/10 text-positive-deep",
  unpaid: "border-warning/40 bg-warning/14 text-warning-ink",
  pastdue: "border-destructive/30 bg-destructive/10 text-destructive",
  refunded: "border-border bg-stone text-muted-foreground",
} as const

export function BillingHeadline({ line }: { line: BillingLine }) {
  const Icon = { paid: CheckCircle2, unpaid: Clock, pastdue: AlertCircle, refunded: Undo2 }[line.tone]
  const text = line.text ?? ""
  const [before, after] = line.invoice ? text.split("{invoice}") : [text, ""]
  return (
    <p data-slot="settled-line" data-tone={line.tone} className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-sm", TONE[line.tone])}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        <span className="font-semibold">{text ? `${line.title}.` : line.title}</span>
        {text ? " " : ""}
        {before}
        {line.invoice && <RecordChip kind="invoice" name={line.invoice.name} href={line.invoice.href} className="text-sm font-medium text-current! md:min-h-8" />}
        {after}
      </span>
    </p>
  )
}

export interface BillingBodyProps {
  line: BillingLine
  /** Total, Paid, Unpaid or Refunded, and Card on file, as the pairs the fixtures hold */
  facts: readonly (readonly [string, string])[]
  invoices?: InvoiceRowData[]
  payments?: PaymentRowData[]
  /** the customer page's own card row (Update card, Open in Stripe): shown always, since the card is managed there */
  card?: React.ReactNode
  /** one quiet line when there is no invoice and no payment */
  emptyLine?: string
  onRemind?: (row: InvoiceRowData) => void
  onRefund?: (row: PaymentRowData) => void
}

const SUB = "mt-6"

export function BillingBody({ line, facts, invoices = [], payments = [], card, emptyLine, onRemind, onRefund }: BillingBodyProps) {
  const split = splitBilling(invoices, payments)
  const shown = billingFigures(facts, payments.filter((p) => !p.refund).length)
  const cardFact = card ?? shown.card
  return (
    <div data-slot="billing-body">
      <div className="flex flex-col gap-3">
        <BillingHeadline line={line} />
        {shown.figures && (
          <dl data-slot="billing-figures" className="flex flex-wrap gap-x-10 gap-y-2 text-sm">
            {shown.figures.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {cardFact && <RecordFacts rows={[["Card on file", cardFact]]} className="mt-0" />}
      </div>
      {split.invoices.length > 0 && (
        <section aria-labelledby="invoices-h" className={SUB}>
          <SectionHeading level={3} size="sub" id="invoices-h" className="mb-2">Invoices and payments</SectionHeading>
          <InvoiceTable rows={split.invoices} onRemind={onRemind} onRefund={onRefund} />
        </section>
      )}
      {split.payments.length > 0 && (
        <section aria-labelledby="payments-h" className={SUB}>
          <SectionHeading level={3} size="sub" id="payments-h" className="mb-2">Payments</SectionHeading>
          <PaymentTable rows={split.payments} onRefund={onRefund} />
        </section>
      )}
      {split.invoices.length === 0 && split.payments.length === 0 && emptyLine && <p className="mt-3 text-sm text-muted-foreground">{emptyLine}</p>}
    </div>
  )
}
