"use client"

import { useEffect, useId, useRef, useState, type CSSProperties } from "react"
import { ArrowRight, ChevronDown, Clock, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PASS_SCHEDULES } from "@/lib/booking/pass-words"
import { REQUEST_QUOTE, includedList, money, type ServiceEntry } from "@/lib/booking/services"
import { SERVICE_LIST } from "@/lib/services"
import { cn } from "@/lib/utils"
import { ServiceIcon, iconFor } from "./ServiceIcon"

// The service cards of the booking form's Service step (docs/plans/2026-11-19-booking-form-design.md; Hannah, Nov 25 2026: "a pretty icon with micro animations to open and view more details. This is mobile.").
// A closed card is calm and about 90px: a drawn icon in a 56px tile (ServiceIcon, which draws itself once on first appearance and again on a press), the name in the display face, one meta line
// ("From $145 · about 1 hour") and a chevron. The whole header is the button that OPENS the card (one at a time, eased, scrolled into view) to show the catalogue's own description, what is included as
// a list, and the length and the price rule. Opening does not choose: "Choose this service" inside the open card does, and closes it, and so does the small round check at the left of the meta line.
// A chosen card has a navy 2px edge, a faint warm tint and an orange check on its icon that draws in once. The Season Pass is first, navy, with the logo's sun. Every word and number is read from the
// catalogue (src/lib/booking/services.ts over the backend rows); a missing field is left out and nothing is retyped. The motion is in app/base.css (`.svc-*`, two durations and one easing) and is off
// under prefers-reduced-motion. "Need a quote?" is a quiet card of the same family at the end. On the request path (`mode="quote"`) the block lists what we quote as plain radio cards. Controlled.

export interface ServicePickerProps {
  entries: readonly ServiceEntry[]
  /** the key of the service chosen */
  value: string | null
  /** a service chosen (its key), or the chosen one unchosen (null) */
  onChange: (key: string | null) => void
  /** the card that starts open (its details showing); opening a card never chooses it */
  defaultOpen?: string | null
  /** "book": the cards; "quote": plain radio cards for what we quote, with no price */
  mode?: "book" | "quote"
  /** shows the "Need a quote?" card under the list; omit on the request path itself */
  onRequestQuote?: () => void
  className?: string
}

export const CHOOSE = "Choose this service"

