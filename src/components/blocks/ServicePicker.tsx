"use client"

import { useId, useState } from "react"
import { ArrowRight } from "lucide-react"
import { REQUEST_QUOTE, type ServiceEntry } from "@/lib/booking/services"
import { cn } from "@/lib/utils"
import { ServiceCard } from "./ServiceCard"
import { ServiceIcon } from "./ServiceIcon"

// The list of service cards on the booking form's Service step (docs/plans/2026-11-19-booking-form-design.md). Each card is a ServiceCard: pressing its header opens it to read, one card at a time, and
// the button inside the open card chooses the service or removes the choice; choosing closes the card, and choosing another card replaces the choice. The Season Pass is first. "Need a quote?" is a
// quiet card of the same family at the end. On the request path (`mode="quote"`) the block lists what we quote as plain radio cards. The words are in service-card-model.ts. Controlled.

export interface ServicePickerProps {
  entries: readonly ServiceEntry[]
  /** the key of the service chosen */
  value: string | null
  /** a service chosen (its key), or the choice removed (null) */
  onChange: (key: string | null) => void
  /** the card that starts open (its details showing); opening a card never chooses it */
  defaultOpen?: string | null
  /** "book": the cards; "quote": plain radio cards for what we quote, with no price */
  mode?: "book" | "quote"
  /** shows the "Need a quote?" card under the list; omit on the request path itself */
  onRequestQuote?: () => void
  className?: string
}

/** "Need a quote?" as the last card of the list: the same family, quieter. Its icon draws again and its arrow moves on a press. */
function QuoteRow({ onRequestQuote }: { onRequestQuote: () => void }) {
  const [play, setPlay] = useState(0)
  const [title, rest] = REQUEST_QUOTE.split(/(?<=\?)\s+/)
  return (
    <button
      type="button"
      data-slot="service-quote"
      aria-label={REQUEST_QUOTE}
      onPointerDown={() => setPlay((n) => n + 1)}
      onClick={onRequestQuote}
      className="svc-quote flex min-h-[4.5rem] w-full cursor-pointer items-center gap-4 rounded-lg border border-dashed border-navy/25 p-4 text-left hover:border-navy/50 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <span className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
        <ServiceIcon key={play} name="quote" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[1.375rem] leading-[1.1] text-navy">{title}</span>
        {rest && <span className="mt-1 block text-sm leading-5 text-muted-foreground">{rest}</span>}
      </span>
      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-stone text-navy">
        <ArrowRight className="svc-arrow size-4" />
      </span>
    </button>
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

export function ServicePicker({ entries, value, onChange, defaultOpen = null, mode = "book", onRequestQuote, className }: ServicePickerProps) {
  const name = useId()
  // Which card shows its details: one at a time, and not the same thing as the service chosen.
  const [open, setOpen] = useState<string | null>(defaultOpen)
  const choose = (key: string, on: boolean) => {
    onChange(on ? key : null)
    if (on) setOpen(null)
  }
  return (
    <div data-slot="service-picker" className={cn("space-y-6", className)}>
      <fieldset className="min-w-0">
        <legend className="sr-only">Services</legend>
        <ul className="grid gap-2">
          {entries.map((e, i) =>
            mode === "book" ? (
              <ServiceCard key={e.key} entry={e} index={i} open={open === e.key} selected={value === e.key} onToggle={() => setOpen((k) => (k === e.key ? null : e.key))} onChoose={(on) => choose(e.key, on)} />
            ) : (
              <QuoteCard key={e.key} entry={e} name={name} checked={value === e.key} onChange={() => onChange(e.key)} />
            ),
          )}
        </ul>
      </fieldset>
      {onRequestQuote && <QuoteRow onRequestQuote={onRequestQuote} />}
    </div>
  )
}
