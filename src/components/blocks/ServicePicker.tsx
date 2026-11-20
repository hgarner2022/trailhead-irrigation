"use client"

import { useId } from "react"
import { Clock } from "lucide-react"
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
          {entry.passVisits && (
            <ul data-slot="pass-visits" className={cn("mt-2 divide-y rounded-md border", checked ? "divide-white/20 border-white/25" : "divide-border border-border")}>
              {entry.passVisits.map((v) => (
                <li key={v.kind} data-slot="pass-visit" data-kind={v.kind} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-3 py-2">
                  <span className="text-base font-semibold">{v.name}</span>
                  <span className={cn("text-sm tabular-nums", checked ? "text-white/90" : "text-foreground")}>{v.price}</span>
                  <span className={cn("basis-full text-sm", checked ? "text-white/85" : "text-muted-foreground")}>{[v.length, v.opens ? `Opens ${v.opens}` : null].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
            </ul>
          )}
          {entry.length && (
            <span data-slot="service-length" className={cn("mt-1 flex items-center gap-1.5 text-sm", checked ? "text-white/85" : "text-muted-foreground")}>
              <Clock aria-hidden className="size-4 shrink-0" />
              {entry.length}
            </span>
          )}
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
  // The note points at the pass, so it shows only when the pass is on the list and holds a visit whose single card is closed (a pass with no visit list is the old catalogue card and holds both).
  const pass = entries.find((e) => e.kind === "pass")
  const heldKinds = pass?.passVisits?.map((v) => v.kind)
  const SINGLE: Record<string, string> = { "spring-turn-on": "turn-on", "fall-blowout": "blowout" }
  const closed = Boolean(pass) && entries.some((e) => e.opens && (!heldKinds || heldKinds.includes(SINGLE[e.key] as "turn-on" | "blowout")))
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
