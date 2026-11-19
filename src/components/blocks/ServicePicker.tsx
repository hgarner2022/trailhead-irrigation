"use client"

import { useId } from "react"
import { REQUEST_QUOTE, OUT_OF_SEASON_NOTE, type ServiceEntry } from "@/lib/booking/services"
import { cn } from "@/lib/utils"

// The one service list (docs/plans/2026-11-18-online-booking-design.md sections 4.1 and 6): one large radio card per service with its price line and length, the Season Pass first, and an
// out-of-season service shown and not selectable with its opening day. Only services set to "Book a day" are in the list (Hannah, Nov 18 2026); the ones we quote are not, and one link at the
// bottom, "Need a quote? Request one", starts the request path. The same block lists the quoted services on that path (`quote` mode: no prices, no opening days). "What's included" opens the
// rest of the catalogue text under the card. Native radios, one tab stop, the arrow keys move. Controlled. Pure props, client component.

export interface ServicePickerProps {
  entries: readonly ServiceEntry[]
  value: string | null
  onChange: (key: string) => void
  /** shows "Need a quote? Request one" under the list; omit on the request path itself */
  onRequestQuote?: () => void
  className?: string
}

const CARD = "flex cursor-pointer flex-col gap-1 rounded-lg border px-4 py-4 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-60"

function Entry({ entry, name, checked, onChange }: { entry: ServiceEntry; name: string; checked: boolean; onChange: () => void }) {
  const off = Boolean(entry.opens)
  const quote = entry.kind === "quote"
  return (
    <li data-slot="service-entry" data-kind={entry.kind} className={cn(entry.kind === "pass" && "md:col-span-2")}>
      <label className="relative block">
        <input type="radio" name={name} checked={checked} disabled={off} onChange={onChange} data-autofocus={checked || undefined} className="peer sr-only" />
        <span className={cn(CARD, checked ? "border-navy bg-navy text-white" : "border-border bg-background text-navy hover:border-navy/40")}>
          <span className="flex items-baseline justify-between gap-4">
            <span className="font-display text-2xl leading-none">{entry.name}</span>
            {!quote && <span className="shrink-0 text-base font-semibold tabular-nums">{off ? `Opens ${entry.opens}` : entry.price}</span>}
          </span>
          <span className={cn("text-base", checked ? "text-white/90" : "text-foreground")}>{entry.line}</span>
          {entry.length && <span className={cn("text-sm", checked ? "text-white/85" : "text-muted-foreground")}>{entry.length}</span>}
        </span>
      </label>
      {entry.included && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold text-primary-deep underline underline-offset-2">{"What's included"}</summary>
          <p className="pb-2 text-base text-foreground">{entry.included}</p>
        </details>
      )}
    </li>
  )
}

export function ServicePicker({ entries, value, onChange, onRequestQuote, className }: ServicePickerProps) {
  const name = useId()
  const closed = entries.some((e) => e.opens)
  return (
    <div data-slot="service-picker" className={cn("space-y-4", className)}>
      <fieldset className="min-w-0">
        <legend className="sr-only">Services</legend>
        <ul className="grid gap-3 md:grid-cols-2">
          {entries.map((e) => (
            <Entry key={e.key} entry={e} name={name} checked={value === e.key} onChange={() => onChange(e.key)} />
          ))}
        </ul>
        {closed && <p className="mt-3 text-base text-muted-foreground">{OUT_OF_SEASON_NOTE}</p>}
      </fieldset>
      {onRequestQuote && (
        <p className="border-t border-border pt-4 text-base text-muted-foreground">
          <button type="button" onClick={onRequestQuote} className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-primary-deep underline underline-offset-2">
            {REQUEST_QUOTE}
          </button>
        </p>
      )}
    </div>
  )
}
