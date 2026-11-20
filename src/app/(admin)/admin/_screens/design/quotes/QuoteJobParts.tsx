"use client"

import { Banknote, FileText, MapPin, Receipt } from "lucide-react"
import { PaymentTable, type PaymentRowData } from "@/components/blocks/BillingTables"
import { LineItemList } from "@/components/blocks/LineItemList"
import { RecordFacts, RecordList, RecordRowEnd, RECORD_ROW } from "@/components/blocks/RecordPanel"
import { SectionCard } from "@/components/blocks/SectionCard"
import { StatusPill } from "@/components/blocks/StatusPill"
import type { SummaryItem } from "@/components/blocks/SummaryBand"
import type { TimelineLine } from "@/lib/events/timeline"
import { cn } from "@/lib/utils"
import { ago, dayOf, linesTotal, liveQuote, money, QUOTE_PILL, stageOf, VIA_WORDS, type DepositHow, type QuoteJob } from "./quote-model"

// The cards of the job page in its quote states (QuoteJobPage.tsx): What's included (its lines, editable until a quote is sent, then locked), Quote (its
// facts, the decision and the earlier quotes), Billing (once a deposit is paid) and the summary band. Pure props.

export const LINK = "rounded-sm text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
export const QUIET = `min-h-11 ${LINK}`
export const HOW_WORDS: Record<DepositHow, string> = { card: "card", check: "check", cash: "cash", venmo: "Venmo" }

export function depositFact(job: QuoteJob): string {
  const q = liveQuote(job)
  if (!q?.deposit) return "None"
  const d = q.deposit
  const base = `${money(d.amount)}${d.percent ? ` (${d.percent}%)` : ""}`
  if (d.paid?.refundedOn) return `${base}, refunded`
  if (d.paid) return `${base}, paid by ${HOW_WORDS[d.paid.how]}${d.paid.reference ? ` ${d.paid.reference}` : ""}`
  return `${base}, due when ${job.first} approves`
}

export function decisionFact(job: QuoteJob): string {
  const q = liveQuote(job)
  if (!q) return "No quote sent"
  if (q.state === "sent") return `Waiting for ${job.first}`
  const on = q.decidedOn ? dayOf(q.decidedOn) : ""
  if (q.state === "approved") return q.decidedBy === "customer" ? `Approved by ${job.first} on ${on}` : `Marked approved by Ryan on ${on}`
  return `Declined by ${job.first} on ${on}`
}

export const historyLines = (job: QuoteJob): TimelineLine[] => [...job.history].reverse().map((h, i) => ({ id: `h${i}`, at: h.at, actor: h.actor, what: h.what, kind: "event" as const }))

/** The summary band: the quote, the total, the deposit and where. */
export function quoteBand(job: QuoteJob): SummaryItem[] {
  const q = liveQuote(job)
  const total = q ? q.total : linesTotal(job.lines)
  const go = (id: string) => () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  return [
    { label: "Quote", value: q ? QUOTE_PILL[q.state].label : "Not sent yet", sub: q ? `${q.id}, ${dayOf(q.sentOn)}` : "Price the lines first", icon: FileText, onClick: go("quote-h") },
    { label: "Total", value: total > 0 ? money(total) : "No price yet", sub: q ? "Frozen in the quote" : "From the lines", icon: Receipt, onClick: go("included-h") },
    { label: "Deposit", value: q?.deposit ? money(q.deposit.amount) : "None", sub: q?.deposit ? (q.deposit.paid ? (q.deposit.paid.refundedOn ? "Refunded" : `Paid by ${HOW_WORDS[q.deposit.paid.how]}`) : `Due when ${job.first} approves`) : q ? "Not asked for" : "Set when you send", icon: Banknote },
    { label: "Where", value: job.street, sub: `${job.town}, CO`, icon: MapPin },
  ]
}

/** The deposit as the Payments table shows it, and its refund row when Ryan refunded it. */
export function depositPayments(job: QuoteJob): PaymentRowData[] {
  const q = liveQuote(job)
  const p = q?.deposit?.paid
  if (!q || !q.deposit || !p) return []
  const row: PaymentRowData = {
    id: `dep-${q.id}`,
    at: p.on,
    method: p.how,
    methodLabel: p.how === "card" ? "Visa ending 4242" : p.how === "check" ? `Check #${p.reference ?? ""}`.trim() : p.how === "venmo" ? `Venmo ${p.reference ?? ""}`.trim() : "Cash",
    amount: money(q.deposit.amount),
    by: q.decidedBy === "customer" ? `${job.first}, online` : "Ryan",
    receiptHref: `/account/receipts/dep-${q.id}`,
    ...(p.how === "card" ? { stripeHref: "https://dashboard.stripe.com/payments/pi_3QxK1042" } : {}),
    canRefund: !p.refundedOn,
  }
  return p.refundedOn ? [row, { ...row, id: `${row.id}-r`, at: p.refundedOn, amount: `-${row.amount}`, refund: true, canRefund: false, stripeHref: undefined }] : [row]
}

