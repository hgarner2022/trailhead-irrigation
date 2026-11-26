"use client"

import { useId, useState } from "react"
import { ArrowRight } from "lucide-react"
import { REQUEST_QUOTE, type ServiceEntry } from "@/lib/booking/services"
import { cn } from "@/lib/utils"
import { ServiceCard } from "./ServiceCard"
import { optionClass } from "./option-styles"
import { ServiceIcon } from "./ServiceIcon"

// The list of service cards on the booking form's Service step (docs/plans/2026-11-19-booking-form-design.md). Each card is a ServiceCard and the whole card is the choice: one press chooses
// the service and the chosen card opens to show what is included; a second press removes the choice; choosing another card replaces it. The Season Pass is first. "Need a quote?" is a quiet
// card of the same family at the end. On the request path (`mode="quote"`) the block lists what we quote as plain radio cards. The words are in service-card-model.ts. Controlled.

export interface ServicePickerProps {
  entries: readonly ServiceEntry[]
  /** the key of the service chosen */
  value: string | null
  /** a service chosen (its key), or the choice removed (null) */
  onChange: (key: string | null) => void
  /** "book": the cards; "quote": plain radio cards for what we quote, with no price */
  mode?: "book" | "quote"
  /** shows the "Need a quote?" card under the list; omit on the request path itself */
  onRequestQuote?: () => void
  className?: string
}

/** "Need a quote?" as the last card of the list: the same family, quieter, and plainly a different kind of thing. A service card is white and raised and it is chosen; this one lies flat in the
 * page's own stone and it goes somewhere, which its one plain arrow says (no disc round it). Its icon draws again and its arrow moves on a press. */
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
      className="svc-quote flex min-h-[5.5rem] w-full cursor-pointer items-center gap-4 rounded-lg border border-transparent bg-stone p-4 text-left hover:border-navy/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-background">
        <ServiceIcon key={play} name="quote" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block type-option text-navy">{title}</span>
        {rest && <span className="mt-1 block text-sm leading-5 text-muted-foreground">{rest}</span>}
      </span>
      <ArrowRight aria-hidden className="svc-arrow mr-1 size-5 shrink-0 text-navy/60" />
    </button>
  )
}

/** A plain radio card, for the request path's list of what we quote. */
function QuoteCard({ entry, name, checked, onChange }: { entry: ServiceEntry; name: string; checked: boolean; onChange: () => void }) {
  return (
    <li data-slot="service-entry" data-kind="quote">
      <label className="relative block">
        <input type="radio" name={name} checked={checked} onChange={onChange} data-autofocus={checked || undefined} className="peer sr-only" />
        <span className={cn(optionClass({ selected: checked, focus: "peer" }), "flex min-h-16 items-center px-4 py-3")}>
          <span className="type-option">{entry.name}</span>
        </span>
      </label>
    </li>
  )
}

export function ServicePicker({ entries, value, onChange, mode = "book", onRequestQuote, className }: ServicePickerProps) {
  const name = useId()
  return (
    <div data-slot="service-picker" className={cn("space-y-6", className)}>
      <fieldset className="min-w-0">
        <legend className="sr-only">Services</legend>
        <ul className="grid gap-2">
          {entries.map((e, i) =>
            mode === "book" ? (
              <ServiceCard key={e.key} entry={e} index={i} selected={value === e.key} onToggle={() => onChange(value === e.key ? null : e.key)} />
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
