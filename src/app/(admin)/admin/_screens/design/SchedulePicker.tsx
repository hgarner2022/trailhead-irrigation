"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { FormRow } from "@/components/blocks/FormRow"
import { Button } from "@/components/ui/button"

// The Schedule and Move dialog's body (docs/plans/2026-11-18-scheduling-engine-design.md section 4, the offer rule, and the customer's
// day-and-time choice): three day cards, the soonest open days, each labelled with what is already booked ("Tue, Nov 24 · 3 stops ·
// Erie"); "Show more days" for five; a calendar for any other day; then that day's open start times as chips sized to the service's minutes
// (every half hour that fits between the booked stops inside the person's hours), the booked stops drawn as a timeline above them so
// the reason a time is taken is visible, the best fit marked, "Any time" as a quiet option for the office, and the person when there are
// two. Fixture data stands in for `slotsFor` / `offerDays`; the chips and cards change with the day. Pure props, client state.

export const TODAY_LABEL = "Today, Wed Nov 18"
const DAY_START = 9 * 60
const DAY_END = 17 * 60
const GAP = 15
const GRID = 30
export const PEOPLE = ["Ryan Garner", "Tech Two"] as const

interface Stop { start: number; minutes: number; name: string; town: string; person: (typeof PEOPLE)[number] }
interface Day { key: string; label: string; stops: Stop[] }

const s = (h: number, m: number, minutes: number, name: string, town: string, person: Stop["person"] = "Ryan Garner"): Stop => ({ start: h * 60 + m, minutes, name, town, person })
const DAYS: Day[] = [
  { key: "today", label: TODAY_LABEL, stops: [s(8, 0, 60, "Tom", "Erie"), s(13, 0, 60, "Mina", "Erie")] },
  { key: "d24", label: "Tue, Nov 24", stops: [s(9, 0, 60, "Dana", "Erie"), s(10, 30, 60, "Percy", "Erie"), s(9, 0, 90, "Lee", "Longmont", "Tech Two")] },
  { key: "d25", label: "Wed, Nov 25", stops: [s(13, 0, 60, "Sam", "Lafayette")] },
  { key: "d26", label: "Thu, Nov 26", stops: [] },
  { key: "d27", label: "Fri, Nov 27", stops: [s(11, 0, 60, "Ana", "Louisville", "Tech Two")] },
]