/** What's included: the job's lines. While the job needs a quote each has Edit and the card has Add a line; once a quote is out they are locked. */
export function LinesCard({ job, onAdd, onEdit }: { job: QuoteJob; onAdd: () => void; onEdit: (id: string) => void }) {
  const stage = stageOf(job)
  const q = liveQuote(job)
  const open = stage === "needs-a-quote"
  const total = q ? q.total : linesTotal(job.lines)
  return (
    <SectionCard title="What's included" id="included-h" action={open ? <button type="button" className={QUIET} onClick={onAdd}>Add a line</button> : undefined}>
      {open ? (
        <>
          <RecordList data-slot="quote-lines">
            {job.lines.map((l) => (
              <li key={l.id} className={cn("flex items-start", RECORD_ROW)}>
                <span className="block min-w-0 flex-1">
                  <span className="block font-medium">{l.name}</span>
                  {l.description && <span className="block text-muted-foreground">{l.description}</span>}
                </span>
                <RecordRowEnd>
                  <span className={cn("font-medium tabular-nums", l.amount === 0 && "text-muted-foreground")}>{l.amount ? money(l.amount) : "No price yet"}</span>
                  <button type="button" className={cn(QUIET, "ml-3 text-sm")} aria-label={`Edit ${l.name}`} onClick={() => onEdit(l.id)}>
                    Edit
                  </button>
                </RecordRowEnd>
              </li>
            ))}
          </RecordList>
          <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-6 border-t border-border pt-2 text-sm">
            <dt className="text-right font-semibold">Total</dt>
            <dd className="text-right font-semibold tabular-nums">{money(total)}</dd>
          </dl>
          {total === 0 && <p className="mt-3 text-sm text-muted-foreground">No line has a price yet. A quote can be sent once one does.</p>}
        </>
      ) : (
        <>
          <LineItemList lines={(q?.lines ?? job.lines).map((l) => ({ name: l.name, description: l.description, amount: money(l.amount) }))} totals={[["Total", money(total), "strong"]]} />
          <p className="mt-3 text-sm text-muted-foreground">{stage === "quote-sent" ? `Locked while quote ${q!.id} is out. Revise the quote to change them.` : `These are the lines of quote ${q?.id ?? ""}.`}</p>
        </>
      )}
    </SectionCard>
  )
}

/** Quote: the live quote's facts with its pill, then the earlier quotes (Replaced). */
export function QuoteCard({ job, now }: { job: QuoteJob; now: string }) {
  const q = liveQuote(job)
  const earlier = job.quotes.filter((x) => x.state === "replaced")
  return (
    <SectionCard title="Quote" id="quote-h" action={q ? <StatusPill status={QUOTE_PILL[q.state].status} label={QUOTE_PILL[q.state].label} /> : undefined}>
      {q ? (
        <RecordFacts
          divided
          rows={[
            ["Quote", q.id],
            ["Sent", `${dayOf(q.sentOn)}, ${q.sentVia === "none" ? "without notifying" : `by ${VIA_WORDS[q.sentVia]}`}`],
            ["Total", money(q.total)],
            ["Deposit", depositFact(job)],
            ["Decision", decisionFact(job)],
            ["Reminders", q.reminders.length ? `${q.reminders.length} sent, the last ${ago(q.reminders[q.reminders.length - 1]!.at, now)}` : "None sent"],
            ["Quote page", <a key="l" href={`/quote/${q.id}`} className={cn(LINK, "inline-flex min-h-11 items-center")}>Open the quote page</a>],
          ]}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No quote sent yet. Price the lines, then send a quote.</p>
      )}
      {earlier.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-sm font-medium">Earlier quotes</p>
          <RecordList>
            {earlier.map((e) => (
              <li key={e.id} className={cn("flex items-center", RECORD_ROW)}>
                <span className="block min-w-0 flex-1">
                  <span className="block font-medium">{e.id}</span>
                  <span className="block text-muted-foreground">{`Sent ${dayOf(e.sentOn)}, ${money(e.total)}`}</span>
                </span>
                <RecordRowEnd>
                  <StatusPill status={QUOTE_PILL.replaced.status} label={QUOTE_PILL.replaced.label} />
                </RecordRowEnd>
              </li>
            ))}
          </RecordList>
        </div>
      )}
    </SectionCard>
  )
}

/** Billing once the deposit is paid: the balance, the Payments table and the line that says what the final invoice will show. */
export function QuoteBilling({ job, onRefund }: { job: QuoteJob; onRefund: () => void }) {
  const q = liveQuote(job)
  if (q?.state !== "approved" || !q.deposit?.paid) return null
  const paid = q.deposit.paid.refundedOn ? 0 : q.deposit.amount
  return (
    <SectionCard title="Billing" id="billing-h">
      <RecordFacts divided rows={[["Total", money(q.total)], ["Paid", money(paid)], ["Unpaid", money(q.total - paid)]]} />
      <div className="mt-4 border-t border-border pt-4">
        <PaymentTable rows={depositPayments(job)} onRefund={onRefund} />
      </div>
      {!q.deposit.paid.refundedOn && <p className="mt-3 text-sm text-muted-foreground">The invoice will show the {money(q.deposit.amount)} deposit as already paid.</p>}
    </SectionCard>
  )
}
