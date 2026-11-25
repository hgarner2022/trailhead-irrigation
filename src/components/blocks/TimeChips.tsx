"use client"

import { useId } from "react"
import { clock12, type StartOption } from "@/lib/booking/day-time"
import { cn } from "@/lib/utils"

// The one start-time chip style (Hannah, Nov 23 2026: the calendar and its times are one pattern, everywhere): a group of radio chips, 44px, the chosen one navy and settling in with one 160 ms scale
// (`settle`, base.css; off under prefers-reduced-motion). The booking form, Reschedule, the office's Move and New job, the Schedule dialog and Settings' day hours all draw their times with this block, so
// a time looks the same wherever it is chosen. `anyTime` puts "Any time" first, chosen while `value` is null (the office; a customer is always given a time). Native radios, so the arrow keys and Space
// work with no code. Controlled. Pure props, client component.

export interface TimeChipsProps {
  options: readonly StartOption[]
  /** "09:00", or null for Any time (only with `anyTime`) or nothing chosen */
  value: string | null
  onChange: (start: string | null) => void
  anyTime?: boolean
  /** names the group; drawn above the chips unless `hideLegend` */
  legend: string
  hideLegend?: boolean
  /** one line under the legend */
  hint?: string
  /** "sheet": three across, four from `sm`, as in a dialog; "page": up to six across */
  density?: "page" | "sheet"
  /** what is missing, when Continue was pressed with no time chosen: the chips are marked invalid and the message sits under them */
  error?: string
  className?: string
}

const CHIP = "flex min-h-11 min-w-0 cursor-pointer flex-col items-center justify-center rounded-lg border px-2 py-2 text-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-2"

export function TimeChips({ options, value, onChange, anyTime = false, legend, hideLegend = false, hint, density = "page", error, className }: TimeChipsProps) {
  const name = useId()
  return (
    <fieldset data-slot="time-chips" className={cn("min-w-0", className)}>
      <legend className={cn("text-base font-semibold text-foreground", hideLegend && "sr-only")}>{legend}</legend>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      <div className={cn("mt-3 grid grid-cols-3 gap-2", density === "sheet" ? "sm:grid-cols-4" : "sm:grid-cols-4 lg:grid-cols-6")}>
        {anyTime && (
          <label className="relative block">
            <input type="radio" name={name} checked={value === null} aria-invalid={Boolean(error) || undefined} onChange={() => onChange(null)} className="peer sr-only" />
            <span data-slot="time-chip" className={cn(CHIP, value === null ? "settle border-navy bg-navy text-white" : "border-border bg-background text-navy hover:border-navy/40")}>
              <span className="text-base font-semibold">Any time</span>
            </span>
          </label>
        )}
        {options.map((t) => {
          const checked = value === t.start
          return (
            <label key={t.start} className="relative block">
              <input type="radio" name={name} checked={checked} aria-invalid={Boolean(error) || undefined} onChange={() => onChange(t.start)} className="peer sr-only" />
              <span data-slot="time-chip" className={cn(CHIP, checked ? "settle border-navy bg-navy text-white" : "border-border bg-background text-navy hover:border-navy/40")}>
                <span className="text-base font-semibold tabular-nums">{clock12(t.start)}</span>
              </span>
            </label>
          )
        })}
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </fieldset>
  )
}
