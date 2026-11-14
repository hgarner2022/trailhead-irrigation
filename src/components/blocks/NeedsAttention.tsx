import Link from "next/link"
import { BadgeCheck, Ban, CalendarCheck, CalendarX, CircleDashed, Clock, CreditCard, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Attention } from "@/lib/admin/types"
import { EmptyState } from "./EmptyState"
import { AttentionAction, type ActionResult } from "./needs-attention-action"
import { relativeTime } from "./needs-attention-time"

// The short list on Home of what needs a person: a failed charge, a task that
// did not finish, a card about to expire, jobs from earlier days nobody has marked done, a pass cancelled. One row per item with an icon coloured by how urgent the kind
// is, the message, how long it has been waiting, and ONE action (Retry, Send
// card link, Reply, ...) so the list can be cleared like an inbox (the
// review, 2026-11-12). A row with a pass links to that pass in Passes and a row with a
// visit to that visit in Schedule; the action is `onAction`, a server action in the app, and logs in the catalog. Server
// component; the action button carries its own client boundary.

export interface NeedsAttentionProps {
  items: Attention[]
  /**
   * ISO datetime the relative times are measured from. Screens must pass it
   * (the sync time, or the request time) so the server and the client render
   * the same words; the fallback to now is only for ad hoc use.
   */
  now?: string
  /** runs a row's one action (a server action in the app); without it the button only logs, as in the catalog */
  onAction?: (item: Attention) => Promise<ActionResult | void>
  /** Dismiss on every row, or with `undo` its Undo; a server action in the app. Rows show no Dismiss without it unless `onAction` is given too. */
  onDismiss?: (item: Attention, undo: boolean) => Promise<ActionResult | void>
  /** a tech reads the list; the rows keep their links and lose their buttons */
  readOnly?: boolean
  className?: string
}

const KINDS: Record<Attention["kind"], { icon: LucideIcon; tone: string; name: string }> = {
  "new-pass": { icon: BadgeCheck, tone: "bg-success/10 text-success", name: "New pass" },
  "charge-failed": { icon: CreditCard, tone: "bg-warning/10 text-warning", name: "Charge failed" },
  "jobs-failed": { icon: CalendarX, tone: "bg-warning/10 text-warning", name: "Task needs a retry" },
  "pending-pass": { icon: Clock, tone: "bg-stone text-muted-foreground", name: "Pass not paid" },
  "card-expiring": { icon: Clock, tone: "bg-stone text-muted-foreground", name: "Card expiring" },
  "not-closed": { icon: CircleDashed, tone: "bg-stone text-muted-foreground", name: "Jobs not marked done" },
  "pass-cancelled": { icon: Ban, tone: "bg-warning/10 text-warning", name: "Pass cancelled" },
  scheduled: { icon: CalendarCheck, tone: "bg-success/10 text-success", name: "Schedule run" },
  unplaced: { icon: CalendarX, tone: "bg-warning/10 text-warning", name: "Needs a day" },
}

/** A visit opens in Visits, a pass in its panel, a schedule line in Schedule; the rest have no page of their own. */
export function attentionHref(item: Attention): string | undefined {
  if (item.visitId) return `/admin/visits?visit=${encodeURIComponent(item.visitId)}`
  if (item.passId) return `/admin/passes?pass=${encodeURIComponent(item.passId)}`
  if (item.kind === "unplaced" || item.kind === "not-closed" || item.kind === "scheduled") return "/admin/schedule"
  return undefined
}

function Row({ item, now, onAction, onDismiss, readOnly }: { item: Attention; now: string; onAction?: NeedsAttentionProps["onAction"]; onDismiss?: NeedsAttentionProps["onDismiss"]; readOnly?: boolean }) {
  const { icon: Icon, tone, name } = KINDS[item.kind]
  const body = (
    <>
      <span data-slot="attention-icon" className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", tone)} title={name}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm text-foreground">
          <span className="sr-only">{`${name}: `}</span>
          {item.message}
        </span>
        <time dateTime={item.since} className="text-xs text-muted-foreground">
          {relativeTime(item.since, now)}
        </time>
      </span>
    </>
  )
  const href = attentionHref(item)
  const layout = "flex min-w-0 flex-1 items-start gap-3"
  return (
    <li data-kind={item.kind} className="flex flex-col gap-2 py-3 has-[[data-dismissed]]:hidden sm:flex-row sm:items-center sm:gap-3">
      {href ? (
        <Link
          href={href}
          className={cn(layout, "-mx-2 rounded-lg px-2 py-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50")}
        >
          {body}
        </Link>
      ) : (
        <div className={layout}>{body}</div>
      )}
      {!readOnly && <AttentionAction item={item} onAction={onAction} onDismiss={onDismiss} />}
    </li>
  )
}

export function NeedsAttention({ items, now, onAction, onDismiss, readOnly, className }: NeedsAttentionProps) {
  if (items.length === 0) {
    return <EmptyState className={className} title="Nothing needs you right now" line="Failed charges, visits that need a day and visits nobody marked done show up here." />
  }
  const at = now ?? new Date().toISOString()
  return (
    <ul data-slot="needs-attention" className={cn("divide-y divide-border", className)}>
      {items.map((item, i) => (
        <Row key={`${item.kind}-${item.key ?? item.passId ?? i}`} item={item} now={at} onAction={onAction} onDismiss={onDismiss} readOnly={readOnly} />
      ))}
    </ul>
  )
}
