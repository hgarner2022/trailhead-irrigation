import Link from "next/link"
import type { MouseEvent } from "react"
import { Briefcase, CalendarCheck, CalendarDays, CreditCard, FileText, Inbox, MapPin, Receipt, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { StatusPill } from "./StatusPill"
import { KIND_WORD, type RecordKind, type RecordPreviewData } from "./record-preview-model"

// The card a RecordChip shows on hover, focus or long-press (docs/plans/2026-11-19-record-links-research.md, rule 4): the kind, the name,
// one status pill, at most four facts and Open. It is also the summary a Cmd+K hit can show, because it only reads `RecordPreviewData`.
// Pure props; "Open" does what the chip does (`onOpen` where a host opens the record in place, else the plain link).

export const KIND_ICON: Record<Exclude<RecordKind, "customer" | "person">, LucideIcon> = {
  property: MapPin,
  job: Briefcase,
  visit: CalendarCheck,
  invoice: Receipt,
  payment: CreditCard,
  day: CalendarDays,
  request: Inbox,
  quote: FileText,
}

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")

/** The picture before a name: initials in a tinted circle for people, the object's icon in a square-cornered tint for everything else. */
export function RecordMark({ kind, name, size }: { kind: RecordKind; name: string; size: "band" | "row" | "card" }) {
  const box = size === "band" ? "size-8" : size === "card" ? "size-10" : "size-6"
  if (kind === "customer" || kind === "person") {
    return (
      <span aria-hidden data-slot="record-mark" className={cn("flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-display font-semibold text-primary-deep", box, size === "row" ? "text-xs" : "text-sm")}>
        {initialsOf(name)}
      </span>
    )
  }
  const Icon = KIND_ICON[kind]
  return (
    <span aria-hidden data-slot="record-mark" className={cn("flex shrink-0 items-center justify-center rounded-md bg-navy/10 text-navy", box)}>
      <Icon className={size === "row" ? "size-3.5" : "size-4"} />
    </span>
  )
}

export interface RecordPreviewProps {
  data: RecordPreviewData
  onOpen?: () => void
  className?: string
}

export function RecordPreview({ data, onOpen, className }: RecordPreviewProps) {
  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onOpen || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onOpen()
  }
  return (
    <section data-slot="record-preview" data-kind={data.kind} aria-label={`${KIND_WORD[data.kind]} preview: ${data.name}`} className={cn("w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card p-4 text-card-foreground shadow-md", className)}>
      <div className="flex items-start gap-3">
        <RecordMark kind={data.kind} name={data.name} size="card" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{KIND_WORD[data.kind]}</p>
          <p className="break-words font-display text-lg font-semibold leading-tight text-navy">{data.name}</p>
          {data.subtitle && <p className="mt-0.5 break-words text-sm text-muted-foreground">{data.subtitle}</p>}
        </div>
      </div>
      {data.pill && (
        <div className="mt-3">
          <StatusPill status={data.pill.status} label={data.pill.label} />
        </div>
      )}
      {data.facts.length > 0 && (
        <dl className="mt-3 divide-y divide-border border-y border-border text-sm">
          {data.facts.slice(0, 4).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 py-1.5">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <Link href={data.href} onClick={open} className="mt-2 flex min-h-11 items-center rounded-sm text-sm font-semibold text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {data.openLabel}
      </Link>
    </section>
  )
}