const time = (m: number) => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, "0")} ${m < 720 ? "am" : "pm"}`
const dayLabel = (d: Day) => {
  const towns = [...new Set(d.stops.map((x) => x.town))]
  return d.stops.length === 0 ? `${d.label} · open` : `${d.label} · ${d.stops.length} ${d.stops.length === 1 ? "stop" : "stops"} · ${towns.join(", ")}`
}

/** Open starts for one person on one day: every half hour whose span, with the room to arrive and leave, misses every booked stop. The best fit is the start that follows a stop in the same town. */
export function slotsOf(day: Day, person: string, minutes: number, town = "Erie"): { starts: number[]; best?: number; stops: Stop[] } {
  const stops = day.stops.filter((x) => x.person === person).sort((a, b) => a.start - b.start)
  const starts: number[] = []
  for (let t = DAY_START; t + minutes <= DAY_END; t += GRID) if (stops.every((x) => t + minutes + GAP <= x.start || x.start + x.minutes + GAP <= t)) starts.push(t)
  const next = starts.find((t) => stops.some((x) => x.town === town && x.start + x.minutes + GAP <= t && t - (x.start + x.minutes) <= 45))
  return { starts, best: next ?? starts[0], stops }
}

export interface Pick { day: string; time: string; person: string }

export function SchedulePicker({ minutes = 60, firstName, channel = "text", onChange }: { minutes?: number; firstName: string; channel?: "text" | "email"; onChange: (p: Pick) => void }) {
  const [more, setMore] = useState(false)
  const [custom, setCustom] = useState<Day | null>(null)
  const [dayKey, setDayKey] = useState("d24")
  const [person, setPerson] = useState<string>(PEOPLE[0])
  const [at, setAt] = useState<number | "any">("any")
  const shown = [...DAYS.slice(0, more ? 5 : 3), ...(custom ? [custom] : [])]
  const day = shown.find((d) => d.key === dayKey) ?? shown[0]!
  const { starts, best, stops } = slotsOf(day, person, minutes)
  const emit = (d: Day, p: string, t: number | "any") => onChange({ day: d.label, time: t === "any" ? "Any time" : time(t), person: p })
  const pickDay = (d: Day) => (setDayKey(d.key), setAt("any"), emit(d, person, "any"))
  const pickCustom = (iso: string) => {
    if (!iso) return
    const when = new Date(`${iso}T12:00:00`)
    const d: Day = { key: `c-${iso}`, label: when.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }), stops: [] }
    setCustom(d)
    pickDay(d)
  }
  return (
    <div data-slot="schedule-picker" className="flex flex-col gap-4 text-sm">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">Day</legend>
        {shown.map((d) => (
          <div key={d.key} onClick={() => pickDay(d)} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-input px-3 py-2 has-[:checked]:border-primary has-[:checked]:bg-primary/10">
            <input type="radio" name="sched-day" checked={d.key === day.key} onChange={() => pickDay(d)} aria-label={dayLabel(d)} className="size-4 accent-primary" />
            <span aria-hidden className="font-medium">{dayLabel(d)}</span>
          </div>
        ))}
        <div className="flex flex-wrap gap-x-4">
          {!more && <Button type="button" variant="ghost" className="min-h-11 px-0 text-primary-dark" onClick={() => setMore(true)}>Show more days</Button>}
          <FormRow label="Any other day" hideLabel><input type="date" aria-label="Any other day" onChange={(e) => pickCustom(e.target.value)} className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm" /></FormRow>
        </div>
      </fieldset>

      <PersonAndTimes day={day} person={person} setPerson={(p) => (setPerson(p), setAt("any"), emit(day, p, "any"))} stops={stops} starts={starts} best={best} at={at} minutes={minutes} pick={(t) => (setAt(t), emit(day, person, t))} />

      <p className="text-muted-foreground">{firstName} gets {channel === "email" ? "an email" : "a text"} with the day and time.</p>
    </div>
  )
}

function PersonAndTimes({ day, person, setPerson, stops, starts, best, at, minutes, pick }: { day: Day; person: string; setPerson: (p: string) => void; stops: Stop[]; starts: number[]; best?: number; at: number | "any"; minutes: number; pick: (t: number | "any") => void }) {
  return (
    <>
      <FormRow label="Who"><select value={person} onChange={(e) => setPerson(e.target.value)} className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm">{PEOPLE.map((p) => <option key={p}>{p}</option>)}</select></FormRow>
      <div className="flex flex-col gap-2">
        <p className="font-medium">Start time <span className="font-normal text-muted-foreground">({minutes} minutes)</span></p>
        <p data-slot="day-timeline" className="rounded-lg bg-stone px-3 py-2 text-muted-foreground">
          {stops.length ? `${person.split(" ")[0]} is booked: ${stops.map((x) => `${time(x.start)} ${x.name}, ${x.town}`).join(" · ")}` : `${person.split(" ")[0]} has nothing booked ${day.label.startsWith("Today") ? "today" : "that day"}.`}
        </p>
        <div role="radiogroup" aria-label="Start time" className="flex flex-wrap gap-2">
          {starts.length === 0 && <p className="text-muted-foreground">No open time that fits. Pick Any time or another day.</p>}
          {starts.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={at === t} onClick={() => pick(t)} className={cn("min-h-11 rounded-lg border px-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50", at === t ? "border-primary bg-primary/10" : "border-input")}>
              {time(t)}
              {t === best && <span className="ml-1 text-xs font-normal text-muted-foreground">Best fit</span>}
            </button>
          ))}
        </div>
        <button type="button" role="radio" aria-checked={at === "any"} onClick={() => pick("any")} className={cn("min-h-11 self-start rounded-sm px-1 text-muted-foreground underline-offset-2 hover:underline", at === "any" && "font-medium text-foreground underline")}>
          Any time
        </button>
      </div>
    </>
  )
}
