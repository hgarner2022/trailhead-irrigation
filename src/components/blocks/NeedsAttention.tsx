import { CalendarX, Clock, CreditCard, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Attention } from "@/lib/admin/types"
import { EmptyState } from "./EmptyState"
import { relativeTime } from "./needs-attention-time"

// The short list on Home of what needs a person: a failed charge, Jobber
// jobs that were not created, a card about to expire. One row per item with an icon coloured by how urgent the kind
// is, the message, and how long it has been waiting. A row with a pass
// links to that pass; the prototype has no handlers, so the link is a page
// anchor. Pure render, server component.

export interface NeedsAttentionProps {
  items: Attention[]
  /**
   * ISO datetime the relative times are measured from. Screens must pass it
   * (the sync time, or the request time) so the server and the client render
   * the same words; the fallback to now is only for ad hoc use.
   */
  now?: string
  className?: string
}

const KINDS: Record<Attention["kind"], { icon: LucideIcon; tone: string; name: string }> = {
  "charge-failed": { icon: CreditCard, tone: "bg-warning/10 text-warning", name: "Charge failed" },
  "jobs-failed": { icon: CalendarX, tone: "bg-warning/10 text-warning", name: "Jobs not created" },
  "card-expiring": { icon: Clock, tone: "bg-stone text-muted-foreground", name: "Card expiring" },
}

function Row({ item, now }: { item: Attention; now: string }) {
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
  const layout = "flex items-start gap-3 py-3"
  return (
    <li data-kind={item.kind}>
      {item.passId ? (
        <a
          href={`#pass-${item.passId}`}
          className={cn(layout, "-mx-2 rounded-lg px-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50")}
        >
          {body}
        </a>
      ) : (
        <div className={layout}>{body}</div>
      )}
    </li>
  )
}

export function NeedsAttention({ items, now, className }: NeedsAttentionProps) {
  if (items.length === 0) {
    return <EmptyState className={className} title="Nothing needs you right now" line="Failed charges, missing jobs and expiring cards show up here." />
  }
  const at = now ?? new Date().toISOString()
  return (
    <ul data-slot="needs-attention" className={cn("divide-y divide-border", className)}>
      {items.map((item, i) => (
        <Row key={`${item.kind}-${item.passId ?? i}`} item={item} now={at} />
      ))}
    </ul>
  )
}
