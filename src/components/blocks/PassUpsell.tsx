"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

// "Upgrade to a Season Pass" (Hannah, Nov 22 2026: "would you like to upgrade to a Season Pass"; Nov 23: keep it that short): one quiet row inside the open card of a single spring turn-on or fall blowout,
// with a switch that is off until the customer turns it on. On, the booking goes down the Season Pass path with the same address and choices kept; off, it goes back to the single visit. No claim
// beyond the question: what the pass is lives on its own card. A native button with role "switch", so Space and Enter work. Controlled; pure props, client component.

export const UPSELL_TITLE = "Upgrade to a Season Pass"

export interface PassUpsellProps {
  on: boolean
  onChange: (on: boolean) => void
  className?: string
}

export function PassUpsell({ on, onChange, className }: PassUpsellProps) {
  const id = useId()
  return (
    <div data-slot="pass-upsell" className={cn("flex items-center justify-between gap-4 rounded-lg border border-border bg-cream px-4 py-1", className)}>
      <p id={`${id}-title`} className="text-base font-semibold text-navy">
        {UPSELL_TITLE}
      </p>
      <button type="button" role="switch" aria-checked={on} aria-labelledby={`${id}-title`} onClick={() => onChange(!on)} className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
        <span className={cn("relative h-7 w-12 rounded-full transition-colors", on ? "bg-primary-dark" : "bg-input")}>
          <span className={cn("absolute top-0.5 size-6 rounded-full bg-white shadow transition-all", on ? "left-[1.375rem]" : "left-0.5")} />
        </span>
      </button>
    </div>
  )
}
