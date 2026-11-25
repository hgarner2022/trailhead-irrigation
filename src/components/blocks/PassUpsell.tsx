"use client"

import { useId } from "react"
import { Button } from "@/components/ui/button"
import { PASS_SCHEDULES } from "@/lib/booking/pass-words"
import { cn } from "@/lib/utils"
import { PriceLines } from "@/components/blocks/PriceLines"
import { Tick } from "@/components/blocks/Tick"

// The Season Pass offer on the Details step of a single spring turn-on or fall blowout (Hannah, Nov 25 2026: customers do not know what it is, "you should sell them a bit"): its own quiet card after the
// details, not a switch. A heading, three short lines that only say what Hannah has approved (CLAUDE.md's Season Pass description: we schedule every season so you never have to remember; the same price per visit
// as booking each alone, said once as reassurance; the schedule is kept and repair visits get priority), the two visits with what each costs at their zones, and one outline button, "Add Season Pass". Added, the
// card is the selected state, a thin navy tick draws in once beside the words (Tick: no badge), and it reads "Season Pass added." with "Remove"; the booking goes down the pass path. No urgency, no numbers that are not the catalogue's. Controlled; pure
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
          <p id={`${id}-title`} className="flex items-center gap-3 type-heading text-navy">
            <Tick draw className="size-5 text-current" />
            {UPSELL_ADDED}
          </p>
          <Button type="button" variant="ghost" onClick={() => onChange(false)} className="h-auto min-h-11 px-2 text-base font-semibold text-primary-deep underline underline-offset-2 hover:bg-transparent">
            {UPSELL_REMOVE}
          </Button>
        </div>
      ) : (
        <>
          <h2 id={`${id}-title`} className="type-heading text-navy">
            {UPSELL_TITLE}
          </h2>
          <ul className="mt-3 space-y-2">
            {UPSELL_LINES.map((line) => (
              <li key={line} className="flex items-start gap-2.5 type-body leading-snug text-foreground">
                <Tick className="mt-1" />
                {line}
              </li>
            ))}
          </ul>
          <PriceLines className="mt-4" lines={prices.map((p) => ({ name: p.name, value: p.price }))} />
          <Button type="button" variant="outline" size="lg" onClick={() => onChange(true)} className="mt-4 min-h-12 w-full text-base sm:w-auto">
            {UPSELL_ADD}
          </Button>
        </>
      )}
    </section>
  )
}
