"use client"

import Image from "next/image"
import { useId } from "react"
import { Check, ChevronDown, ChevronRight, Droplets } from "lucide-react"
import { PASS_SCHEDULES } from "@/lib/booking/pass-words"
import { REQUEST_QUOTE, includedList, type ServiceEntry } from "@/lib/booking/services"
import { cn } from "@/lib/utils"

// The one service list (docs/plans/2026-11-19-booking-form-design.md, "Third pass"). The Service step shows ONLY these cards (Hannah, Nov 23 2026: zones, prices and the access question belong on the next
// step, Details). Each card is a photo or a quiet icon at the left, the name in the display face, one line of what the service is, then the price and the length as meta, and a chevron; all of it is read
// from the catalogue and nothing is invented (a missing field is left out). The whole header is the button, 88px at least: pressing it picks the service and opens the card, which then holds only what is
// included, as a list. A chosen card has a navy border, a light tint and a check that draws in once. Pressing the open card closes it and unpicks the service. The Season Pass is first and most prominent
// (navy, with its card art). Only services set to "Book a day" are listed; "Need a quote? Request one" is a quiet outlined row. On the request path (`mode="quote"`) the same block lists the services we quote
// as plain radio cards with no price. Controlled. Pure props, client component.

export interface ServicePickerProps {
  entries: readonly ServiceEntry[]
  /** the key of the service picked, which is the card that is open */
  value: string | null
  /** the card pressed; the same key as `value` means it was closed */
  onChange: (key: string | null) => void
  /** "book": the cards; "quote": plain radio cards for what we quote, with no price */
  mode?: "book" | "quote"
  /** shows "Need a quote? Request one" under the list; omit on the request path itself */
  onRequestQuote?: () => void
  className?: string
}

/** The Season Pass card art, the same holographic artwork as the account's card. */
const PASS_ART = "/images/pass-card-art-holo.webp"

/** "about 1 hour": the catalogue's own length, as quiet meta. */
const lowerFirst = (s: string) => `${s.charAt(0).toLowerCase()}${s.slice(1)}`

function Thumb({ entry, pass }: { entry: ServiceEntry; pass: boolean }) {
  const src = pass ? PASS_ART : entry.photo
  return (
    <span data-slot="service-thumb" className={cn("relative size-14 shrink-0 overflow-hidden rounded-lg sm:size-[4.5rem]", pass ? "bg-navy-light" : "bg-stone")}>
      {src ? <Image src={src} alt="" fill sizes="72px" className="object-cover" /> : <span className="flex size-full items-center justify-center bg-navy text-white"><Droplets aria-hidden className="size-6" /></span>}
    </span>
  )
}

function Card({ entry, open, onToggle }: { entry: ServiceEntry; open: boolean; onToggle: () => void }) {
  const id = useId()
  const pass = entry.kind === "pass"
  // The one line: the catalogue's first sentence of what a visit includes; the pass says what it is in the sentence Hannah allowed.
  const lines = pass ? (entry.passVisits ?? []).map((v) => v.name) : includedList(entry.included)
  const oneLine = pass ? PASS_SCHEDULES : lines[0]
  const meta = pass ? entry.length : [entry.price, entry.length ? lowerFirst(entry.length) : null].filter(Boolean).join(" · ")
  return (
    <li data-slot="service-entry" data-kind={entry.kind} data-open={open || undefined} className={cn("overflow-hidden rounded-lg border-2 transition-colors", pass ? "border-navy bg-navy text-white shadow-sm" : open ? "border-navy bg-cream shadow-sm" : "border-border bg-background hover:border-navy/50")}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={onToggle}
        data-autofocus={open || undefined}
        className={cn("flex min-h-[5.5rem] w-full cursor-pointer items-center gap-3 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset", pass ? "hover:bg-white/5" : "hover:bg-cream")}
      >
        <span className="relative shrink-0">
          <Thumb entry={entry} pass={pass} />
          {open && (
            <span data-slot="service-check" aria-hidden className="absolute -top-1.5 -left-1.5 flex size-6 items-center justify-center rounded-full bg-primary-dark text-white ring-2 ring-background">
              <svg viewBox="0 0 16 16" className="draw-check size-3.5" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.5 8.5l3 3 6-7" />
              </svg>
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block font-display text-2xl leading-none", pass ? "text-white" : "text-navy")}>{entry.name}</span>
          {oneLine && <span className={cn("mt-1.5 line-clamp-2 block text-sm leading-snug", pass ? "text-white/80" : "text-muted-foreground")}>{oneLine}</span>}
          {meta && <span className={cn("mt-1.5 block text-sm font-semibold tabular-nums", pass ? "text-primary-light" : "text-navy")}>{meta}</span>}
        </span>
        <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors", pass ? (open ? "border-white bg-white text-navy" : "border-white/40 text-white") : open ? "border-navy bg-navy text-white" : "border-border bg-background text-navy")}>
          <ChevronDown className={cn("size-5 transition-transform motion-reduce:transition-none", open && "rotate-180")} />
        </span>
        {open && <span className="sr-only">Selected</span>}
      </button>
      {open && (
        <div id={`${id}-panel`} role="region" aria-label={entry.name} data-slot="service-panel" className={cn("border-t px-4 py-5", pass ? "border-white/15" : "border-border")}>
          <ul data-slot="service-included" className="space-y-2.5">
            {lines.map((line) => (
              <li key={line} className={cn("flex items-start gap-2.5 text-base leading-snug", pass ? "text-white" : "text-foreground")}>
                <Check aria-hidden className={cn("mt-0.5 size-4 shrink-0", pass ? "text-primary-light" : "text-success")} />
                {line}
              </li>
            ))}
          </ul>
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

export function ServicePicker({ entries, value, onChange, mode = "book", onRequestQuote, className }: ServicePickerProps) {
  const name = useId()
  return (
    <div data-slot="service-picker" className={cn("space-y-4", className)}>
      <fieldset className="min-w-0">
        <legend className="sr-only">Services</legend>
        <ul className="grid gap-3">
          {entries.map((e) => (mode === "book" ? <Card key={e.key} entry={e} open={value === e.key} onToggle={() => onChange(value === e.key ? null : e.key)} /> : <QuoteCard key={e.key} entry={e} name={name} checked={value === e.key} onChange={() => onChange(e.key)} />))}
        </ul>
      </fieldset>
      {onRequestQuote && (
        <button type="button" onClick={onRequestQuote} className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 text-left text-base font-semibold text-navy transition-colors hover:border-navy/50 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
          {REQUEST_QUOTE}
          <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}
