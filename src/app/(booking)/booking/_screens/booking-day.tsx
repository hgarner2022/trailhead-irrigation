"use client"

import { DayTimePicker } from "@/components/blocks/DayTimePicker"
import { type DayTimeOffer, type DayTimePick } from "@/lib/booking/day-time"

// The day-and-time step for one visit or several: the same DayTimePicker per visit, with a heading over each group when a Season Pass has two ("Your spring turn-on", "Your fall blowout").
// The booking flow's step 4 and the Season Pass checkout's "your days" step both render this, so the two ask the same question the same way. Pure props, client component.

export interface DayGroup {
  key: string
  /** the heading over this visit's cards; left out for a single visit, where the page question is the heading */
  heading?: string
  offers: readonly DayTimeOffer[]
  /** the service's length, so the start times fit it */
  minutes: number
}

export const lengthWords = (minutes: number) => (minutes >= 60 ? `Start times for a ${minutes / 60} hour visit` : `Start times for a ${minutes} minute visit`)

export function DayTimeGroups({ groups, picks, onPick, note, onNote }: { groups: readonly DayGroup[]; picks: Record<string, DayTimePick>; onPick: (key: string, pick: DayTimePick) => void; note?: string; onNote?: (text: string) => void }) {
  return (
    <div data-slot="day-time-groups" className="space-y-12">
      {groups.map((g, i) => (
        <section key={g.key} aria-label={g.heading ?? "Day and time"} data-kind={g.key}>
          {g.heading && <h2 className="mb-4 font-display text-3xl leading-[1.05] text-navy">{g.heading}</h2>}
          <DayTimePicker
            offers={g.offers}
            value={picks[g.key] ?? { day: null, start: null }}
            onChange={(next) => onPick(g.key, next)}
            legend={g.heading ?? "Pick your day"}
            length={lengthWords(g.minutes)}
            note={i === groups.length - 1 ? note : undefined}
            onNote={i === groups.length - 1 ? onNote : undefined}
          />
        </section>
      ))}
    </div>
  )
}
