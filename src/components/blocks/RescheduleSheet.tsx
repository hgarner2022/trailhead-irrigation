"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DAY_FAILED, longDay, shortDay } from "@/lib/portal/words"
import { cn } from "@/lib/utils"
import { DayTimePicker } from "./DayTimePicker"
import { TextRyan } from "./TextRyan"
import { clock12, dayAtTime, startDay, type DayTimeOffer, type DayTimePick } from "@/lib/booking/day-time"

// Reschedule (or Pick a day): up to five open days in time order, the first preselected, one button that names the day, and "None of these? Text Ryan"
// (docs/plans/2026-11-18-customer-portal-v2-design.md, section 4). It never offers a typed day; the server accepts only a day it offered. The answer
// stays in the sheet: "Moved to Thursday, April 30. We texted you the new day." `onPick` is the server action; `{ ok: false, message }` keeps the sheet
// open with the handler's own words. With no day open it says so and offers Text Ryan.

/** What a server action answers: `ok: false` keeps the sheet open with the message. */
export type SheetResult = { ok: boolean; message?: string } | void

export interface RescheduleSheetProps {
  /** "Spring turn-on" */
  service: string
  /** "412 Briggs Street" */
  address: string
  /** the day the visit has now; absent for a visit with no day yet ("Pick a day") */
  currentDay?: string | null
  /** the days `visits.areaDays` offers, in time order */
  days: string[]
  /** the `sms:` link for "None of these? Text Ryan" */
  textHref: string
  onPick?: (day: string) => SheetResult | Promise<SheetResult>
  /** with slots: the open days with their start times, and the action that takes the day and the start. The sheet then asks for a day and a time, as booking does. */
  offers?: readonly DayTimeOffer[]
  onPickTime?: (pick: { day: string; start: string }) => SheetResult | Promise<SheetResult>
  /** the start the visit has now, "10:30", so the heading can say what is being moved */
  currentStart?: string | null
  className?: string
}

export function RescheduleSheet({ service, address, currentDay, days, textHref, onPick, offers, onPickTime, currentStart, className }: RescheduleSheetProps) {
  const timed = offers !== undefined
  const [chosen, setChosen] = useState<string | undefined>(days[0])
  const [slot, setSlot] = useState<DayTimePick>({ day: offers ? startDay(offers) : null, start: null })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  // read once: after the move `currentDay` is set, but a visit that had no day is still "set", not "moved"
  const [moving] = useState(Boolean(currentDay))
  const router = useRouter()
  const title = `${moving ? "Pick a new day" : "Pick a day"}${timed ? " and time" : ""}`

  const submit = async () => {
    if (timed ? !(slot.day && slot.start) : !chosen) return
    setError(null)
    setBusy(true)
    try {
      const result = timed ? await onPickTime?.({ day: slot.day!, start: slot.start! }) : await onPick?.(chosen!)
      if (result && result.ok === false) return setError(result.message ?? DAY_FAILED)
      setDone(timed ? dayAtTime(slot.day!, slot.start!) : longDay(chosen!))
    } catch {
      setError(DAY_FAILED)
    } finally {
      setBusy(false)
    }
  }

  return (
    // Once it said Moved, closing it refreshes the page so the new day shows behind it.
    <Dialog onOpenChange={(open) => { if (!open && done) router.refresh() }}>
      <DialogTrigger asChild>
        <Button className={className}>{moving ? "Reschedule" : "Pick a day"}</Button>
      </DialogTrigger>
      <DialogContent data-slot="reschedule-sheet" data-done={done !== null} className="max-h-[92svh] overflow-y-auto">
        {done ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-navy">{moving ? `Moved to ${done}.` : `You're set for ${done}.`}</DialogTitle>
              <DialogDescription className="text-base">{timed ? "We texted you the new time." : moving ? "We texted you the new day." : "We texted you the day. We'll text your window the day before."}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Done</Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-navy">{title}</DialogTitle>
              <DialogDescription className="text-base">{`${service}, ${address}`}</DialogDescription>
            </DialogHeader>
            {(timed ? offers.length === 0 : days.length === 0) ? (
              <div className="space-y-3">
                <p data-slot="no-open-days" className="text-base text-foreground">
                  No open days left in this window. Text Ryan.
                </p>
                <TextRyan textHref={textHref} why={false} />
              </div>
            ) : (
              <>
                {timed ? (
                  <DayTimePicker offers={offers} value={slot} onChange={setSlot} legend="Open days" length={currentStart ? `Your own time, ${clock12(currentStart)}, is offered again.` : undefined} />
                ) : (
                <fieldset className="space-y-2">
                  <legend className="sr-only">Open days</legend>
                  {days.map((day) => (
                    <label key={day} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-base", chosen === day ? "border-primary-dark bg-primary/5" : "border-border")}>
                      <input type="radio" name="day" value={day} checked={chosen === day} onChange={() => setChosen(day)} className="size-4 accent-primary-dark" />
                      <span className="font-semibold text-foreground">{shortDay(day)}</span>
                    </label>
                  ))}
                </fieldset>
                )}
                <p className="text-base text-muted-foreground">
                  {"None of these? "}
                  <a href={textHref} className="font-semibold text-primary-deep underline underline-offset-2">
                    Text Ryan
                  </a>
                </p>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {`${error} Try again, or text Ryan.`}
                  </p>
                )}
                <DialogFooter className="gap-2 sm:flex-col sm:space-x-0">
                  <Button onClick={submit} disabled={busy || (timed ? !slot.start : !chosen)}>
                    {timed ? (slot.day && slot.start ? `${moving ? "Move it to" : "Book"} ${dayAtTime(slot.day, slot.start)}` : "Tap a time") : chosen ? (moving ? `Move it to ${longDayShort(chosen)}` : `Book ${longDayShort(chosen)}`) : "Pick a day"}
                  </Button>
                  <DialogClose asChild>
                    <Button variant="ghost">{moving && currentDay ? `Keep ${longDay(currentDay)}` : "Not now"}</Button>
                  </DialogClose>
                </DialogFooter>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** "Thursday, Apr 30" for the button: the weekday in full, then the short date. */
const longDayShort = (day: string) => longDay(day).replace(/^(\w+), (\w+) (\d+)$/, (_m, w: string, month: string, d: string) => `${w}, ${month.slice(0, 3)} ${d}`)
