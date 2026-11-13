"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"
import { visitsOnSale } from "@/lib/season-pass"
import { DAY_HEADINGS, dayWords, windowWords, withChoice, type DayKind, type Offers } from "./checkout-days"
import { RenewalExtras } from "./checkout-renewal"
import type { RenewalPrefill } from "./checkout-submit"
import type { StepProps } from "./checkout-steps"

// The "Your days" step: for each visit the pass holds, a short heading and three day cards (the day big, the two-hour window
// small), the first preselected. Each visit is a native radio group, so the arrow keys, Tab and Space work without any code
// here, and Enter moves on like every other step. Under the cards, one line: it can be changed later.

const CARD = "flex min-h-20 cursor-pointer flex-col justify-center rounded-lg border px-4 py-3 text-left transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-2"

export function DaysStep({ state, offers: loaded, set, renewal, attempted = false }: StepProps & { offers: Offers | null; renewal?: RenewalPrefill; attempted?: boolean }) {
  const id = useId()
  const kinds = visitsOnSale(state.inspection, state.today).map((v) => v.key as DayKind)
  if (loaded === null)
    return (
      <p role="status" data-slot="days-loading" className="text-base text-muted-foreground">
        Finding the open days in your town.
      </p>
    )
  const offers = loaded
  return (
    <div className="space-y-10">
      {kinds.map((kind, k) => {
        const list = offers[kind] ?? []
        const held = state.days.find((d) => d.kind === kind)
        return (
          <fieldset key={kind} data-slot="days-group" data-kind={kind} className="min-w-0">
            <legend className="font-display text-3xl leading-[1.05] text-navy">{DAY_HEADINGS[kind]}</legend>
            {list.length === 0 ? (
              <p className="mt-3 text-base text-muted-foreground">We don&apos;t have an open day to show yet. Ryan sets this one and we text it to you.</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {list.map((offer, i) => {
                  const checked = held?.day === offer.day && held.truckId === offer.truckId
                  return (
                    <label key={`${offer.day}-${offer.truckId}`} className="relative block">
                      <input
                        type="radio"
                        name={`${id}-${kind}`}
                        checked={checked}
                        data-autofocus={(k === 0 && checked) || undefined}
                        onChange={() => set("days", withChoice(state.days, offer, kind))}
                        className="peer sr-only"
                      />
                      <span data-slot="day-card" className={cn(CARD, checked ? "border-navy bg-navy text-white" : "border-border bg-background text-navy hover:border-navy/40")}>
                        <span className="font-display text-2xl leading-none">{dayWords(offer.day)}</span>
                        <span className={cn("mt-1.5 text-sm", checked ? "text-white/80" : "text-muted-foreground")}>{windowWords(offer.window)}</span>
                        {i === 0 && <span className="sr-only">, the earliest</span>}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </fieldset>
        )
      })}
      <p className="text-base text-muted-foreground">Change it later from your pass page.</p>
      {renewal && <RenewalExtras state={state} set={set} renewal={renewal} attempted={attempted} />}
    </div>
  )
}
