"use client"

import { useEffect, useId, useRef, useState, type CSSProperties } from "react"
import { Clock, Tag } from "lucide-react"
import type { ServiceEntry } from "@/lib/booking/services"
import { cn } from "@/lib/utils"
import { ServiceIcon, iconFor } from "./ServiceIcon"
import { Tick } from "./Tick"
import { optionClass, optionDetailClass, optionFocusWithin } from "./option-styles"
import { metaLine, panelOf } from "./service-card-model"

// One service card of the booking form's Service step (Hannah, Nov 25 2026: "Can it just be a clickable card?... just go do it"; the options she chose from are pictured in
// docs/review/2026-11-25-service-card-options, this is A2, pictured in docs/review/2026-11-26-service-card-a2). THE WHOLE CARD IS THE CHOICE: its header is one toggle button (aria-pressed). One press chooses the service; a second press removes the
// choice; choosing another card replaces it. There is no pill and no second button. What says "press me": the card sits a little above the page, its edge darkens under a pointer, it
// gives under a press, its icon draws on first view, and an empty ring at the right marks it as a choice. Chosen, the header is the one selected state of every option on the
// customer's screens (optionClass: navy, white text), the ring turns white and gains its dot (a radio's own mark; no tick, no badge, no pulse: docs/review/2026-11-26-check-redesign), and the card opens by itself to show what is included, the
// length and the price rule, read from the catalogue. Every card is white until chosen, the Season Pass too (an orange tile and top rule set it apart). The motion is in app/base.css
// (`.svc-*`), each piece once, in answer to a press, and off under prefers-reduced-motion.

export interface ServiceCardProps {
  entry: ServiceEntry
  /** its place in the list: staggers the icon's first drawing */
  index?: number
  selected: boolean
  /** chooses the service, or removes the choice when it is the chosen one */
  onToggle: () => void
}

const line = (i: number) => ({ "data-line": true, style: { "--i": i } as CSSProperties })

export function ServiceCard({ entry, index = 0, selected, onToggle }: ServiceCardProps) {
  const id = useId()
  const ref = useRef<HTMLLIElement>(null)
  // The icon draws once on first appearance and, with a small spring, once more on each press.
  const [play, setPlay] = useState(0)
  const pass = entry.kind === "pass"
  const meta = metaLine(entry)
  const { lead, items, facts } = panelOf(entry)

  // The chosen card opens; once it HAS opened (the panel's own transition has ended, so the card is its full height) it comes into view, clear of the Continue bar.
  // A timer alone measures a half-open card on a slow phone. Nothing moves on the first render.
  const panel = useRef<HTMLDivElement>(null)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) return void (first.current = false)
    if (!selected) return
    const el = panel.current
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let shown = false
    const show = () => {
      if (shown) return
      shown = true
      ref.current?.scrollIntoView?.({ block: "nearest", behavior: reduce ? "auto" : "smooth" })
    }
    const opened = (e: TransitionEvent) => {
      if (e.target === el && e.propertyName === "grid-template-rows") show()
    }
    el?.addEventListener("transitionend", opened)
    // With no motion there is no transition to wait for. Otherwise this is the net under a transition that never started; one still running is left to report its own end.
    const t = setTimeout(() => !el?.getAnimations?.().length && show(), reduce ? 0 : 400)
    return () => {
      el?.removeEventListener("transitionend", opened)
      clearTimeout(t)
    }
  }, [selected])

  return (
    <li
      ref={ref}
      data-slot="service-entry"
      data-kind={entry.kind}
      data-selected={selected || undefined}
      className={cn("svc-card scroll-mt-4 scroll-mb-28 overflow-hidden rounded-lg border bg-background sm:scroll-mb-6", optionFocusWithin, selected ? "border-navy" : cn("border-border shadow-sm hover:border-navy/40 hover:shadow-md", pass && "border-t-2 border-t-primary"))}
    >
      <button
        type="button"
        aria-pressed={selected}
        aria-controls={`${id}-panel`}
        onClick={() => {
          setPlay((n) => n + 1)
          onToggle()
        }}
        data-slot="service-head"
        data-autofocus={selected || undefined}
        className={cn(optionClass({ selected, settle: false }), "flex min-h-[5.5rem] w-full items-center gap-4 rounded-none border-0 p-4 text-left focus-visible:ring-0 focus-visible:ring-offset-0")}
      >
        <span data-slot="service-tile" className={cn("svc-fade flex size-14 shrink-0 items-center justify-center rounded-lg border", pass && !selected ? "border-primary/30 bg-primary/10" : "border-border bg-background")}>
          <span key={play} className={cn("flex", play > 0 && "svc-spring")}>
            <ServiceIcon name={iconFor(entry.key)} delay={play === 0 ? index * 40 : 0} />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block type-option text-balance">{entry.name}</span>
          {meta && <span className={cn("svc-fade mt-1 block text-sm leading-5 whitespace-nowrap tabular-nums", optionDetailClass(selected))}>{meta}</span>}
        </span>
        {!selected && (
          <span data-slot="service-ring" aria-hidden className="svc-fade flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-navy/30" />
        )}
      </button>
      <div ref={panel} id={`${id}-panel`} role="region" aria-label={entry.name} aria-hidden={!selected} inert={!selected} data-slot="service-panel" data-open={selected || undefined} className="svc-panel">
        <div>
          <div className="space-y-4 p-4">
            {lead && (
              <p {...line(0)} className="text-base leading-relaxed text-foreground">
                {lead}
              </p>
            )}
            {items.length > 0 && (
              <ul data-slot="service-included" className="space-y-2">
                {items.map((item, i) => (
                  <li key={item.text} {...line(i + 1)} className="flex items-start gap-2 text-base leading-snug text-foreground">
                    <Tick className="mt-1" />
                    <span className="flex-1">{item.text}</span>
                    {item.price && <span className="shrink-0 font-semibold text-navy tabular-nums">{item.price}</span>}
                  </li>
                ))}
              </ul>
            )}
            {(facts.length || facts.rule) && (
              <ul data-slot="service-facts" {...line(items.length + 1)} className="space-y-2 text-sm text-navy">
                {facts.length && (
                  <li className="flex items-center gap-2">
                    <Clock aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    {facts.length}
                  </li>
                )}
                {facts.rule && (
                  <li className="flex items-center gap-2 font-semibold tabular-nums">
                    <Tag aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    {facts.rule}
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}
