"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { writtenDate } from "@/lib/admin/format"
import type { ActionResult } from "./CancelPassDialog"

// The days a customer picks from, to set a day or change one: three open
// days inside their window, one tap each, then the answer in place. `onPick` is where
// the wiring phase books the visit; the prototype only swaps the words.

export interface PickDayButtonsProps {
  kind: "turn-on" | "blowout"
  days: string[]
  onPick?: (kind: "turn-on" | "blowout", dayIso: string) => ActionResult | Promise<ActionResult>
  /** start folded behind this button; for a customer whose day is already set and may want another */
  foldedLabel?: string
}

const weekdayOf = (iso: string) => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(`${iso}T12:00:00Z`).getUTCDay()]

export function PickDayButtons({ kind, days, onPick, foldedLabel }: PickDayButtonsProps) {
  const [picked, setPicked] = useState<string | null>(null)
  const [open, setOpen] = useState(!foldedLabel)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pick = async (day: string) => {
    setError(null)
    const failed = (r: ActionResult) => (r && r.ok === false ? (r.message ?? "We couldn't save that day. Try another, or call Ryan at (970) 692-7270.") : null)
    const run = onPick?.(kind, day)
    if (run && typeof (run as Promise<ActionResult>).then === "function") {
      setBusy(true)
      try {
        const message = failed(await run)
        if (message) return setError(message)
      } catch {
        return setError("We couldn't save that day. Try another, or call Ryan at (970) 692-7270.")
      } finally {
        setBusy(false)
      }
    } else {
      const message = failed(run as ActionResult)
      if (message) return setError(message)
    }
    setPicked(day)
  }
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
        {`You're set for ${weekdayOf(picked)}, ${writtenDate(picked)}. We'll text you the window the day before.`}
      </p>
    )
  }
  return (
    <div className="space-y-3">
      <div role="group" aria-label="Days to pick from" className="grid gap-3 sm:grid-cols-3">
        {days.map((day) => (
          <Button key={day} variant="outline" data-slot="pick-day" disabled={busy} className={cn("h-auto flex-col items-start gap-0.5 px-4 py-3 text-left")} onClick={() => pick(day)}>
            <span className="font-display text-xl leading-none">{weekdayOf(day)}</span>
            <span className="text-sm text-muted-foreground">{writtenDate(day)}</span>
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
