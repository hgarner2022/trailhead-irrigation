"use client"

import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FormRow } from "@/components/blocks/FormRow"
import { DAYS_FULL, NONE_FIT, clock12, type DayTimeOffer, type DayTimePick } from "@/lib/booking/day-time"
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/nav"
import { longDay } from "@/lib/portal/words"
import { cn } from "@/lib/utils"
import { RecommendedMark, isRecommended, recommendedChip, type RecommendedLook } from "./RecommendedMark"

// The one day-and-time question (docs/plans/2026-11-18-scheduling-engine-design.md section 4.4): up to three day cards with the best one selected, "Show more days" for up to five,
// then only the selected day's open start times as chips. The best time is marked "Best fit" and never selected, so Continue stays off until a time is tapped. The booking flow,
// the Season Pass days (one picker per visit) and the Reschedule sheet all use this block. Native radios, so the arrow keys and Space work with no code. Controlled: the screen holds
// the pick. With no day open it says the days are full and the job will be made for a call. Pure props, client component.

export interface DayTimePickerProps {
  offers: readonly DayTimeOffer[]
  value: DayTimePick
  onChange: (next: DayTimePick) => void
  /** names the days group for a screen reader ("Pick your day", "Your spring turn-on") */
  legend: string
  /** the service's length in words, over the times: "Start times for a 2 hour visit" */
  length?: string
  /** days shown before "Show more days"; default 3 */
  shown?: number
  /** "None of these work? Tell us when" opens a box; its text and setter. Omit both to leave the link out. */
  note?: string
  onNote?: (text: string) => void
  /** times shown before "More times"; default 6 */
  timesShown?: number
  /** the one start time to mark (HH:MM); with `recommendedDay` only that day's button carries it. The mark never says why (docs/plans/2026-11-25-scheduler-design.md, 7.12) */
  recommendedStart?: string | null
  recommendedDay?: string | null
  /** which of the three candidate looks to draw until the owner picks one; A by default */
  recommendedLook?: RecommendedLook
  className?: string
}

const CARD = "flex min-h-20 cursor-pointer flex-col justify-center rounded-lg border px-4 py-3 text-left transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-2"
const CHIP = "flex min-h-11 min-w-0 cursor-pointer flex-col items-center justify-center rounded-lg border px-2 py-2 text-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-2"
const LINK = "inline-flex min-h-11 cursor-pointer items-center font-semibold text-primary-deep underline underline-offset-2 hover:text-primary-dark"

