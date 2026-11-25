"use client"

import { useId } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PASS_SCHEDULES } from "@/lib/booking/pass-words"
import { cn } from "@/lib/utils"

// The Season Pass offer on the Details step of a single spring turn-on or fall blowout (Hannah, Nov 25 2026: customers do not know what it is, "you should sell them a bit"): its own quiet card after the
// details, not a switch. A heading, three short lines that only say what Hannah has approved (CLAUDE.md's Season Pass description: we schedule every season so you never have to remember; the same price per visit
// as booking each alone, said once as reassurance; the schedule is kept and repair visits get priority), the two visits with what each costs at their zones, and one outline button, "Add Season Pass". Added, the
// card is the selected state, its check draws in once, and it reads "Season Pass added." with "Remove"; the booking goes down the pass path. No urgency, no numbers that are not the catalogue's. Controlled; pure
// props, client component.

export const UPSELL_TITLE = "Make it a Season Pass"
export const UPSELL_LINES = [PASS_SCHEDULES, "Each visit costs the same as booking it alone.", "Your place in the schedule is kept, and repair visits get priority."] as const
export const UPSELL_ADD = "Add Season Pass"
export const UPSELL_ADDED = "Season Pass added."
export const UPSELL_REMOVE = "Remove"

export interface PassUpsellProps {
  on: boolean
  onChange: (on: boolean) => void
  /** what each visit of the pass costs at their zones, exactly: "Spring turn-on" and "$145" */
  prices: readonly { name: string; price: string }[]
  className?: string
}

export function PassUpsell({ on, onChange, prices, className }: PassUpsellProps) {
  const id = useId()
  return (
    <section data-slot="pass-upsell" data-on={on || undefined} aria-labelledby={`${id}-title`} className={cn("rounded-lg border-2 px-4 py-5 transition-colors motion-reduce:transition-none", on ? "border-navy bg-cream" : "border-border bg-background", className)}>
      {on ? (
        <div className="flex items-center justify-between gap-4">
          <p id={`${id}-title`} className="flex items-center gap-3 font-display text-2xl leading-none text-navy">
            <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-dark text-white">
              <svg viewBox="0 0 16 16" className="draw-check size-4" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.5 8.5l3 3 6-7" />
              </svg>
            </span>
            {UPSELL_ADDED}
          </p>
          <Button type="button" variant="ghost" onClick={() => onChange(false)} className="h-auto min-h-11 px-2 text-base font-semibold text-primary-deep underline underline-offset-2 hover:bg-transparent">
            {UPSELL_REMOVE}
          </Button>
        </div>
      ) : (
        <>
          <h2 id={`${id}-title`} className="font-display text-2xl leading-tight text-navy">
            {UPSELL_TITLE}
          </h2>
          <ul className="mt-3 space-y-2">
            {UPSELL_LINES.map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-base leading-snug text-foreground">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                {line}
              </li>
            ))}
          </ul>
          <dl className="mt-4 divide-y divide-border border-y border-border">
            {prices.map((p) => (
              <div key={p.name} className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-base text-foreground">{p.name}</dt>
                <dd className="text-base font-semibold tabular-nums text-navy">{p.price}</dd>
              </div>
            ))}
          </dl>
          <Button type="button" variant="outline" size="lg" onClick={() => onChange(true)} className="mt-4 min-h-12 w-full text-base sm:w-auto">
            {UPSELL_ADD}
          </Button>
        </>
      )}
    </section>
  )
}
