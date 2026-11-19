"use client"

import { BillingSection } from "@/components/blocks/BillingSection"
import { LineItemList } from "@/components/blocks/LineItemList"
import { MessageThread } from "@/components/blocks/MessageThread"
import { RecordFooter } from "@/components/blocks/RecordFooter"
import { RecordFacts, RecordPanel } from "@/components/blocks/RecordPanel"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { StatusPill, type PillStatus } from "@/components/blocks/StatusPill"
import { SummaryBand } from "@/components/blocks/SummaryBand"
import { INVOICE_WORDS, type InvoiceDetail, type InvoiceStatus } from "./invoice-fixtures"

// The invoice, opened from a Billing row, a job or the Invoices grid (docs/plans/2026-11-19-job-object-design.md): the number as the title,
// the status pill, then who it is for, when it was sent and is due, the terms and the reminder schedule; the frozen lines with their totals;
// the payments; the messages about it. The footer leads with Remind (or "Reminded today" and waits), then Record the payment, More (Copy pay
// link, Open job, Open customer) and Cancel invoice. A paid or voided invoice has only More. Pure props, in the one RecordPanel.

const TONE: Record<InvoiceStatus, PillStatus> = { sent: "bill-sent", "past-due": "overdue", "part-paid": "owed", paid: "paid", voided: "cancelled" }

const link = (text: string) => (
  <a href="#" onClick={(e) => e.preventDefault()} className="rounded-sm text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
    {text}
  </a>
)

export interface InvoicePanelProps {
  invoice: InvoiceDetail
  open?: boolean
}

export function InvoicePanel({ invoice, open = true }: InvoicePanelProps) {
  const f = invoice.footer
  const hasFooter = Boolean(f.primary || f.secondary || f.more.length || f.destructive)
  return (
    <RecordPanel
      open={open}
      onOpenChange={() => undefined}
      title={`Invoice ${invoice.number}`}
      subtitle={`${invoice.customer} · ${invoice.job}`}
      pills={<StatusPill status={TONE[invoice.status]} label={INVOICE_WORDS[invoice.status]} size="lg" />}
      footer={hasFooter ? <RecordFooter primary={f.primary} secondary={f.secondary} more={f.more} destructive={f.destructive} /> : undefined}
    >
      <SummaryBand
        items={[
          { label: "Total", value: invoice.totals.find(([k]) => k === "Total")?.[1] ?? "$0" },
          { label: "Due", value: invoice.due },
          { label: "Balance", value: invoice.totals.find(([k]) => k === "Balance" || k === "Unpaid")?.[1] ?? "$0", tone: invoice.status === "past-due" ? "alert" : "plain" },
        ]}
        className="grid-cols-3 lg:grid-cols-3 [&_dd]:text-xl"
      />
      <RecordFacts
        divided
        rows={[
          ["Customer", link(invoice.customer)],
          ["Job", link(invoice.job)],
          ["Sent", invoice.sent],
          ["Terms", invoice.terms],
          ["Reminders", invoice.reminders],
        ]}
      />
      <section aria-labelledby="inv-lines">
        <SectionHeading id="inv-lines">Lines</SectionHeading>
        <LineItemList lines={invoice.lines} totals={invoice.totals} />
      </section>
      <section aria-labelledby="inv-pay">
        <SectionHeading id="inv-pay">Payments</SectionHeading>
        <BillingSection summary={[]} rows={invoice.payments} emptyLine="No payments yet." />
      </section>
      <section aria-labelledby="inv-msg">
        <SectionHeading id="inv-msg">Messages</SectionHeading>
        <div className="mt-2"><MessageThread messages={invoice.messages} newestFirst /></div>
      </section>
    </RecordPanel>
  )
}
