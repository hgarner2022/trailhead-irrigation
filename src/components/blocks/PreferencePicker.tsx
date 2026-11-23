"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"
import type { TimingPreference } from "@/lib/admin/types"
import { TIMING_CHOICES, TIMING_LABEL, TIMING_TITLE, timingMonth, type TimingKind } from "@/lib/portal/preference-words"

// The customer's timing choice for one visit kind: Early season, Our recommended (the default, the middle of the window) and Late season, each with its month under it. Native radios, so the
// arrow keys and Space work with no code and a screen reader reads the group by the visit's name. The same block sits on Details › Preferences, in the dialog the Season Pass tab and the
// banner open, and on the one-visit page a text's link opens. Controlled by its parent; nothing saves here. 44px tall targets, 16px body text.

export interface PreferencePickerProps {
  kind: TimingKind
  value: TimingPreference
  onChange: (value: TimingPreference) => void
  /** shows the visit's name as a visible legend (Details); the dialog already names it in its title */
  legend?: boolean
  className?: string
}

export function PreferencePicker({ kind, value, onChange, legend = false, className }: PreferencePickerProps) {
  const name = useId()
  return (
    <fieldset data-slot="preference-picker" data-kind={kind} className={cn("min-w-0 space-y-2", className)}>
      <legend className={legend ? "mb-2 text-base font-semibold text-foreground" : "sr-only"}>{TIMING_TITLE[kind]}</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {TIMING_CHOICES.map((choice) => {
          const checked = value === choice
          return (
            <label
              key={choice}
              data-preference={choice}
              className={cn(
                "flex min-h-14 cursor-pointer flex-col justify-center rounded-lg border px-4 py-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50 has-[:focus-visible]:ring-offset-2",
                checked ? "border-navy bg-navy text-white" : "border-border bg-background text-navy hover:border-navy/40",
              )}
            >
              <input type="radio" name={name} value={choice} checked={checked} onChange={() => onChange(choice)} className="sr-only" />
              <span className="text-base font-semibold leading-tight">{TIMING_LABEL[choice]}</span>
              <span className={cn("text-sm", checked ? "text-white/80" : "text-muted-foreground")}>{timingMonth(kind, choice)}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