export function DayTimePicker({ offers, value, onChange, legend, length, shown = 3, note = "", onNote, timesShown = 6, recommendedStart, recommendedDay, recommendedLook = "A", className }: DayTimePickerProps) {
  const id = useId()
  const [more, setMore] = useState(() => offers.findIndex((o) => o.day === value.day) >= shown)
  const [moreTimes, setMoreTimes] = useState(false)
  const [noneOpen, setNoneOpen] = useState(Boolean(note))
  if (offers.length === 0)
    return (
      <div data-slot="day-time-picker" data-state="full" className={cn("space-y-3", className)}>
        <p role="status" className="text-base text-foreground">
          {DAYS_FULL}
        </p>
        {onNote && (
          <FormRow label="When would suit you?" hint="Optional.">
            <Textarea value={note} onChange={(e) => onNote(e.target.value)} placeholder="Any weekday morning in May" className="min-h-24 text-base" />
          </FormRow>
        )}
        <p className="text-base text-muted-foreground">
          {"Or call Ryan at "}
          <a href={PHONE_TEL} className={LINK}>
            {PHONE_DISPLAY}
          </a>
          .
        </p>
      </div>
    )
  const days = more ? offers : offers.slice(0, shown)
  const current = offers.find((o) => o.day === value.day) ?? null
  const times = current?.times ?? []
  const visible = moreTimes ? times : times.slice(0, timesShown)
  return (
    <div data-slot="day-time-picker" className={cn("space-y-8", className)}>
      <fieldset className="min-w-0">
        <legend className="sr-only">{legend}</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {days.map((offer, i) => {
            const checked = value.day === offer.day
            return (
              <label key={offer.day} className="relative block">
                <input
                  type="radio"
                  name={`${id}-day`}
                  checked={checked}
                  data-autofocus={(checked && i === 0) || undefined}
                  onChange={() => onChange({ day: offer.day, start: checked ? value.start : null })}
                  className="peer sr-only"
                />
                <span data-slot="day-card" data-best={offer.best || undefined} className={cn(CARD, checked ? "border-navy bg-navy text-white" : "border-border bg-background text-navy hover:border-navy/40")}>
                  <span className="font-display text-2xl leading-none">{longDay(offer.day)}</span>
                  {offer.note && <span className={cn("mt-1.5 text-sm", checked ? "text-white/85" : "text-muted-foreground")}>{offer.note}</span>}
                </span>
              </label>
            )
          })}
        </div>
        {!more && offers.length > shown && (
          <button type="button" onClick={() => setMore(true)} className={cn(LINK, "mt-1")}>
            Show more days
          </button>
        )}
      </fieldset>

      {current && (
        <fieldset key={current.day} data-slot="time-chips" className="min-w-0">
          <legend className="text-base font-semibold text-foreground">{`Start times on ${longDay(current.day)}`}</legend>
          {length && <p className="mt-1 text-sm text-muted-foreground">{length}</p>}
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {visible.map((t) => {
              const checked = value.start === t.start
              const marked = isRecommended(t.start, current.day, recommendedStart, recommendedDay)
              return (
                <label key={t.start} className="relative block">
                  <input type="radio" name={`${id}-time`} checked={checked} onChange={() => onChange({ day: current.day, start: t.start })} className="peer sr-only" />
                  <span data-slot="time-chip" data-best={t.best || undefined} data-recommended={marked || undefined} className={cn(CHIP, checked ? "border-navy bg-navy text-white" : "border-border bg-background text-navy hover:border-navy/40", marked && recommendedChip(recommendedLook, checked))}>
                    {marked && <RecommendedMark look={recommendedLook} position="before" checked={checked} />}
                    <span className="text-base font-semibold tabular-nums">{clock12(t.start)}</span>
                    {marked && <RecommendedMark look={recommendedLook} position="after" checked={checked} />}
                    {t.best && <span className={cn("text-xs font-semibold", checked ? "text-white/85" : "text-primary-deep")}>Best fit</span>}
                  </span>
                </label>
              )
            })}
          </div>
          {!moreTimes && times.length > timesShown && (
            <button type="button" onClick={() => setMoreTimes(true)} className={cn(LINK, "mt-1")}>
              More times
            </button>
          )}
          {times.length === 0 && <p className="mt-3 text-base text-muted-foreground">No times are left on this day. Pick another day.</p>}
        </fieldset>
      )}

      {onNote && (
        <div className="space-y-3">
          {!noneOpen && (
            <Button type="button" variant="ghost" className="h-auto min-h-11 px-0 font-semibold text-primary-deep underline underline-offset-2 hover:bg-transparent" onClick={() => setNoneOpen(true)}>
              {NONE_FIT}
            </Button>
          )}
          {noneOpen && (
            <FormRow label="When would suit you?" hint="Ryan reads this and texts you a day and time.">
              <Textarea value={note} onChange={(e) => onNote(e.target.value)} placeholder="Any weekday morning in May" className="min-h-24 text-base" />
            </FormRow>
          )}
        </div>
      )}
    </div>
  )
}

/** Whether a pick can pass: a day and a tapped time, or (with no offers) nothing to wait for. */
export const pickComplete = (offers: readonly DayTimeOffer[], pick: DayTimePick): boolean => offers.length === 0 || (pick.day !== null && pick.start !== null)
