"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

// "Make it a Season Pass" (Hannah, Nov 22 2026: "If somebody books a sprinkler turn on, we should promote the season pass somehow"): a quiet card inside the open card of a single spring turn-on or
// fall blowout, with a switch that is off until the customer turns it on. On, the booking goes down the Season Pass path with the same address and choices kept; off, it goes back to the single visit.
// Two true lines and no claim beyond them: the pass schedules every season (Hannah, Nov 21 2026) and a visit is paid for after it is done. A native button with role "switch", so Space and Enter work.
// Controlled; pure props, client component.

export const UPSELL_TITLE = "Make it a Season Pass"
export const UPSELL_LINE = "We schedule it every season. You pay after each visit."

export interface PassUpsellProps {
  on: boolean
  onChange: (on: boolean) => void
  className?: string
}

export function PassUpsell({ on, onChange, className }: PassUpsellProps) {
  const id = useId()
  return (
    <div data-slot="pass-upsell" className={cn("flex items-start justify-between gap-4 rounded-lg border border-border bg-cream px-4 py-3", className)}>
      <div>
        <p id={`${id}-title`} className="text-base font-semibold text-navy">
          {UPSELL_TITLE}
        </p>
        <p id={`${id}-line`} className="mt-0.5 text-sm text-muted-foreground">
          {UPSELL_LINE}
        </p>
      </div>
      <button type="button" role="switch" aria-checked={on} aria-labelledby={`${id}-title`} aria-describedby={`${id}-line`} onClick={() => onChange(!on)} className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
        <span className={cn("relative h-7 w-12 rounded-full transition-colors", on ? "bg-primary-dark" : "bg-input")}>
          <span className={cn("absolute top-0.5 size-6 rounded-full bg-white shadow transition-all", on ? "left-[1.375rem]" : "left-0.5")} />
        </span>
      </button>
    </div>
  )
}
