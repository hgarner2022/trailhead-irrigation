"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// The strip under Place and Place all (docs/plans/2026-11-18-admin-holistic-design.md, 5.2): "Texting Andrea in 52 s. Undo". The text to the customer waits a minute, so a wrong
// pick costs nothing; Undo inside the minute sends nothing and the job goes back to Unscheduled. One strip per Place, so a second Place
// while the first counts down has its own. Marked as a live region, read once as it appears (a countdown that spoke every second would be
// noise, so the seconds are not announced). Pure render over the seconds the screen counts; client for the button.

export interface TextingStripProps {
  /** first names of the customers about to be texted, in order */
  names: string[]
  secondsLeft: number
  onUndo: () => void
  className?: string
}

/** "Andrea", "Andrea and Jim", "3 customers". */
export function textingWho(names: string[]): string {
  if (names.length <= 2) return names.join(" and ")
  return `${names.length} customers`
}

export function TextingStrip({ names, secondsLeft, onUndo, className }: TextingStripProps) {
  return (
    <div data-slot="texting-strip" role="status" className={cn("flex items-center gap-3 rounded-lg border border-border bg-stone px-3 py-1 text-sm text-foreground", className)}>
      <span className="min-w-0 flex-1">
        {`Texting ${textingWho(names)} in `}
        <span aria-hidden className="tabular-nums">{`${secondsLeft} s`}</span>
        <span className="sr-only">{`${secondsLeft} seconds`}</span>
        {"."}
      </span>
      <Button type="button" size="sm" variant="ghost" className="min-h-11 text-primary-dark hover:text-primary-deep" onClick={onUndo}>
        Undo
      </Button>
    </div>
  )
}
