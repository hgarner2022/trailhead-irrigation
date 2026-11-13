"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"
import type { TimingPreference } from "@/lib/admin/types"
import { TIMING_PREFERENCES, preferenceLabel, preferenceReason } from "@/lib/admin/format"

// The three timing choices for a turn-on or a blowout, Earlier, Recommended
// and Later, as large buttons with the customer's words under each and the
// one-line reason for the recommendation under the group. The checkout asks
// it at purchase; the pass page asks it again when the customer changes a
// preference before the day is set. No capacity sits behind any choice.

const CHOICE_NAMES: Record<TimingPreference, string> = { earlier: "Earlier", recommended: "Recommended", later: "Later" }
/** The only place the recommendation's detail is spelled out; everywhere else says Mid. */
const MID_MEANS: Record<"turn-on" | "blowout", string> = { "turn-on": "Mid May means the first two weeks of May.", blowout: "Mid October means the second week of October." }

export interface TimingChoiceProps {
  kind: "turn-on" | "blowout"
  /** the heading element that names the group, already on screen; or `label` when there is none to point at */
  labelledBy?: string
  label?: string
  value: TimingPreference
  onChange: (value: TimingPreference) => void
  /** the pressed button takes the step's focus (the checkout shell reads `data-autofocus`) */
  autofocus?: boolean
  className?: string
}

export function TimingChoice({ kind, labelledBy, label, value, onChange, autofocus, className }: TimingChoiceProps) {
  const id = useId()
  return (
    <div className={className}>
      <div role="group" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : label} aria-describedby={`${id}-reason`} className="grid gap-3 sm:grid-cols-3">
        {TIMING_PREFERENCES.map((preference) => {
          const pressed = value === preference
          return (
            <button
              key={preference}
              type="button"
              aria-pressed={pressed}
              data-slot="timing-choice"
              data-kind={kind}
              data-preference={preference}
              data-autofocus={(autofocus && pressed) || undefined}
              onClick={() => onChange(preference)}
              className={cn(
                "flex min-h-20 cursor-pointer flex-col items-start justify-center rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
                pressed ? "border-navy bg-navy text-white" : "border-border bg-background text-navy hover:border-navy/40",
              )}
            >
              <span className="font-display text-2xl leading-none">{CHOICE_NAMES[preference]}</span>
              <span className={cn("mt-1.5 text-sm", pressed ? "text-white/80" : "text-muted-foreground")}>{preferenceLabel(kind, preference)}</span>
            </button>
          )
        })}
      </div>
      <p id={`${id}-reason`} className="mt-3 text-base text-muted-foreground">
        {`${MID_MEANS[kind]} ${preferenceReason(kind)}`}
      </p>
    </div>
  )
}
