"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

// "Can we reach the controller and the water shut-off without you?" (Jobber asks the same as a required access confirmation): most visits need nobody home, so the answer decides
// whether the day step offers days with Ryan arriving on his own, or days for a customer who must be there. Two large native radios, so the arrow keys work; required, so an error
// can be shown under them as help. Controlled; pure props, client component.

export type Access = "yes" | "no"

const CHOICES: { value: Access; name: string; detail: string }[] = [
  { value: "yes", name: "Yes", detail: "The controller and shut-off are reachable" },
  { value: "no", name: "No, I need to be there", detail: "We'll offer days that suit you" },
]

export interface AccessChoiceProps {
  value: Access | null
  onChange: (value: Access) => void
  /** what is missing, in words: "Tell us whether we can get to the system without you." */
  error?: string
  className?: string
}

export function AccessChoice({ value, onChange, error, className }: AccessChoiceProps) {
  const id = useId()
  return (
    <fieldset data-slot="access-choice" aria-describedby={error ? `${id}-error` : undefined} className={cn("min-w-0", className)}>
      <legend className="font-display text-2xl leading-tight text-navy">Can we reach the controller and the water shut-off without you?</legend>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {CHOICES.map((choice, i) => {
          const checked = value === choice.value
          return (
            <label key={choice.value} className="relative block">
              <input type="radio" name={`${id}-access`} value={choice.value} checked={checked} aria-invalid={(Boolean(error) && i === 0) || undefined} onChange={() => onChange(choice.value)} className="peer sr-only" />
              <span
                className={cn(
                  "flex min-h-20 cursor-pointer flex-col justify-center rounded-lg border px-4 py-3 text-left transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-2",
                  checked ? "border-navy bg-navy text-white" : error ? "border-destructive bg-background text-navy" : "border-border bg-background text-navy hover:border-navy/40",
                )}
              >
                <span className="font-display text-2xl leading-none">{choice.name}</span>
                <span className={cn("mt-1.5 text-sm", checked ? "text-white/85" : "text-muted-foreground")}>{choice.detail}</span>
              </span>
            </label>
          )
        })}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  )
}
