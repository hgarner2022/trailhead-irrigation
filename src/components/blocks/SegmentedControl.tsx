"use client"

import { useRef, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"

// One choice of a few that changes the view, not the data: Week, Day, List; By job, By person (docs/DESIGN.md, "The recipe"). A radio
// group drawn as a row of buttons, adapted from the reference library's SegmentedControl onto the app's tokens (no sliding pill):
// the chosen one is navy, the others quiet, each 44px tall, and the arrow keys move the choice. Controlled; pure props.

export interface SegmentedOption {
  value: string
  label: string
}

export interface SegmentedControlProps {
  options: readonly SegmentedOption[]
  value: string
  onChange: (value: string) => void
  /** what the group chooses, read aloud: "View" */
  label: string
  className?: string
}

export function SegmentedControl({ options, value, onChange, label, className }: SegmentedControlProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const move = (event: KeyboardEvent<HTMLButtonElement>, from: number) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0
    if (!step || options.length === 0) return
    event.preventDefault()
    const next = (from + step + options.length) % options.length
    onChange(options[next]!.value)
    refs.current[next]?.focus()
  }
  if (options.length === 0) return null
  return (
    <div role="radiogroup" aria-label={label} data-slot="segmented-control" className={cn("inline-flex rounded-lg border border-border bg-background p-0.5", className)}>
      {options.map((o, i) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => move(e, i)}
            className={cn(
              "min-h-11 min-w-16 cursor-pointer rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              on ? "bg-navy text-white" : "text-muted-foreground hover:bg-stone hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
