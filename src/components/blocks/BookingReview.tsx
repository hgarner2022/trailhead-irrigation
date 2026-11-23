"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// The review step of the booking form. One row per answer (service, address, day, contact, photos, the price), each with its own Change link back
// to the step that asked, and under the rows one plain sentence that says exactly what happens when the button is pressed. Rows with nothing to say are left out by the screen. A white
// card with hairlines between rows, label small over the value, the Change link a 44px target at the right. Pure props, client component.

export interface ReviewRow {
  label: string
  /** the answer; a string, or several lines as an array */
  value: ReactNode | readonly string[]
  /** goes back to the step; omit for a row that cannot be changed here */
  onChange?: () => void
}

export interface BookingReviewProps {
  rows: readonly ReviewRow[]
  /** what happens next, under the rows: "We'll text you a confirmation to (970) 555-0123 and email a receipt when it's done." */
  happens: string
  className?: string
}

export function BookingReview({ rows, happens, className }: BookingReviewProps) {
  return (
    <div data-slot="booking-review" className={cn("space-y-5", className)}>
      <ul className="divide-y divide-border rounded-lg border border-border bg-background">
        {rows.map((row) => {
          const lines = Array.isArray(row.value) ? (row.value as readonly string[]) : null
          return (
            <li key={row.label} data-slot="review-row" className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{row.label}</p>
                <div className="mt-0.5 text-base text-foreground">{lines ? lines.map((line) => <span key={line} className="block">{line}</span>) : (row.value as ReactNode)}</div>
              </div>
              {row.onChange && (
                <button type="button" onClick={row.onChange} aria-label={`Change ${row.label.toLowerCase()}`} className="-my-1 inline-flex min-h-11 shrink-0 cursor-pointer items-center text-sm font-semibold text-primary-deep underline underline-offset-2">
                  Change
                </button>
              )}
            </li>
          )
        })}
      </ul>
      <p data-slot="review-happens" className="text-base text-foreground">
        {happens}
      </p>
    </div>
  )
}
