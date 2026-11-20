"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

// A short question answered by tapping a chip: one of a few (radios: "Is there Wi-Fi at the controller?") or any of a few (checkboxes: "What do you want to improve?"). The booking form's
// service-specific details use it, so every choice of this size looks and behaves the same: native inputs (arrow keys and Space work), a 44px chip, the legend above, an optional hint under
// the chips and a problem written as help. Controlled; pure props, client component.

export interface ChoiceOption {
  value: string
  label: string
}

interface Common {
  legend: string
  options: readonly ChoiceOption[]
  hint?: string
  error?: string
  className?: string
}
export type ChoiceChipsProps = Common & ({ mode?: "one"; value: string | null; onChange: (value: string) => void } | { mode: "many"; value: readonly string[]; onChange: (value: string[]) => void })

export function ChoiceChips(props: ChoiceChipsProps) {
  const { legend, options, hint, error, className } = props
  const id = useId()
  const many = props.mode === "many"
  const chosen = (v: string) => (many ? (props.value as readonly string[]).includes(v) : props.value === v)
  const toggle = (v: string) => {
    if (props.mode === "many") {
      const now = props.value as readonly string[]
      props.onChange(now.includes(v) ? now.filter((x) => x !== v) : [...now, v])
    } else props.onChange(v)
  }
  return (
    <fieldset data-slot="choice-chips" aria-describedby={[hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined} className={cn("min-w-0", className)}>
      <legend className="font-display text-2xl leading-tight text-navy">{legend}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = chosen(o.value)
          return (
            <label key={o.value} className="relative block">
              <input type={many ? "checkbox" : "radio"} name={`${id}-choice`} value={o.value} checked={on} onChange={() => toggle(o.value)} className="peer sr-only" />
              <span className={cn("flex min-h-11 cursor-pointer items-center rounded-lg border px-4 text-base transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-2", on ? "border-navy bg-navy text-white" : "border-border bg-background text-navy hover:border-navy/40")}>{o.label}</span>
            </label>
          )
        })}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-2 text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  )
}
