"use client"

import { MAX_ZONES, MIN_ZONES } from "@/lib/season-pass"
import { cn } from "@/lib/utils"
import { optionClass } from "./option-styles"

// How many zones the system has (the booking form's service details, the Season Pass checkout's zones step): one chip per count from six up, "Up to 6" the first. The count decides the price
// and the visit's length, so the form shows the price right under it. A row of 48px buttons that wraps, each pressed state read aloud. Controlled; pure props, client component.

export interface ZoneChipsProps {
  value: number
  onChange: (zones: number) => void
  min?: number
  max?: number
  className?: string
}

export function ZoneChips({ value, onChange, min = MIN_ZONES, max = MAX_ZONES, className }: ZoneChipsProps) {
  const counts = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  return (
    <div role="group" aria-label="Zones" data-slot="zone-chips" className={cn("flex flex-wrap gap-2", className)}>
      {counts.map((zones) => {
        const pressed = value === zones
        return (
          <button
            key={zones}
            type="button"
            aria-pressed={pressed}
            aria-label={`${zones === min ? "Up to " : ""}${zones} zones`}
            onClick={() => onChange(zones)}
            className={cn(optionClass({ selected: pressed }), "size-12 font-display text-xl tabular-nums")}
          >
            {zones}
          </button>
        )
      })}
    </div>
  )
}
