"use client"

import { InfoTip } from "@/components/blocks/InfoTip"
import { cn } from "@/lib/utils"

// Account Details, "Marketing": one switch, "Tips and offers by email" (Hannah, Nov 25 2026: booking counts as the opt-in for email; no marketing texts exist, so there is no text switch). Turning it
// off is the withdrawal and is recorded as a consent event, like the unsubscribe link every marketing email carries. The reassurance that receipts and visit reminders come either way sits in a tooltip, not
// under the control. A native button with role "switch", so Space and Enter work. Pure props.

const QUIET = "You'll still get receipts and visit reminders either way."

export function MarketingSwitches({ email, onEmail }: { email: boolean; onEmail: (on: boolean) => void }) {
  const label = "Tips and offers by email"
  return (
    <fieldset data-slot="marketing-switches" className="mt-8">
      <legend className="mb-1 font-display text-2xl font-semibold text-navy">Marketing</legend>
      <div className="flex min-h-14 items-center justify-between gap-4 py-2">
        <span className="flex items-center gap-1 text-base font-medium text-foreground">
          {label}
          <InfoTip label={`About ${label.toLowerCase()}`}>{QUIET}</InfoTip>
        </span>
        <button type="button" role="switch" aria-checked={email} aria-label={label} onClick={() => onEmail(!email)} className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors motion-reduce:transition-none", email ? "bg-primary-dark" : "bg-input")}>
          <span className={cn("absolute top-0.5 size-6 rounded-full bg-white shadow transition-all motion-reduce:transition-none", email ? "left-[1.375rem]" : "left-0.5")} />
        </button>
      </div>
    </fieldset>
  )
}
