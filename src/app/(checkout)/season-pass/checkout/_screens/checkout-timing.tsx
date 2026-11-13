"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"
import type { TimingPreference } from "@/lib/admin/types"
import { TIMING_PREFERENCES, preferenceLabel, preferenceReason } from "@/lib/admin/format"
import type { StepProps } from "./checkout-steps"

// The timing step: two questions on one screen, the spring turn-on under the
// step's own question and the fall blowout under a second heading, each as
// three large choice buttons with Trailhead's recommendation preselected and
// the one-line reason for it under the group, with what "Mid" means. There is
// no capacity behind any choice; Ryan places the day inside the window the
// customer prefers. The July inspection asks nothing.

const CHOICE_NAMES: Record<TimingPreference, string> = { earlier: "Earlier", recommended: "Recommended", later: "Later" }
/** The only place the recommendation's detail is spelled out; everywhere else says Mid. */
const MID_MEANS: Record<"turn-on" | "blowout", string> = { "turn-on": "Mid May is the first and second week.", blowout: "Mid October is the second week." }

interface GroupProps {
  kind: "turn-on" | "blowout"
  /** the heading element that names the group, already on screen */
  labelledBy: string
  value: TimingPreference
  onChange: (value: TimingPreference) => void
  /** the pressed button takes the step's focus */
  autofocus?: boolean
}

function PreferenceGroup({ kind, labelledBy, value, onChange, autofocus }: GroupProps) {
  const id = useId()
  return (
    <div>
      <div role="group" aria-labelledby={labelledBy} aria-describedby={`${id}-reason`} className="grid gap-3 sm:grid-cols-3">
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

/** `questionId` is the step's h1, which asks about the turn-on; the blowout gets its own heading here. */
export function TimingStep({ state, set, questionId }: StepProps & { questionId: string }) {
  const id = useId()
  return (
    <>
      <PreferenceGroup kind="turn-on" labelledBy={questionId} value={state.turnOnPreference} onChange={(v) => set("turnOnPreference", v)} autofocus />
      <h2 id={`${id}-blowout`} className="mt-10 font-display text-3xl leading-[1.05] text-navy lg:text-4xl">
        And your fall blowout?
      </h2>
      <div className="mt-6">
        <PreferenceGroup kind="blowout" labelledBy={`${id}-blowout`} value={state.blowoutPreference} onChange={(v) => set("blowoutPreference", v)} />
      </div>
      <p className="mt-6 text-base text-muted-foreground">The July inspection needs no choice. Ryan sets each day inside the window you prefer.</p>
    </>
  )
}
