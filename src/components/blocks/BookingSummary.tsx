"use client"

import { cn } from "@/lib/utils"

// The one line over every step after the first (docs/plans/2026-11-18-online-booking-design.md section 7): what has been chosen so far, "Sprinkler repair, Erie, Tue Apr 20 at 10:30 am",
// each part a Change link that goes back to its step. On a laptop it is the same line, not a side panel. Pure props.

export interface SummaryPart {
  label: string
  /** the step to go back to; omit for a part that cannot be changed from here */
  onChange?: () => void
  /** names the Change link for a screen reader: "service", "address" */
  what?: string
}

export function BookingSummary({ parts, className }: { parts: readonly SummaryPart[]; className?: string }) {
  if (parts.length === 0) return null
  return (
    <p data-slot="booking-summary" className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0 text-base text-muted-foreground", className)}>
      {parts.map((p, i) => (
        <span key={`${p.label}-${i}`} className="inline-flex items-baseline gap-1">
          <span className="text-foreground">{p.label}</span>
          {p.onChange && (
            <button type="button" onClick={p.onChange} aria-label={`Change ${p.what ?? p.label}`} className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary-deep underline underline-offset-2">
              Change
            </button>
          )}
          {i < parts.length - 1 && <span aria-hidden>,</span>}
        </span>
      ))}
    </p>
  )
}
