"use client"

import { Banknote, FileText, MapPin, Receipt } from "lucide-react"
import { BillingBody, type BillingLine } from "@/components/blocks/BillingBody"
import type { PaymentRowData } from "@/components/blocks/BillingTables"
import { RecordList, RecordRowEnd, RECORD_ROW } from "@/components/blocks/RecordPanel"
import { SectionCard } from "@/components/blocks/SectionCard"
import type { SummaryItem } from "@/components/blocks/SummaryBand"
import { TextLink } from "@/components/blocks/TextLink"
import { cn } from "@/lib/utils"
import { QuoteChip } from "../RecordChips"
import { approvedTotal, currentTotal, isApproved, untoldChange } from "./price-change"
import { HOW_WORDS } from "./QuoteParts"
import { dayOf, lineTotal, money, type ApprovedJob } from "./quote-model"

// The cards of the page of a job made from an approved quote (ApprovedJobPage.tsx; Hannah, Nov 22 2026: the job has no quote state, it only says which quote it came from): What's
// included (the approved lines, Ryan's to change), Billing (once a deposit is paid) and the summary band. Pure props.

/** The summary band: where the job came from, the total with what was approved, the deposit and where. */
export function jobBand(job: ApprovedJob): SummaryItem[] {
  const total = currentTotal(job)
  const was = approvedTotal(job)
  const go = (id: string) => () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  const d = job.deposit
  return [
    { label: "From quote", value: job.quoteId, sub: `Sold ${dayOf(job.soldOn)}`, icon: FileText, onClick: go("from-quote-h") },
    { label: "Total", value: money(total), sub: was !== undefined ? `Was ${money(was)}` : "From the lines", icon: Receipt, onClick: go("included-h") },
    { label: "Deposit", value: d ? money(d.amount) : "None", sub: d ? (d.paid ? (d.paid.refundedOn ? "Refunded" : `Paid by ${HOW_WORDS[d.paid.how]}`) : "Not paid") : "Not asked for", icon: Banknote },
    { label: "Where", value: job.street, sub: `${job.town}, CO`, icon: MapPin },
  ]
}

/** The deposit as the Payments table shows it, and its refund row when Ryan refunded it. */
export function depositPayments(job: ApprovedJob): PaymentRowData[] {
  const p = job.deposit?.paid
  if (!job.deposit || !p) return []
  const row: PaymentRowData = {
    id: `dep-${job.quoteId}`,
    at: p.on,
    method: p.how,
    methodLabel: p.how === "card" ? "Visa ending 4242" : p.how === "check" ? `Check #${p.reference ?? ""}`.trim() : p.how === "venmo" ? `Venmo ${p.reference ?? ""}`.trim() : "Cash",
    amount: money(job.deposit.amount),
    by: job.decidedBy === "customer" ? `${job.first}, online` : "Ryan",
    receiptHref: `/account/receipts/dep-${job.quoteId}`,
    ...(p.how === "card" ? { stripeHref: "https://dashboard.stripe.com/payments/pi_3QxK1042" } : {}),
    canRefund: !p.refundedOn,
  }
  return p.refundedOn ? [row, { ...row, id: `${row.id}-r`, at: p.refundedOn, amount: `-${row.amount}`, refund: true, refundOf: row.id, canRefund: false, stripeHref: undefined }] : [row]
}

/** From quote: the quote this job was made from, with its chip. */
export function FromQuoteCard({ job }: { job: ApprovedJob }) {
  return (
    <SectionCard title="From quote" id="from-quote-h">
      <div data-slot="from-quote" className="flex flex-wrap items-center gap-2 text-sm">
        <QuoteChip number={job.quoteId} />
        <span className="text-muted-foreground">{job.decidedBy === "customer" ? `Approved by ${job.first}` : "Marked approved by Ryan"} on {dayOf(job.soldOn)}</span>
      </div>
    </SectionCard>
  )
}

/** What's included: the approved lines, copied from the quote when it was approved and Ryan's to change after (a price change is recorded and told). */
export function LinesCard({ job, onAdd, onEdit, onTell }: { job: ApprovedJob; onAdd: () => void; onEdit: (id: string) => void; /** a total the customer has not been told */ onTell?: () => void }) {
  const total = currentTotal(job)
  const was = approvedTotal(job)
  const untold = isApproved(job) ? untoldChange(job) : null
  return (
    <SectionCard title="What's included" id="included-h" action={<TextLink onClick={onAdd}>Add a line</TextLink>}>
      <RecordList data-slot="quote-lines">
        {job.lines.map((l) => (
          <li key={l.id} data-canceled={l.canceled ? "true" : undefined} className={cn("flex items-start", RECORD_ROW)}>
            <span className="block min-w-0 flex-1">
              <span className={cn("block font-medium", l.canceled && "text-muted-foreground line-through")}>{l.name}</span>
              {l.description && <span className={cn("block text-muted-foreground", l.canceled && "line-through")}>{l.description}</span>}
            </span>
            <RecordRowEnd>
              <span className={cn("font-medium tabular-nums", (l.amount === 0 || l.canceled) && "text-muted-foreground", l.canceled && "line-through")}>{l.amount ? money(lineTotal(l)) : "No price yet"}</span>
              {l.canceled ? (
                <span className="ml-3 text-sm text-muted-foreground">Canceled</span>
              ) : (
                <TextLink className="ml-3 text-sm" aria-label={`Edit ${l.name}`} onClick={() => onEdit(l.id)}>
                  Edit
                </TextLink>
              )}
            </RecordRowEnd>
          </li>
        ))}
      </RecordList>
      <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-6 border-t border-border pt-2 text-sm">
        <dt className="text-right font-semibold">Total</dt>
        <dd className="text-right font-semibold tabular-nums">{money(total)}</dd>
      </dl>
      <p className="mt-3 text-sm text-muted-foreground">{was !== undefined ? `The approved quote ${job.quoteId} was ${money(was)}.` : `Quote ${job.quoteId} was approved at ${money(job.approvedTotal)}.`} A change to the total is recorded in Notes and history.</p>
      {untold && onTell && (
        <p data-slot="untold-price" className="mt-2 flex flex-wrap items-center gap-x-3 text-sm">
          <span>{job.first} has not been told the new total, {money(untold.to)}.</span>
          <TextLink onClick={onTell}>Tell {job.first}</TextLink>
        </p>
      )}
    </SectionCard>
  )
}

/** Billing once the deposit is paid, on the shared `BillingBody`: the balance is the headline (with what the final invoice will show), the three figures and the deposit as a payment with no invoice. */
export function QuoteBilling({ job, onRefund }: { job: ApprovedJob; onRefund: () => void }) {
  const changed = approvedTotal(job) !== undefined
  if (!job.deposit?.paid && !changed) return null
  // the total is the job's total now, so a price change shows here, with the deposit already paid credited
  const total = currentTotal(job)
  const dep = job.deposit?.paid && !job.deposit.paid.refundedOn ? job.deposit.amount : 0
  const credit = dep ? ` and the ${money(dep)} deposit as already paid` : ""
  const text = changed ? `The invoice will show the new total, ${money(total)}${credit}.` : dep ? `The invoice will show the ${money(dep)} deposit as already paid.` : undefined
  const line: BillingLine = { tone: "unpaid", title: `${money(total - dep)} unpaid`, text }
  const facts: [string, string][] = [["Total", money(total)], ["Paid", money(dep)], ["Unpaid", money(total - dep)]]
  return (
    <SectionCard title="Billing" id="billing-h">
      <BillingBody line={line} facts={facts} payments={depositPayments(job)} onRefund={onRefund} />
    </SectionCard>
  )
}
