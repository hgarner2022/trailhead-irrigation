"use client"

import { useEffect, useId, useRef, useState, type CSSProperties } from "react"
import { Check, Clock, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ServiceEntry } from "@/lib/booking/services"
import { cn } from "@/lib/utils"
import { ServiceIcon, iconFor } from "./ServiceIcon"
import { DetailsPill } from "./DetailsPill"
import { CHOOSE, CHOSEN, REMOVE, metaLine, panelOf } from "./service-card-model"

// One service card of the booking form's Service step (Hannah's final pass, Nov 25 2026; the review and its sources are in PR "Service step: final pass").
// ONE interaction model: the header row opens and closes the card (an accordion header: a real button with aria-expanded, the whole row its target, a "Details" / "Hide" pill
// saying what a press does); the one button inside the open card chooses the service or removes the choice (a toggle button, aria-pressed). Nothing else is pressable.
// Every card is white, the Season Pass too (its orange tile and top rule set it apart without looking chosen): the ONLY strong state is a chosen card, with a navy edge,
// a warm tint and one orange check on its icon. Closed, a card is the icon, the name and one meta line that never wraps. The motion is in app/base.css (`.svc-*`), each
// piece once, in answer to a press: the icon draws and springs, the card opens and its lines come in, the check draws with one ring, the chosen card settles.

export interface ServiceCardProps {
  entry: ServiceEntry
  /** its place in the list: staggers the icon's first drawing */
  index?: number
  open: boolean
  selected: boolean
  onToggle: () => void
  /** true: chosen; false: the choice removed */
  onChoose: (on: boolean) => void
}

const line = (i: number) => ({ "data-line": true, style: { "--i": i } as CSSProperties })

export function ServiceCard({ entry, index = 0, open, selected, onToggle, onChoose }: ServiceCardProps) {
  const id = useId()
  const ref = useRef<HTMLLIElement>(null)
  const header = useRef<HTMLButtonElement>(null)
  /** a mouse press already opened (or closed) the card on the way down: the click that follows does nothing */
  const handled = useRef(false)
  // The icon draws once on first appearance and, with a small spring, once more on each press.
  const [play, setPlay] = useState(0)
  const pass = entry.kind === "pass"
  const meta = metaLine(entry)
  const { lead, items, facts } = panelOf(entry)

  // The check stays for a moment after the choice is removed, to undraw.
  const [leaving, setLeaving] = useState(false)
  const was = useRef(selected)
  useEffect(() => {
    const removed = was.current && !selected
    was.current = selected
    setLeaving(removed)
    if (!removed) return
    const t = setTimeout(() => setLeaving(false), 160)
    return () => clearTimeout(t)
  }, [selected])

  // The open card comes into view once it has finished opening.
  useEffect(() => {
    if (!open) return
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const t = setTimeout(() => ref.current?.scrollIntoView?.({ block: "nearest", behavior: reduce ? "auto" : "smooth" }), 240)
    return () => clearTimeout(t)
  }, [open])

  const choose = (on: boolean) => {
    if (on) setPlay((n) => n + 1)
    onChoose(on)
    if (on) header.current?.focus()
  }
  return (
    <li
      ref={ref}
      data-slot="service-entry"
      data-kind={entry.kind}
      data-open={open || undefined}
      data-selected={selected || undefined}
      className={cn("svc-card scroll-mt-4 scroll-mb-28 rounded-lg border bg-background sm:scroll-mb-6", selected ? "svc-settle border-navy bg-primary/5 ring-1 ring-navy" : cn("border-border", pass && "border-t-2 border-t-primary", open ? "shadow-sm" : "hover:border-navy/40"))}
    >
      <div data-slot="service-head" className="svc-head relative flex min-h-[5.5rem] items-center gap-4 rounded-lg p-4 active:bg-navy/5">
        <span data-slot="service-tile" className={cn("relative flex size-14 shrink-0 items-center justify-center rounded-lg border", pass ? "border-primary/30 bg-primary/10" : selected ? "border-border bg-background" : "border-border bg-cream")}>
          <span key={play} className={cn("flex", play > 0 && "svc-spring")}>
            <ServiceIcon name={iconFor(entry.key)} delay={play === 0 ? index * 40 : 0} />
          </span>
          {(selected || leaving) && (
            <span data-slot="service-check" data-leaving={leaving || undefined} aria-hidden className="svc-check absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-primary-dark text-white ring-2 ring-background">
              <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path pathLength={1} d="M3.5 8.5l3 3 6-7" />
              </svg>
            </span>
          )}
        </span>
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1">
          <button
            ref={header}
            type="button"
            aria-expanded={open}
            aria-controls={`${id}-panel`}
            aria-describedby={meta ? `${id}-meta` : undefined}
            onPointerDown={(e) => {
              setPlay((n) => n + 1)
              // A mouse opens on the way down, so it feels instant; a finger opens on the tap itself, so a scroll that starts on a card never opens it.
              if (e.pointerType === "mouse" && e.button === 0) {
                handled.current = true
                onToggle()
              }
            }}
            onPointerLeave={() => (handled.current = false)}
            onBlur={() => (handled.current = false)}
            onClick={() => {
              if (handled.current) return void (handled.current = false)
              onToggle()
            }}
            data-autofocus={selected || undefined}
            className="block w-full cursor-pointer pt-0.5 text-left font-display text-[1.375rem] leading-[1.1] text-balance text-navy after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary/60"
          >
            {entry.name}
            {selected && <span className="sr-only">, selected</span>}
          </button>
          <DetailsPill open={open} />
          {meta && (
            <p id={`${id}-meta`} className="col-span-2 text-sm leading-5 whitespace-nowrap text-muted-foreground tabular-nums">
              {meta}
            </p>
          )}
        </div>
      </div>
      <div id={`${id}-panel`} role="region" aria-label={entry.name} aria-hidden={!open} inert={!open} data-slot="service-panel" data-open={open || undefined} className="svc-panel">
        <div>
          <div className="mx-4 space-y-4 border-t border-border py-4">
            {lead && (
              <p {...line(0)} className="text-base leading-relaxed text-foreground">
                {lead}
              </p>
            )}
            {items.length > 0 && (
              <ul data-slot="service-included" className="space-y-2">
                {items.map((item, i) => (
                  <li key={item.text} {...line(i + 1)} className="flex items-start gap-2 text-base leading-snug text-foreground">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2.25} />
                    <span className="flex-1">{item.text}</span>
                    {item.price && <span className="shrink-0 font-semibold text-navy tabular-nums">{item.price}</span>}
                  </li>
                ))}
              </ul>
            )}
            {(facts.length || facts.rule) && (
              <ul data-slot="service-facts" {...line(items.length + 1)} className="space-y-2 rounded-lg bg-background p-4 text-sm text-navy ring-1 ring-border">
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
            {selected ? (
              <Button {...line(items.length + 2)} type="button" size="lg" variant="outline" aria-pressed className="w-full justify-between border-navy/30 text-navy sm:w-auto sm:min-w-56" onClick={() => choose(false)}>
                <span className="flex items-center gap-2">
                  <Check aria-hidden className="size-4 text-primary-dark" strokeWidth={2.5} />
                  {CHOSEN}
                </span>
                <span className="text-sm font-normal underline underline-offset-2">{REMOVE}</span>
              </Button>
            ) : (
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
