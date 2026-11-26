"use client"

import { useRef, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// One choice of a few that changes the view, not the data: Week, Day, List; By job, By person (docs/DESIGN.md, "The recipe"). A radio
// group drawn as a row of buttons, adapted from the reference library's SegmentedControl onto the app's tokens (no sliding pill):
// the chosen one is navy, the others quiet, each 44px tall, and the arrow keys move the choice (past a greyed option, which carries its reason in a tooltip). Controlled; pure props.

export interface SegmentedOption {
  value: string
  label: string
  /** greyed and not choosable; `reason` is said in a tooltip and read aloud ("No email on file") */
  disabled?: boolean
  reason?: string
}

export interface SegmentedControlProps {
  options: readonly SegmentedOption[]
  value: string
  onChange: (value: string) => void
  /** what the group chooses, read aloud: "View" */
  label: string
  /** on a phone the options shrink to their words so a toolbar row fits */
  dense?: boolean
  className?: string
}

export function SegmentedControl({ options, value, onChange, label, dense, className }: SegmentedControlProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const move = (event: KeyboardEvent<HTMLButtonElement>, from: number) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0
    if (!step || options.length === 0) return
    event.preventDefault()
    let next = (from + step + options.length) % options.length
    for (let n = 0; n < options.length && options[next]!.disabled; n++) next = (next + step + options.length) % options.length
    if (options[next]!.disabled) return
    onChange(options[next]!.value)
    refs.current[next]?.focus()
  }
  if (options.length === 0) return null
  return (
    <div role="radiogroup" aria-label={label} data-slot="segmented-control" className={cn("inline-flex rounded-lg border border-border bg-background p-0.5", className)}>
      {options.map((o, i) => {
        const on = o.value === value
        const button = (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-disabled={o.disabled || undefined}
            aria-description={o.disabled ? o.reason : undefined}
            tabIndex={on ? 0 : -1}
            onClick={() => !o.disabled && onChange(o.value)}
            onKeyDown={(e) => move(e, i)}
            className={cn(
              "min-h-11 min-w-16 rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              dense && "max-md:min-w-0 max-md:flex-1 max-md:px-2",
              o.disabled ? "cursor-not-allowed text-muted-foreground opacity-50" : "cursor-pointer",
              on ? "bg-navy text-white" : o.disabled ? "" : "text-muted-foreground hover:bg-stone hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        )
        if (!o.disabled || !o.reason) return button
        return (
          <TooltipProvider key={o.value}>
            <Tooltip>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent>{o.reason}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      })}
    </div>
  )
}
