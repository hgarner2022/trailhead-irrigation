"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { writtenDate } from "@/lib/admin/format"

// The days a customer who must be home picks from: three area days inside
// their window, one tap each, then the answer in place. `onPick` is where
// the wiring phase books the visit; the prototype only swaps the words.

export interface PickDayButtonsProps {
  kind: "turn-on" | "blowout"
  days: string[]
  onPick?: (kind: "turn-on" | "blowout", dayIso: string) => void
  /** start folded behind this button; for a customer whose day is already set and may want another */
  foldedLabel?: string
}

const weekdayOf = (iso: string) => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(`${iso}T12:00:00Z`).getUTCDay()]

export function PickDayButtons({ kind, days, onPick, foldedLabel }: PickDayButtonsProps) {
  const [picked, setPicked] = useState<string | null>(null)
  const [open, setOpen] = useState(!foldedLabel)
  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        {foldedLabel}
      </Button>
    )
  }
  if (picked) {
    return (
      <p data-slot="pick-day-done" className="text-base text-foreground">
        {`${weekdayOf(picked)}, ${writtenDate(picked)} it is. We'll text you the window the day before.`}
      </p>
    )
  }
  return (
    <div role="group" aria-label="Days to pick from" className="grid gap-3 sm:grid-cols-3">
      {days.map((day) => (
        <Button
          key={day}
          variant="outline"
          data-slot="pick-day"
          className={cn("h-auto flex-col items-start gap-0.5 px-4 py-3 text-left")}
          onClick={() => {
            setPicked(day)
            onPick?.(kind, day)
          }}
        >
          <span className="font-display text-xl leading-none">{weekdayOf(day)}</span>
          <span className="text-sm text-muted-foreground">{writtenDate(day)}</span>
        </Button>
      ))}
    </div>
  )
}
