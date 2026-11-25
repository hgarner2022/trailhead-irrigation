"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"
import { optionClass, optionDetailClass } from "./option-styles"

// "Can we reach the controller and the water shut-off without you?" (Jobber asks the same as a required access confirmation): most visits need nobody home, so the answer decides
// whether the day step offers days with Ryan arriving on his own, or days for a customer who must be there. Two large native radios, so the arrow keys work; required, so an error
// can be shown under them as help. Controlled; pure props, client component.

export type Access = "yes" | "no"

const CHOICES: { value: Access; name: string; short: string; detail: string }[] = [
  { value: "yes", name: "Yes", short: "Yes", detail: "The controller and shut-off are reachable" },
  { value: "no", name: "No, I need to be there", short: "No, I'll be there", detail: "Pick a day you can be there" },
]

export interface AccessChoiceProps {
  value: Access | null
  onChange: (value: Access) => void
  /** what is missing, in words: "Tell us whether we can get to the system without you." */
  error?: string
  /** the booking form (Nov 22 2026): a shorter question over two plain choices, with no line under either */
  compact?: boolean
  className?: string
}

export function AccessChoice({ value, onChange, error, compact, className }: AccessChoiceProps) {
  const id = useId()
  return (
    <fieldset data-slot="access-choice" aria-describedby={error ? `${id}-error` : undefined} className={cn("min-w-0", className)}>
      <legend className={"type-heading text-navy"}>{compact ? "Can we reach the controller and shut-off without you?" : "Can we reach the controller and the water shut-off without you?"}</legend>
      <div className={cn("mt-3 grid gap-3 sm:grid-cols-2")}>
        {CHOICES.map((choice, i) => {
          const checked = value === choice.value
          return (
            <label key={choice.value} className="relative block">
              <input type="radio" name={`${id}-access`} value={choice.value} checked={checked} aria-invalid={(Boolean(error) && i === 0) || undefined} onChange={() => onChange(choice.value)} className="peer sr-only" />
              <span
                className={cn(optionClass({ selected: checked, error: Boolean(error), focus: "peer" }), "flex flex-col justify-center px-4 py-3 text-left", compact ? "min-h-14" : "min-h-20")}
              >
                <span className="type-option">{compact ? choice.short : choice.name}</span>
                {!compact && <span className={cn("mt-1.5 text-sm", optionDetailClass(checked))}>{choice.detail}</span>}
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
