"use client"

import { BillingSection, type BillingRowData } from "@/components/blocks/BillingSection"
import { RecordFooter } from "@/components/blocks/RecordFooter"
import { RecordPanel } from "@/components/blocks/RecordPanel"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { StatusPill } from "@/components/blocks/StatusPill"
import { noop } from "./job-fixtures"

// The Billing section of the customer's page (docs/plans/2026-11-19-job-object-design.md), in the same words as a job's: Unpaid and Paid this
// year in the facts, then every invoice and payment of the customer, newest first, an invoice row opening that invoice. Shown inside the one
// RecordPanel the Customer opens in. Pure props over fixtures.

const invoice = (id: string, title: string, detail: string, status: "bill-sent" | "overdue" | "paid", label: string): BillingRowData => ({ id, kind: "invoice", title, detail, end: <StatusPill status={status} label={label} />, onOpen: noop })

export const CUSTOMER_ROWS: BillingRowData[] = [
  invoice("i1", "Invoice 1042", "Repair, Nov 18 · due Dec 2 · $145", "bill-sent", "Sent"),
  invoice("i0", "Invoice 1031", "Spring turn-on, Apr 14 · due Apr 28 · $145", "paid", "Paid"),
  { id: "p0", kind: "payment", title: "Card", detail: "Invoice 1031 · Apr 20", amount: "$145" },
  { id: "p1", kind: "payment", title: "Venmo", detail: "Fall blowout, Oct 12 · @andrea-d", amount: "$115" },
]

export function CustomerBilling({ rows = CUSTOMER_ROWS, open = true }: { rows?: BillingRowData[]; open?: boolean }) {
  const unpaid = rows.some((r) => r.kind === "invoice" && r.id === "i1") ? "$145" : "$0"
  return (
    <RecordPanel
      open={open}
      onOpenChange={() => undefined}
      title="Andrea Dalton"
      subtitle="480 Briggs St, Erie"
      facts={[["Phone", "(970) 555-0123"], ["Card", "Visa ending 4242"]]}
      footer={<RecordFooter primary={{ label: "New job", onClick: noop }} secondary={[{ label: "Send a text", onClick: noop }]} more={[{ label: "Edit", onClick: noop }]} />}
    >
      <section aria-labelledby="cust-billing">
        <SectionHeading id="cust-billing">Billing</SectionHeading>
        <BillingSection summary={[["Unpaid", unpaid], ["Paid this year", rows.length ? "$405" : "$0"]]} rows={rows} emptyLine="No invoices or payments yet." />
      </section>
    </RecordPanel>
  )
}
