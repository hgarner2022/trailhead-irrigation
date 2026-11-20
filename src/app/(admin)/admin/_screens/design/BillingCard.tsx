"use client"

import { BillingBody } from "@/components/blocks/BillingBody"
import { BillingSection, type BillingRowData } from "@/components/blocks/BillingSection"
import type { InvoiceRowData, PaymentRowData } from "@/components/blocks/BillingTables"
import { MoneyCell } from "@/components/blocks/MoneyCell"
import { SectionCard } from "@/components/blocks/SectionCard"
import type { JobPageData } from "./job-fixtures"

// A job page's Billing card (Hannah, Nov 19 and 20 2026): billing never holds a result message, and after a payment it is a state, not a line.
// `BillingBody` draws it (the status line as the headline, three figures only when they add something, Card on file only while something is
// unpaid, "Invoices and payments" with a paid invoice and its payment as one row, "Payments" for the ones with no invoice); a charge, a recorded
// payment or an invoice changes this card and says so in a toast. "Nothing to bill until the trip is done." shows while there is no status line.
// The older one-line rows the pass and return-trip pages use still render through `BillingSection`. Pure props.

export function BillingCard({ data, onRemind, onRefund }: { data: Pick<JobPageData, "billing">; onRemind?: (row: InvoiceRowData) => void; onRefund?: (row: PaymentRowData) => void }) {
  const { billing } = data
  if (!billing.paidLine) {
    const status = billing.status
    return (
      <SectionCard title="Billing" id="billing-h">
        {status && <p className="mb-2 text-sm font-medium"><MoneyCell text={status.text} tone={status.tone} /></p>}
        <BillingSection summary={billing.summary} rows={billing.rows as BillingRowData[]} emptyLine={billing.emptyLine} />
      </SectionCard>
    )
  }
  return (
    <SectionCard title="Billing" id="billing-h">
      <BillingBody line={billing.paidLine} facts={billing.summary} invoices={billing.invoices} payments={billing.payments} emptyLine={billing.emptyLine} onRemind={onRemind} onRefund={onRefund} />
    </SectionCard>
  )
}
