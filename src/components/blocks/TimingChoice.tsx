"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"
import type { TimingPreference } from "@/lib/admin/types"
import { TIMING_PREFERENCES, preferenceLabel, preferenceReason } from "@/lib/admin/format"
import { TIMING_LABEL } from "@/lib/portal/preference-words"

// The three timing choices for a turn-on or a blowout, Earlier, Recommended
// and Later, as large buttons with the customer's words under each and the
// one-line reason for the recommendation under the group. The checkout asks
// it at purchase; the pass page asks it again when the customer changes a
// preference before the day is set. No capacity sits behind any choice.

const CHOICE_NAMES: Record<TimingPreference, string> = { earlier: "Earlier", recommended: "Recommended", later: "Later" }
/** The booking form's names for the same three answers, with the window's real dates under each. */
const SHORT_NAMES: Record<TimingPreference, string> = { earlier: "Early", recommended: "Mid", later: "Late" }
/** The only place the recommendation's detail is spelled out; everywhere else says Mid. */
const MID_MEANS: Record<"turn-on" | "blowout", string> = { "turn-on": "Mid May means the first two weeks of May.", blowout: "Mid October means the second week of October." }

/** The booking form's names for the three answers: names only, no dates and no month (Hannah, Nov 22 2026). "Our recommended" is the stored "recommended", which the rest of the app calls Mid. */
export const PLAIN_NAMES: Record<TimingPreference, string> = TIMING_LABEL
/** The plain names in the order the booking form shows them: the preselected one first. */
export const PLAIN_ORDER: readonly TimingPreference[] = ["recommended", "earlier", "later"]

export interface TimingChoiceProps {
  kind: "turn-on" | "blowout"
  /** the heading element that names the group, already on screen; or `label` when there is none to point at */
  labelledBy?: string
  label?: string
  value: TimingPreference
  onChange: (value: TimingPreference) => void
  /** the booking form: the names Early, Mid and Late with each one's dates under it ("Oct 1 to Oct 10"), in place of the month and the "Mid means" line; the booking form says why under its own question, so no reason line follows */
  ranges?: Record<TimingPreference, string>
  /** the booking form: the account's own words, Early season, Our recommended and Late season, each with its month under it ("Early May"), read from `preferenceLabel` like the account's Preferences card */
  plain?: boolean
  /** the pressed button takes the step's focus (the checkout shell reads `data-autofocus`) */
  autofocus?: boolean
  className?: string
}

export function TimingChoice({ kind, labelledBy, label, value, onChange, ranges, plain, autofocus, className }: TimingChoiceProps) {
  const id = useId()
  return (
    <div className={className}>
      <div role="group" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : label} aria-describedby={ranges || plain ? undefined : `${id}-reason`} className="grid gap-3 sm:grid-cols-3">
        {(plain ? PLAIN_ORDER : TIMING_PREFERENCES).map((preference) => {
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
              <span className="font-display text-2xl leading-none">{plain ? PLAIN_NAMES[preference] : (ranges ? SHORT_NAMES : CHOICE_NAMES)[preference]}</span>
              <span className={cn("mt-1.5 text-sm", pressed ? "text-white/80" : "text-muted-foreground")}>{ranges ? ranges[preference] : preferenceLabel(kind, preference)}</span>
            </button>
          )
        })}
      </div>
      {!ranges && !plain && (
        <p id={`${id}-reason`} className="mt-3 text-base text-muted-foreground">
          {`${MID_MEANS[kind]} ${preferenceReason(kind)}`}
        </p>
      )}
    </div>
  )
}
