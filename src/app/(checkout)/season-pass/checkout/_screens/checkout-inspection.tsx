"use client"

import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/admin/metrics"
import { SEASON_PASS_ADD_ON, visitPrice } from "@/lib/season-pass"
import { Helper, type StepProps } from "./checkout-steps"

// The add-on step: the pass is the turn-on and the blowout, and the July
// inspection is offered here as one choice with its price for the zone
// count already given (Hannah, 2026-11-12). Off is preselected, so Enter
// moves on; the pressed button holds the answer.

const CHOICES = [
  { value: false, name: "No, just the two", detail: "Spring turn-on and fall blowout" },
  { value: true, name: "Yes, add July", detail: "Mid-season inspection and tune-up" },
] as const

export function InspectionStep({ state, set }: StepProps) {
  const price = visitPrice(SEASON_PASS_ADD_ON, state.zones)
  return (
    <>
      <div role="group" aria-label="Mid-season inspection" className="grid gap-3 sm:grid-cols-2">
        {CHOICES.map((choice) => {
          const pressed = state.inspection === choice.value
          return (
            <button
              key={choice.name}
              type="button"
              aria-pressed={pressed}
              data-slot="inspection-choice"
              data-autofocus={pressed || undefined}
              onClick={() => set("inspection", choice.value)}
              className={cn(
                "flex min-h-24 cursor-pointer flex-col items-start justify-center rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
                pressed ? "border-navy bg-navy text-white" : "border-border bg-background text-navy hover:border-navy/40",
              )}
            >
              <span className="font-display text-2xl leading-none">{choice.name}</span>
              <span className={cn("mt-1.5 text-sm", pressed ? "text-white/80" : "text-muted-foreground")}>
                {choice.value ? `${choice.detail}, ${formatMoney(price)} after the visit` : choice.detail}
              </span>
            </button>
          )
        })}
      </div>
      <Helper>In July we run every zone, look for coverage gaps, clogged nozzles and zones running long, and adjust what we find. Billed after the visit like the others, and you can add it later by replying to any of our emails.</Helper>
    </>
  )
}
