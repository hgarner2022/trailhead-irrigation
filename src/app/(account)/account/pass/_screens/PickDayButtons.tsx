"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DayCalendar } from "@/components/blocks/DayCalendar"
import { writtenDate } from "@/lib/admin/format"
import type { ActionResult } from "./CancelPassDialog"

// The days a customer picks from, to set a day or change one: the open days inside their window on the one calendar (`DayCalendar`, days only, the soonest chosen and marked, the visit's own day marked
// "Your day"), one button that names the day, then the answer in place. `onPick` is where the wiring phase books the visit; the prototype only swaps the words.

export interface PickDayButtonsProps {
  /** what the visit is, handed back to `onPick`: the pass page's turn-on or blowout, or any visit the account page moves */
  kind: string
  days: string[]
  onPick?: (kind: string, dayIso: string) => ActionResult | Promise<ActionResult>
  /** start folded behind this button; for a customer whose day is already set and may want another */
  foldedLabel?: string
  /** the day the visit has now: once another is picked it is shown as gone, and the answer says "Moved to" */
  previousDay?: string
  /** names the folded button for a screen reader when a list has one per visit: "Change my day, Spring turn-on" */
  foldedAria?: string
}

const weekdayOf = (iso: string) => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(`${iso}T12:00:00Z`).getUTCDay()]

export function PickDayButtons({ kind, days, onPick, foldedLabel, previousDay, foldedAria }: PickDayButtonsProps) {
  const [picked, setPicked] = useState<string | null>(null)
  const [held, setHeld] = useState<string | null>([...days].sort()[0] ?? null)
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
  if (days.length === 0) {
    return (
      <p data-slot="no-days" className="text-base text-muted-foreground">
        {"We can't offer a new day online right now. Call or text Ryan at "}
        <a href="tel:9706927270" className="font-semibold text-primary-deep underline underline-offset-2">
          (970) 692-7270
        </a>
        .
      </p>
    )
  }
  if (!open) {
    return (
      <Button variant="outline" aria-label={foldedAria} onClick={() => setOpen(true)}>
        {foldedLabel}
      </Button>
    )
  }
  if (picked) {
    return (
      <div data-slot="pick-day-done" className="space-y-1 text-base text-foreground">
        {previousDay && (
          <p className="text-sm text-muted-foreground">
            <s>{`${weekdayOf(previousDay)}, ${writtenDate(previousDay)}`}</s>
          </p>
        )}
        <p>{previousDay ? `Moved to ${weekdayOf(picked)}, ${writtenDate(picked)}. We texted you the new date.` : `You're set for ${weekdayOf(picked)}, ${writtenDate(picked)}. We'll text you the time the day before.`}</p>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <DayCalendar offers={days.map((day) => ({ day, times: [] }))} value={{ day: held, start: null }} onChange={(next) => setHeld(next.day)} timed={false} current={previousDay ?? null} density="sheet" headingLevel={3} legend="Days to pick from" />
      <Button className="min-h-11" disabled={busy || !held} onClick={() => held && pick(held)}>
        {held ? `${previousDay ? "Move it to" : "Book"} ${weekdayOf(held)}, ${writtenDate(held)}` : "Pick a day"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
