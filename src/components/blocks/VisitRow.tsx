import Link from "next/link"
import type { MoneyTone, VisitPill } from "@/lib/portal/words"
import { cn } from "@/lib/utils"
import { StatusPill } from "./StatusPill"

// One visit as a customer reads it in the timeline (docs/plans/2026-11-18-customer-portal-v2-design.md, section 3): the day (with the year when it is not this year), what the
// visit is, the street when the customer has two properties, who is coming once the window was told, the money word, and one pill in
// the customer's words. The row is one link to the visit page; a paid visit adds a Receipt link beside it. Pure props, server-safe; `portalTimeline` makes them.

export interface VisitRowProps {
  /** the visit page */
  href: string
  /** "Tue, Apr 28", or for a visit with no day its preference in her words ("Our recommended, mid October") */
  dayWords: string
  /** kept so callers need not change; the row no longer shows it (the pass page says how we schedule, once) */
  note?: string | null
  service: string
  /** kept so callers need not change; the row no longer shows a pass chip (too much on one card) */
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

export function VisitRow({ href, dayWords, service, street, who, money, tone = "none", pill, receiptHref }: VisitRowProps) {
  const gone = pill.status === "cancelled" || pill.status === "skipped"
  return (
    <li data-slot="visit-row" data-status={pill.status} className="flex items-start gap-4 py-4">
      <Link href={href} className="min-w-0 flex-1 space-y-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <p className={cn("text-base font-semibold", gone ? "text-muted-foreground line-through" : "text-foreground")}>{dayWords}</p>
        <p className="text-base text-foreground">{[service, who].filter(Boolean).join(" · ")}</p>
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
