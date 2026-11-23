"use client"

import { Banknote, CalendarDays, MapPin, MessageSquare, Receipt, UserRound, Wrench } from "lucide-react"
import { LineItemList } from "@/components/blocks/LineItemList"
import { RecordFacts, RecordList, RecordRowEnd, RECORD_ROW } from "@/components/blocks/RecordPanel"
import { SectionCard } from "@/components/blocks/SectionCard"
import { StatusPill } from "@/components/blocks/StatusPill"
import type { SummaryItem } from "@/components/blocks/SummaryBand"
import type { TimelineLine } from "@/lib/events/timeline"
import { cn } from "@/lib/utils"
import { JobChip, QuoteChip } from "../RecordChips"
import { ago, dayOf, lineTotal, money, quoteTotal, QUOTE_PILL, STAGE_PILL, VIA_WORDS, type ApprovedJob, type DepositHow, type HistoryLine, type QuoteRecord } from "./quote-model"
import { jobStageOf } from "./quote-model"

// The cards of a quote's own page in its states (QuotePage.tsx), built like the invoice page: the quote's facts with its decision, What's included (the lines, frozen once the quote
// is sent), Job (once approved: "Job created" with the job's chip), the earlier and later quotes of a revision, and the summary band. While the quote is a Draft the page leads with the
// one Quote editor card instead (QuoteEditor.tsx). Pure props.

export const LINK = "rounded-sm text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
export const QUIET = `min-h-11 ${LINK}`
export const HOW_WORDS: Record<DepositHow, string> = { card: "card", check: "check", cash: "cash", venmo: "Venmo" }

export function depositFact(q: QuoteRecord): string {
  if (!q.deposit) return "None"
  const d = q.deposit
  const base = `${money(d.amount)}${d.percent ? ` (${d.percent}%)` : ""}`
  if (d.paid?.refundedOn) return `${base}, refunded`
  if (d.paid) return `${base}, paid by ${HOW_WORDS[d.paid.how]}${d.paid.reference ? ` ${d.paid.reference}` : ""}`
  if (q.state === "declined" || q.state === "archived" || q.state === "replaced") return base
  return `${base}, due when ${q.first} approves`
}

export function decisionFact(q: QuoteRecord): string {
  if (q.state === "sent") return `Waiting for ${q.first}`
  const on = q.decidedOn ? dayOf(q.decidedOn) : ""
  if (q.state === "approved") return q.decidedBy === "customer" ? `Approved by ${q.first} on ${on}` : `Marked approved by Ryan on ${on}`
  if (q.state === "declined") return `Declined by ${q.first} on ${on}`
  if (q.state === "replaced") return `Replaced by ${q.replacedBy}`
  if (q.state === "archived") return `Archived: ${q.archived?.reason}`
  return "Not sent"
}

export const historyLines = (history: readonly HistoryLine[]): TimelineLine[] => [...history].reverse().map((h, i) => ({ id: `h${i}`, at: h.at, actor: h.actor, what: h.what, kind: "event" as const, ...(h.note ? { note: h.note } : {}) }))

/** The design visit an installation was booked with: the price is set at it, and the quote follows. */
export function VisitCard({ visit }: { visit: NonNullable<QuoteRecord["visit"]> }) {
  return (
    <SectionCard title="Design visit" id="visit-h">
      <RecordFacts divided rows={[["Visit", visit.name], ["Day", dayOf(visit.day)], ["Who", visit.who], ["Status", visit.done ? "Done" : "Scheduled"]]} />
    </SectionCard>
  )
}

const contactOf = (q: QuoteRecord) => (q.contact === "text" ? { value: "Text", sub: q.phone } : q.contact === "email" ? { value: "Email", sub: q.email } : { value: "Text and email", sub: `${q.phone}, ${q.email}` })

/** The summary band. A Draft's band holds the quote's own facts (when it was made, what it is for, where and how the customer is contacted): the total and the deposit are the editor card itself. Once the quote is sent it is the total, the deposit, what happened and where. */
export function quoteBand(q: QuoteRecord): SummaryItem[] {
  const where = { label: "Where", value: q.street, sub: `${q.town}, CO`, icon: MapPin }
  if (q.state === "draft") {
    return [
      { label: "Created", value: dayOf(q.createdOn), sub: q.requestId ? "From a request" : q.visit ? "From a design visit" : q.replaces ? `Revision of ${q.replaces}` : "By the office", icon: CalendarDays },
      { label: "For", value: q.service, icon: Wrench },
      where,
      { label: "Contact", ...contactOf(q), icon: MessageSquare },
    ]
  }
  const go = (id: string) => () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  const d = q.deposit
  return [
    { label: "Total", value: money(quoteTotal(q)), sub: "Frozen in the quote", icon: Receipt, onClick: go("included-h") },
    { label: "Deposit", value: d ? money(d.amount) : "None", sub: d ? (d.paid ? (d.paid.refundedOn ? "Refunded" : `Paid by ${HOW_WORDS[d.paid.how]}`) : `Due when ${q.first} approves`) : "Not asked for", icon: Banknote },
    q.state === "archived" ? { label: "Archived", value: dayOf(q.archived!.on), sub: q.archived!.reason, icon: UserRound } : { label: "Sent", value: q.sentOn ? dayOf(q.sentOn) : "Not sent", sub: q.sentVia ? (q.sentVia === "none" ? "Without notifying" : `By ${VIA_WORDS[q.sentVia]}`) : undefined, icon: UserRound, onClick: go("quote-h") },
    where,
  ]
}

