import Link from "next/link"
import type { MoneyTone, VisitPill } from "@/lib/portal/words"
import { cn } from "@/lib/utils"
import { StatusPill } from "./StatusPill"

// One visit as a customer reads it in the timeline (docs/plans/2026-11-18-customer-portal-v2-design.md, section 3): the day (with the year when it is not this year), what the
// visit is with a small Season Pass label, the street when the customer has two properties, who is coming once the window was told, the money word, and one pill in
// the customer's words. The row is one link to the visit page; a paid visit adds a Receipt link beside it. Pure props, server-safe; `portalTimeline` makes them.

export interface VisitRowProps {
  /** the visit page */
  href: string
  /** "Tue, Apr 28", or for a visit with no day its preference in her words ("Our recommended, mid October") */
  dayWords: string
  /** the line under a visit with no day: "We'll schedule it about two weeks before and tell you the day." */
  note?: string | null
  service: string
  /** "Season Pass 2027" */
  label?: string | null
  /** the street, only when the customer has more than one property */
  street?: string | null
  /** the first name of who is coming, only once the window was told */
  who?: string | null
  /** "$145, charged after the visit", "$145 · Paid", "$115 unpaid" */
  money?: string
  tone?: MoneyTone
  pill: VisitPill
  /** the printable receipt of a paid visit */
  receiptHref?: string | null
}

const TONES: Record<MoneyTone, string> = { paid: "text-positive-deep", unpaid: "text-foreground", "invoice-sent": "text-foreground", "past-due": "text-destructive", none: "text-muted-foreground" }

export function VisitRow({ href, dayWords, note, service, label, street, who, money, tone = "none", pill, receiptHref }: VisitRowProps) {
  const gone = pill.status === "cancelled" || pill.status === "skipped"
  return (
    <li data-slot="visit-row" data-status={pill.status} className="flex items-start gap-4 py-4">
      <Link href={href} className="min-w-0 flex-1 space-y-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
        <p className={cn("text-base font-semibold", gone ? "text-muted-foreground line-through" : "text-foreground")}>{dayWords}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-base text-foreground">
          <span>{[service, who].filter(Boolean).join(" · ")}</span>
          {label && <span className="rounded-full border border-border bg-stone px-2 py-0.5 text-xs font-semibold text-navy-light">{label}</span>}
        </p>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
        {street && <p className="text-sm text-muted-foreground">{street}</p>}
        {money && <p className={cn("text-sm", TONES[tone])}>{money}</p>}
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <StatusPill status={pill.status} label={pill.label} />
        {receiptHref && (
          <Link href={receiptHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-deep underline underline-offset-2">
            Receipt
          </Link>
        )}
      </div>
    </li>
  )
}
