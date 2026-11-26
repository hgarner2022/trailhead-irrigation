"use client"

import { useState } from "react"
import Link from "next/link"
import { CircleCheck, CircleX, FileText, Inbox, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { relativeTime } from "./needs-attention-time"
import { recordHref } from "./record-preview-model"

// Home's rows for requests and quotes (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.7; Hannah's answers 1 and 8 of Nov 20 2026), in the same
// anatomy as a Needs action row: an icon in a tinted circle, the message, how long it has been waiting and ONE action. "2 new requests" is one row that
// opens the Requests list filtered to New and shows the oldest age, never a promise. "Quote waiting" is one row per quote that is Sent and undecided,
// oldest first, with its age and Remind (a quote is reminded only when Ryan presses it, once a day); the row opens the Quotes list on the Sent quotes. A decided quote raises one row that Dismiss clears.
// A tech sees none of them. On a phone these rows are the way into Requests, which sits under More. Pure props over an `at` for the age.

export type RequestRow =
  | { kind: "new-requests"; count: number; oldestAt: string }
  | { kind: "quote-waiting"; id: string; jobId: string; customer: string; service: string; amount: string; sentAt: string; remindedAt?: string; remindedToday?: boolean }
  | { kind: "quote-decided"; id: string; jobId: string; /** where the row opens: the job made when it was approved (the default), or the quote itself when it was declined and no job exists */ href?: string; customer: string; outcome: "approved" | "declined"; amount: string; at: string }

const TONE_WAIT = "bg-warning/10 text-warning"
const rowKey = (r: RequestRow) => (r.kind === "new-requests" ? "new-requests" : `${r.kind}-${r.id}`)

export interface RequestRowsProps {
  rows: readonly RequestRow[]
  /** the moment ages are counted from */
  now: string
  /** Remind on a waiting quote: opens the reminder's own dialog */
  onRemind?: (row: Extract<RequestRow, { kind: "quote-waiting" }>) => void
  /** Dismiss on a decided quote's row */
  onDismiss?: (row: Extract<RequestRow, { kind: "quote-decided" }>) => void
  /** a tech sees none of these rows */
  readOnly?: boolean
  className?: string
}

const LINK = "-mx-2 flex min-h-11 min-w-0 flex-1 items-start gap-3 rounded-lg px-2 py-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

function Body({ icon: Icon, tone, name, message, sub, since }: { icon: LucideIcon; tone: string; name: string; message: string; sub: string; since: string }) {
  return (
    <>
      <span data-slot="attention-icon" className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", tone)} title={name}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm text-foreground">
          <span className="sr-only">{`${name}: `}</span>
          {message}
        </span>
        <time dateTime={since} className="text-xs text-muted-foreground">
          {sub}
        </time>
      </span>
    </>
  )
}

export function RequestRows({ rows, now, onRemind, onDismiss, readOnly, className }: RequestRowsProps) {
  const [gone, setGone] = useState<readonly string[]>([])
  const visible = readOnly ? [] : rows.filter((r) => !gone.includes(rowKey(r)))
  if (visible.length === 0) return null
  return (
    <ul data-slot="request-rows" className={cn("divide-y divide-border", className)}>
      {visible.map((row) => {
        if (row.kind === "new-requests") {
          return (
            <li key="new-requests" data-kind="new-requests" className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
              <Link href="/admin/requests?status=new" className={LINK}>
                <Body icon={Inbox} tone={TONE_WAIT} name="New requests" message={row.count === 1 ? "1 new request" : `${row.count} new requests`} sub={`${row.count === 1 ? "Came in" : "Oldest came in"} ${relativeTime(row.oldestAt, now)}`} since={row.oldestAt} />
              </Link>
              <Button size="touch" asChild variant="outline" className="self-start sm:self-center">
                <Link href="/admin/requests?status=new">Open requests</Link>
              </Button>
            </li>
          )
        }
        if (row.kind === "quote-waiting") {
          return (
            <li key={rowKey(row)} data-kind="quote-waiting" className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
              <Link href="/admin/quotes?status=sent" className={LINK}>
                <Body icon={FileText} tone={TONE_WAIT} name="Quote waiting" message={`${row.customer}, ${row.service}, ${row.amount}`} sub={`Sent ${relativeTime(row.sentAt, now)}${row.remindedAt ? `. Reminded ${relativeTime(row.remindedAt, now)}` : ""}`} since={row.sentAt} />
              </Link>
              <Button size="touch" type="button" variant="outline" className="self-start sm:self-center" disabled={row.remindedToday} onClick={() => onRemind?.(row)}>
                {row.remindedToday ? "Reminded today" : "Remind"}
              </Button>
            </li>
          )
        }
        const approved = row.outcome === "approved"
        return (
          <li key={rowKey(row)} data-kind="quote-decided" className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
            <Link href={row.href ?? recordHref.job(row.jobId)} className={LINK}>
              <Body icon={approved ? CircleCheck : CircleX} tone={approved ? "bg-success/10 text-success" : "bg-stone text-muted-foreground"} name="Quote decided" message={`${row.customer} ${approved ? "approved" : "declined"} a ${row.amount} quote`} sub={relativeTime(row.at, now)} since={row.at} />
            </Link>
            <Button size="touch" type="button" variant="outline" className="self-start sm:self-center" onClick={() => (setGone((g) => [...g, rowKey(row)]), onDismiss?.(row))}>
              Dismiss
            </Button>
          </li>
        )
      })}
    </ul>
  )
}

/** The rows Home draws for these requests and quotes: one for the new requests, one per waiting quote (oldest first), then the decided ones. */
export function requestRowsOf(o: { requests: readonly { receivedAt: string; isNew: boolean }[]; quotes: readonly Extract<RequestRow, { kind: "quote-waiting" | "quote-decided" }>[] }): RequestRow[] {
  const fresh = o.requests.filter((r) => r.isNew).sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
  const waiting = o.quotes.filter((q): q is Extract<RequestRow, { kind: "quote-waiting" }> => q.kind === "quote-waiting").sort((a, b) => a.sentAt.localeCompare(b.sentAt))
  const decided = o.quotes.filter((q): q is Extract<RequestRow, { kind: "quote-decided" }> => q.kind === "quote-decided").sort((a, b) => b.at.localeCompare(a.at))
  return [...(fresh.length ? [{ kind: "new-requests" as const, count: fresh.length, oldestAt: fresh[0]!.receivedAt }] : []), ...waiting, ...decided]
}