/** What's included once the quote is sent: its frozen lines, locked. */
export function QuoteLines({ quote }: { quote: QuoteRecord }) {
  const words = quote.state === "sent" ? `Locked while quote ${quote.id} is out. Revise the quote to change them.` : quote.state === "approved" ? `These are the lines of quote ${quote.id}. The job has its own copy.` : `These are the lines of quote ${quote.id}.`
  return (
    <SectionCard title="What's included" id="included-h">
      <LineItemList lines={quote.lines.map((l) => ({ name: (l.quantity ?? 1) > 1 ? `${l.name} × ${l.quantity}` : l.name, description: l.description, amount: money(lineTotal(l)) }))} totals={[["Total", money(quoteTotal(quote)), "strong"]]} />
      <p className="mt-3 text-sm text-muted-foreground">{words}</p>
    </SectionCard>
  )
}

/** Quote: its facts with the decision, once it is sent. */
export function QuoteCard({ quote, now }: { quote: QuoteRecord; now: string }) {
  const last = quote.reminders[quote.reminders.length - 1]
  return (
    <SectionCard title="Quote" id="quote-h" action={<StatusPill status={QUOTE_PILL[quote.state].status} label={QUOTE_PILL[quote.state].label} />}>
      <RecordFacts
        divided
        rows={[
          ["Quote", quote.id],
          ["Sent", quote.sentOn ? `${dayOf(quote.sentOn)}, ${quote.sentVia === "none" ? "without notifying" : `by ${VIA_WORDS[quote.sentVia ?? "none"]}`}` : "Not sent"],
          ["Total", money(quoteTotal(quote))],
          ["Deposit", depositFact(quote)],
          ["Decision", decisionFact(quote)],
          ["Reminders", quote.reminders.length ? `${quote.reminders.length} sent, the last ${ago(last!.at, now)}` : "None sent"],
          ...(quote.state === "sent" || quote.state === "approved" || quote.state === "declined" ? ([["Quote page", <a key="l" href={`/quote/${quote.id}`} className={cn(LINK, "inline-flex min-h-11 items-center")}>Open the quote page</a>]] as [string, React.ReactNode][]) : []),
        ]}
      />
    </SectionCard>
  )
}

/** Job: once the quote is approved the job exists, and the quote says so with its chip. Nothing before then. */
export function JobMadeCard({ quote, job }: { quote: QuoteRecord; job?: ApprovedJob }) {
  if (!quote.jobId) return null
  const stage = job ? STAGE_PILL[jobStageOf(job)] : STAGE_PILL.open
  return (
    <SectionCard title="Job" id="job-h">
      <div data-slot="job-created" className="flex flex-wrap items-center gap-2 text-sm">
        <JobChip id={quote.jobId} name={quote.service} customer={quote.customer} status={stage.status} total={money(job ? job.approvedTotal : quote.total)} />
        <StatusPill status={stage.status} label={stage.label} />
        <span className="text-muted-foreground">Job created {quote.decidedOn ? dayOf(quote.decidedOn) : ""}</span>
      </div>
    </SectionCard>
  )
}

/** The other quotes of a revision: the one this replaced and the one that replaced it, each a chip with its status. */
export function Revisions({ quote, all }: { quote: QuoteRecord; all: readonly QuoteRecord[] }) {
  const ids = [quote.replaces, quote.replacedBy].filter((x): x is string => Boolean(x))
  const others = ids.map((id) => all.find((q) => q.id === id)).filter((q): q is QuoteRecord => Boolean(q))
  if (others.length === 0) return null
  return (
    <SectionCard title="Revisions" id="revisions-h">
      <RecordList data-slot="revisions">
        {others.map((o) => (
          <li key={o.id} className={cn("flex items-center", RECORD_ROW)}>
            <span className="block min-w-0 flex-1">
              <QuoteChip number={o.id} />
              <span className="block text-muted-foreground">{o.id === quote.replaces ? "Replaced by this quote" : "Replaces this quote"}</span>
            </span>
            <RecordRowEnd>
              <StatusPill status={QUOTE_PILL[o.state].status} label={QUOTE_PILL[o.state].label} />
            </RecordRowEnd>
          </li>
        ))}
      </RecordList>
    </SectionCard>
  )
}