const lowerFirst = (s: string) => `${s.charAt(0).toLowerCase()}${s.slice(1)}`
const upperFirst = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`

/** The catalogue's description as the open card shows it: "A full system check: a, b and c." is a lead line and a list of its parts; any other text is read as it is written. */
export function describe(included?: string): { lead: string; items: string[] } {
  const [first = "", ...rest] = includedList(included)
  const colon = first.indexOf(": ")
  if (colon < 0) return { lead: included ?? "", items: [] }
  return { lead: [first.slice(0, colon), ...rest].map((s) => `${s}.`).join(" "), items: first.slice(colon + 2).split(", ").map(upperFirst) }
}

/** "$95 up to 6 zones, then $10 a zone", from the service's own row; the card's price where the row has no zone rule. */
export function priceRule(entry: ServiceEntry): string {
  const row = SERVICE_LIST.find((s) => s.key === entry.serviceKeys[0])
  if (row?.price !== undefined && row.includedZones && row.extraZonePrice) return `${money(row.price)} up to ${row.includedZones} zones, then ${money(row.extraZonePrice)} a zone`
  return entry.price
}

const line = (i: number) => ({ "data-line": true, style: { "--i": i } as CSSProperties })

function Card({ entry, index, open, selected, onOpen, onChoose }: { entry: ServiceEntry; index: number; open: boolean; selected: boolean; onOpen: () => void; onChoose: (on: boolean) => void }) {
  const id = useId()
  const ref = useRef<HTMLLIElement>(null)
  const header = useRef<HTMLButtonElement>(null)
  // The icon draws once on first appearance (staggered by its place in the list) and once more on each press.
  const [play, setPlay] = useState(0)
  const pass = entry.kind === "pass"
  const { lead, items } = pass ? { lead: PASS_SCHEDULES, items: [] } : describe(entry.included)
  const meta = pass ? entry.length : [entry.price, entry.length ? lowerFirst(entry.length) : null].filter(Boolean).join(" · ")
  const clause = pass ? null : (entry.included ?? "").split(/[:,.]/)[0]
  const rule = pass ? "" : priceRule(entry)

  // The open card comes into view once it has finished opening.
  useEffect(() => {
    if (!open) return
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const t = setTimeout(() => ref.current?.scrollIntoView?.({ block: "nearest", behavior: reduce ? "auto" : "smooth" }), 240)
    return () => clearTimeout(t)
  }, [open])

  const choose = (on: boolean) => {
    setPlay((n) => n + 1)
    onChoose(on)
    if (open && on) header.current?.focus()
  }
  return (
    <li
      ref={ref}
      data-slot="service-entry"
      data-kind={entry.kind}
      data-open={open || undefined}
      data-selected={selected || undefined}
      className={cn(
        "svc-card scroll-mt-4 scroll-mb-28 rounded-lg border sm:scroll-mb-6",
        selected && "svc-settle ring-1",
        pass ? cn("bg-navy text-white shadow-md", selected ? "border-primary-light ring-primary-light" : "border-navy") : selected ? "border-navy bg-primary/5 ring-navy" : cn("border-border bg-background", open ? "shadow-sm" : "hover:border-navy/40"),
      )}
    >
      <div className="relative flex min-h-[5.5rem] items-center gap-3 px-3.5 py-4">
        <span data-slot="service-tile" className={cn("relative flex size-14 shrink-0 items-center justify-center rounded-lg border", pass ? "border-white/15 bg-white/10" : selected ? "border-border bg-background" : "border-border bg-cream")}>
          <ServiceIcon key={play} name={iconFor(entry.key)} tone={pass ? "dark" : "light"} delay={play === 0 ? index * 40 : 0} />
          {selected && (
            <span data-slot="service-check" aria-hidden className={cn("svc-check absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-primary-dark text-white ring-2", pass ? "ring-navy" : "ring-background")}>
              <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path pathLength={1} d="M3.5 8.5l3 3 6-7" />
              </svg>
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <button
            ref={header}
            type="button"
            aria-expanded={open}
            aria-controls={`${id}-panel`}
            aria-describedby={`${id}-meta`}
            onClick={() => {
              setPlay((n) => n + 1)
              onOpen()
            }}
            data-autofocus={selected || undefined}
            className={cn("block w-full cursor-pointer text-left font-display text-[1.375rem] leading-[1.1] text-balance after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary/60", pass ? "text-white" : "text-navy")}
          >
            {entry.name}
            {selected && <span className="sr-only">, selected</span>}
          </button>
          {clause && !open && <p className="mt-1 hidden truncate text-sm text-muted-foreground sm:block">{clause}</p>}
          <div className="mt-1.5 flex items-start gap-1.5">
            <button
              type="button"
              aria-pressed={selected}
              aria-label={`Choose ${entry.name}`}
              onClick={() => choose(!selected)}
              className={cn(
                "relative z-10 flex size-[1.125rem] shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] transition-colors before:absolute before:-inset-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2",
                selected ? "border-primary-dark bg-primary-dark text-white" : pass ? "border-white/60 hover:border-white" : "border-navy/40 bg-background hover:border-navy",
                pass && "focus-visible:ring-offset-navy",
              )}
            >
              {selected && (
                <svg aria-hidden viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3.5 8.5l3 3 6-7" />
                </svg>
              )}
            </button>
            {meta && <p id={`${id}-meta`} className={cn("min-w-0 text-[0.8125rem] leading-[1.125rem] tabular-nums", pass ? "text-white/85" : "text-muted-foreground")}>{meta}</p>}
          </div>
        </div>
        <span aria-hidden className={cn("flex size-8 shrink-0 items-center justify-center rounded-full transition-colors", pass ? (open ? "bg-white text-navy" : "bg-white/10 text-white") : open ? "bg-navy text-white" : "bg-stone text-navy")}>
          <ChevronDown className={cn("svc-chevron size-[1.125rem]", open && "rotate-180")} />
        </span>
      </div>
      <div id={`${id}-panel`} role="region" aria-label={entry.name} aria-hidden={!open} inert={!open} data-slot="service-panel" data-open={open || undefined} className="svc-panel">
        <div>
          <div className={cn("mx-3.5 space-y-4 border-t pt-4 pb-4", pass ? "border-white/15" : "border-border")}>
            {lead && <p {...line(0)} className={cn("text-[0.9375rem] leading-relaxed", pass ? "text-white/90" : "text-foreground")}>{lead}</p>}
            {(items.length > 0 || (pass && entry.passVisits?.length)) && (
              <ul data-slot="service-included" className="space-y-2.5">
                {pass
                  ? (entry.passVisits ?? []).map((v, i) => (
                      <li key={v.kind} {...line(i + 1)} className="flex items-start gap-2.5 text-[0.9375rem] leading-snug text-white">
                        <Tick className="text-primary-light" />
                        <span className="flex-1">{v.name}</span>
                        <span className="shrink-0 font-semibold tabular-nums">{v.price}</span>
                      </li>
                    ))
                  : items.map((text, i) => (
                      <li key={text} {...line(i + 1)} className="flex items-start gap-2.5 text-[0.9375rem] leading-snug text-foreground">
                        <Tick className="text-success" />
                        {text}
                      </li>
                    ))}
              </ul>
            )}
            {!pass && (entry.length || rule) && (
              <ul data-slot="service-facts" {...line(items.length + 1)} className="space-y-2 rounded-lg bg-background px-3.5 py-3 text-sm text-navy ring-1 ring-border">
                {entry.length && (
                  <li className="flex items-center gap-2.5">
                    <Clock aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    {entry.length}
                  </li>
                )}
                {rule && (
                  <li className="flex items-center gap-2.5 font-semibold tabular-nums">
                    <Tag aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    {rule}
                  </li>
                )}
              </ul>
            )}
            {!selected && (
              <Button {...line(items.length + 2)} type="button" size="lg" className="w-full sm:w-auto sm:min-w-56" onClick={() => choose(true)}>
                {CHOOSE}
              </Button>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

function Tick({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={cn("mt-0.5 size-4 shrink-0", className)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5l3.2 3.2L13 4.5" />
    </svg>
  )
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
      className="svc-quote flex min-h-[4.5rem] w-full cursor-pointer items-center gap-3 rounded-lg border border-dashed border-navy/25 px-4 py-3 text-left hover:border-navy/50 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
        <ServiceIcon key={play} name="quote" className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-xl leading-tight text-navy">{title}</span>
        {rest && <span className="block text-sm text-muted-foreground">{rest}</span>}
      </span>
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-stone text-navy">
        <ArrowRight className="svc-arrow size-5" />
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
        <ul className="grid gap-3">
          {entries.map((e, i) =>
            mode === "book" ? (
              <Card key={e.key} entry={e} index={i} open={open === e.key} selected={value === e.key} onOpen={() => setOpen(open === e.key ? null : e.key)} onChoose={(on) => choose(e.key, on)} />
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
