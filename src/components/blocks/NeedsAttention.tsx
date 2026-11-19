import Link from "next/link"
import { BadgeCheck, Ban, Banknote, CalendarCheck, CalendarX, CircleDashed, Clock, CreditCard, ClipboardList, MessageSquare, MessageSquareOff, ReceiptText, UserRound, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Attention } from "@/lib/admin/types"
import { jobUrl } from "@/lib/admin/links"
import type { RecordKey } from "@/lib/admin/record-url"
import { RecordLink } from "@/app/(admin)/admin/_screens/RecordHost"
import { EmptyState } from "./EmptyState"
import { AttentionAction, type ActionResult } from "./needs-attention-action"
import { relativeTime } from "./needs-attention-time"

// The short list on Home of what needs a person: a failed charge, a task that
// did not finish, a card about to expire, jobs from earlier days nobody has marked done, a pass canceled. One row per item with an icon coloured by how urgent the kind
// is, the message, how long it has been waiting, and ONE action (Retry, Send
// card link, Reply, ...) so the list can be cleared like an inbox (the
// review, 2026-11-12). A row about a job, a customer or one stop opens that record in the one panel over the screen (the address updated, Back returns); with no
// panel to open it in (a bare screen, a new tab) it is a link to the record's page. The action is `onAction`, a server action in the app, and logs in the catalog. Server
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
  "charge-failed": { icon: CreditCard, tone: "bg-warning/10 text-warning", name: "Card failed" },
  "charge-not-pressed": { icon: CreditCard, tone: "bg-warning/10 text-warning", name: "Card not charged" },
  "no-card": { icon: CreditCard, tone: "bg-warning/10 text-warning", name: "No card" },
  "jobs-failed": { icon: CalendarX, tone: "bg-warning/10 text-warning", name: "Task needs a retry" },
  owed: { icon: Banknote, tone: "bg-warning/10 text-warning", name: "Done, unpaid" },
  overdue: { icon: ReceiptText, tone: "bg-warning/10 text-warning", name: "Invoice past due" },
  "pending-pass": { icon: Clock, tone: "bg-stone text-muted-foreground", name: "Pass not paid" },
  "card-expiring": { icon: Clock, tone: "bg-stone text-muted-foreground", name: "Card expiring" },
  "not-closed": { icon: CircleDashed, tone: "bg-stone text-muted-foreground", name: "Jobs not marked done" },
  "pass-cancelled": { icon: Ban, tone: "bg-warning/10 text-warning", name: "Pass canceled" },
  "customer-changed": { icon: UserRound, tone: "bg-warning/10 text-warning", name: "Customer change" },
  "text-undelivered": { icon: MessageSquare, tone: "bg-warning/10 text-warning", name: "Text problem" },
  "texts-paused": { icon: MessageSquareOff, tone: "bg-warning/10 text-warning", name: "Texts paused" },
  "quote-request": { icon: ClipboardList, tone: "bg-primary/10 text-primary-dark", name: "Quote request" },
  scheduled: { icon: CalendarCheck, tone: "bg-success/10 text-success", name: "Schedule run" },
  unplaced: { icon: CalendarX, tone: "bg-warning/10 text-warning", name: "Unscheduled" },
}

/** The record a row is about, and the address of its own page: the row opens that record in the one panel over Home (docs/plans/2026-11-18-admin-holistic-design.md, 5.1) and a link opened in a new tab goes to the page. */
export function attentionRecord(item: Attention): { kind: RecordKey; id: string; href: string } | undefined {
  if (item.kind === "overdue" && item.jobId) return { kind: "job", id: item.jobId, href: jobUrl(item.jobId) }
  if ((item.kind === "overdue" || item.kind === "charge-failed" || item.kind === "text-undelivered" || item.kind === "quote-request") && !item.passId && !item.visitId && item.customerId) return { kind: "customer", id: item.customerId, href: `/admin/customers?customer=${encodeURIComponent(item.customerId)}` }
  if (item.visitId) return { kind: "visit", id: item.visitId, href: `/admin/schedule?visit=${encodeURIComponent(item.visitId)}` }
  // A pass is a job: its row opens that job (HomeScreen puts the job on a row that names only a pass).
  if (item.passId && item.jobId) return { kind: "job", id: item.jobId, href: jobUrl(item.jobId) }
  return undefined
}

/** The page a row goes to: its record's, else the Jobs list for a pass with no job, else the Schedule for the kinds that live there; the rest have no page of their own. */
export function attentionHref(item: Attention): string | undefined {
  const record = attentionRecord(item)
  if (record) return record.href
  if (item.passId) return "/admin/jobs"
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
  const record = attentionRecord(item)
  const layout = "flex min-w-0 flex-1 items-start gap-3"
  const link = cn(layout, "-mx-2 min-h-11 rounded-lg px-2 py-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50")
  return (
    <li data-kind={item.kind} className="flex flex-col gap-2 py-3 has-[[data-dismissed]]:hidden sm:flex-row sm:items-center sm:gap-3">
      {record ? (
        <RecordLink kind={record.kind} id={record.id} href={record.href} className={link}>
          {body}
        </RecordLink>
      ) : href ? (
        <Link href={href} className={link}>
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
    return <EmptyState className={className} title="Nothing needs you." line="Failed cards, jobs with no day and work nobody marked done show up here." />
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
