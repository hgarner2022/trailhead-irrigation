"use client"

import { useId, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { REQUEST_QUOTE, type ServiceEntry } from "@/lib/booking/services"
import { cn } from "@/lib/utils"

// The one service list (docs/plans/2026-11-19-booking-form-design.md, "Service cards expand in place"): one card per service with its name, its price and a chevron. The whole header is the button
// (Hannah, Nov 22 2026: "it needs to be really clear that it's clickable"): pressing it picks the service and opens the card in place, and the card then holds what is included and the questions
// that belong to it (`renderPanel`), so there is no "What's included" link and no separate details step. Pressing the open card closes it and unpicks the service. One card is open at a time, the
// Season Pass first. Only services set to "Book a day" are in the list; one link at the bottom, "Need a quote? Request one", starts the request path. The same block lists the quoted services on
// that path (`quote` mode: no `renderPanel`, so plain radio cards with no price). Controlled. Pure props, client component.

export interface ServicePickerProps {
  entries: readonly ServiceEntry[]
  /** the key of the service picked, which is the card that is open */
  value: string | null
  /** the card pressed; the same key as `value` means it was closed */
  onChange: (key: string | null) => void
  /** what the open card holds: what is included and the questions that belong to the service */
  renderPanel?: (entry: ServiceEntry) => ReactNode
  /** shows "Need a quote? Request one" under the list; omit on the request path itself */
  onRequestQuote?: () => void
  className?: string
}

const OPEN = "border-navy bg-background shadow-sm"
const SHUT = "border-border bg-background hover:border-navy/50"

function Card({ entry, open, onToggle, panel }: { entry: ServiceEntry; open: boolean; onToggle: () => void; panel: ReactNode }) {
  const id = useId()
  return (
    <li data-slot="service-entry" data-kind={entry.kind} data-open={open || undefined} className={cn("overflow-hidden rounded-lg border-2 transition-colors", open ? OPEN : SHUT)}>
      <button type="button" aria-expanded={open} aria-controls={`${id}-panel`} onClick={onToggle} data-autofocus={open || undefined} className="flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset">
        <span className="min-w-0 flex-1">
          <span className="block font-display text-2xl leading-none text-navy">{entry.name}</span>
          {entry.kind === "pass" && entry.length && <span className="mt-1.5 block text-sm text-muted-foreground">{entry.length}</span>}
        </span>
        {entry.price && <span className="shrink-0 text-base font-semibold tabular-nums text-navy">{entry.price}</span>}
        <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors", open ? "border-navy bg-navy text-white" : "border-border bg-background text-navy")}>
          <ChevronDown className={cn("size-5 transition-transform", open && "rotate-180")} />
        </span>
        {open && <span className="sr-only">Selected</span>}
      </button>
      {open && (
        <div id={`${id}-panel`} role="region" aria-label={entry.name} data-slot="service-panel" className="border-t border-border bg-background px-4 py-6">
          {panel}
        </div>
      )}
    </li>
  )
}

/** A plain radio card, for the request path's list of what we quote. */
function QuoteCard({ entry, name, checked, onChange }: { entry: ServiceEntry; name: string; checked: boolean; onChange: () => void }) {
  return (
    <li data-slot="service-entry" data-kind="quote">
      <label className="relative block">
        <input type="radio" name={name} checked={checked} onChange={onChange} data-autofocus={checked || undefined} className="peer sr-only" />
        <span className={cn("flex min-h-16 cursor-pointer items-center rounded-lg border-2 px-4 py-3 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-2", checked ? "border-navy bg-navy text-white" : "border-border bg-background text-navy hover:border-navy/50")}>
          <span className="font-display text-2xl leading-none">{entry.name}</span>
        </span>
      </label>
    </li>
  )
}

export function ServicePicker({ entries, value, onChange, renderPanel, onRequestQuote, className }: ServicePickerProps) {
  const name = useId()
  return (
    <div data-slot="service-picker" className={cn("space-y-4", className)}>
      <fieldset className="min-w-0">
        <legend className="sr-only">Services</legend>
        <ul className="grid gap-3">
          {entries.map((e) =>
            renderPanel ? <Card key={e.key} entry={e} open={value === e.key} onToggle={() => onChange(value === e.key ? null : e.key)} panel={value === e.key ? renderPanel(e) : null} /> : <QuoteCard key={e.key} entry={e} name={name} checked={value === e.key} onChange={() => onChange(e.key)} />,
          )}
        </ul>
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
