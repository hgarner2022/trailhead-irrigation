"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { DayCalendar } from "@/components/blocks/DayCalendar"
import { FormRow } from "@/components/blocks/FormRow"
import { TimeChips } from "@/components/blocks/TimeChips"
import { Input } from "@/components/ui/input"
import { FindATime } from "@/components/blocks/FindATime"
import { recommendedId, type OpeningSort } from "@/components/blocks/find-a-time-model"
import type { Opening } from "@/components/blocks/scheduler-panels-types"
import type { BestTimes } from "@/components/blocks/best-times"
import { CREW_LINE_MAX, crewText, notices } from "./crew-copy"

// The Schedule and Move dialog's body (docs/plans/2026-11-18-scheduling-engine-design.md section 4, the offer rule, and the customer's
// day-and-time choice): the one calendar (`DayCalendar`, the office's mode: any day from today may be chosen, the days with an opening
// carry the dot and the soonest the orange one), then the person or people, then that day's open start times as chips sized to the
// service's minutes (every half hour that fits between the booked stops inside the person's hours), the booked stops drawn as a line
// above them so the reason a time is taken is visible, and "Any time" as a quiet option for the office. Fixture data stands in for
// `slotsFor` / `offerDays`; the chips change with the day and the person. Pure props, client state.

export const TODAY_LABEL = "Today, Wed Nov 18"
const DAY_START = 9 * 60
const DAY_END = 17 * 60
const GAP = 15
const GRID = 30
export const PEOPLE = ["Ryan Garner", "Tech Two"] as const

interface Stop { start: number; minutes: number; name: string; town: string; person: (typeof PEOPLE)[number] }
interface Day { key: string; /** "2026-11-24" */ iso: string; label: string; stops: Stop[] }

const s = (h: number, m: number, minutes: number, name: string, town: string, person: Stop["person"] = "Ryan Garner"): Stop => ({ start: h * 60 + m, minutes, name, town, person })
export const TODAY_ISO = "2026-11-18"
const DAYS: Day[] = [
  { key: "today", iso: TODAY_ISO, label: TODAY_LABEL, stops: [s(8, 0, 60, "Tom", "Erie"), s(13, 0, 60, "Mina", "Erie")] },
  { key: "d24", iso: "2026-11-24", label: "Tue, Nov 24", stops: [s(9, 0, 60, "Dana", "Erie"), s(10, 30, 60, "Percy", "Erie"), s(9, 0, 90, "Lee", "Longmont", "Tech Two")] },
  { key: "d25", iso: "2026-11-25", label: "Wed, Nov 25", stops: [s(13, 0, 60, "Sam", "Lafayette")] },
  { key: "d26", iso: "2026-11-26", label: "Thu, Nov 26", stops: [] },
  { key: "d27", iso: "2026-11-27", label: "Fri, Nov 27", stops: [s(11, 0, 60, "Ana", "Louisville", "Tech Two")] },
]

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
const toMinutes = (v: string) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3, 5))
const time = (m: number) => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, "0")} ${m < 720 ? "am" : "pm"}`
/** The day on the calendar as the picker holds it: a fixture day with its stops, or any other day with none. */
const dayOf = (iso: string): Day =>
  DAYS.find((d) => d.iso === iso) ?? { key: `c-${iso}`, iso, label: new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }), stops: [] }

/** Open starts for one person on one day: every half hour whose span, with the room to arrive and leave, misses every booked stop. */
export function slotsOf(day: Day, person: string, minutes: number): { starts: number[]; stops: Stop[] } {
  const stops = day.stops.filter((x) => x.person === person).sort((a, b) => a.start - b.start)
  const starts: number[] = []
  for (let t = DAY_START; t + minutes <= DAY_END; t += GRID) if (stops.every((x) => t + minutes + GAP <= x.start || x.start + x.minutes + GAP <= t)) starts.push(t)
  return { starts, stops }
}

export interface Pick {
  /** the day as the calendar holds it, "2026-11-24" (set by every change; the label below is for the words) */
  dayIso?: string
  day: string
  time: string
  /** the first person chosen (the customer hears this one's first name, and the offered times are theirs) */
  person: string
  /** everyone on the trip, in the order chosen */
  people: string[]
  /** text the assigned people (not the signed-in user) that it is assigned */
  crewText: boolean
  /** one optional line for the crew: in the assigned text and on the trip */
  instructions: string
}

export interface SchedulePickerProps {
  minutes?: number
  firstName: string
  channel?: "text" | "email"
  onChange: (p: Pick) => void
  /** the signed-in user: assigning yourself needs no text */
  signedIn?: string
  address?: string
  service?: string
  /** stories: who is chosen and whether the crew text box is on to begin with */
  initialPeople?: string[]
  initialCrewText?: boolean
  /** the ranked best times above the calendar, and the day's stops from the calendar's own world; absent, the dialog is the reviewed one */
  best?: BestTimes
}

export function SchedulePicker({ minutes = 60, firstName, channel = "text", onChange, signedIn = "Ryan Garner", address = "480 Briggs St", service = "Sprinkler repair", initialPeople = [PEOPLE[0]], initialCrewText = false, best }: SchedulePickerProps) {
  const first = best ? [...best.rows, ...(best.forced ?? [])].find((r) => r.id === (best.initialPickId ?? (best.current ? undefined : recommendedId(best.rows)))) : undefined
  const own = best?.current && !first ? best.current : undefined
  const [dayIso, setDayIso] = useState(first?.day ?? own?.day ?? "2026-11-24")
  const [sort, setSort] = useState<OpeningSort>("recommended")
  const [pickedId, setPickedId] = useState<string | null>(first?.id ?? null)
  const [people, setPeople] = useState<string[]>(best && first ? [first.personName] : own ? [own.personName] : initialPeople)
  const [crew, setCrew] = useState(initialCrewText)
  const [instructions, setInstructions] = useState("")
  const person = people[0]!
  const [at, setAt] = useState<number | "any">(first ? toMinutes(first.start) : own?.start ? toMinutes(own.start) : "any")
  const day = best ? { ...dayOf(dayIso), stops: best.stopsOf(dayIso).map((x) => ({ ...x, person: x.person as Stop["person"] })) } : dayOf(dayIso)
  const names = best ? best.people : [...PEOPLE]
  const { starts, stops } = slotsOf(day, person, minutes)
  const others = people.filter((p) => p !== signedIn)
  const emit = (d: Day, ps: string[], t: number | "any", extra: Partial<Pick> = {}) =>
    onChange({ dayIso: d.iso, day: d.label, time: t === "any" ? "Any time" : time(t), person: ps[0]!, people: ps, crewText: crew && ps.some((p) => p !== signedIn), instructions, ...extra })
  const pickRow = (row: Opening) => {
    const d = best ? { ...dayOf(row.day), stops: best.stopsOf(row.day).map((x) => ({ ...x, person: x.person as Stop["person"] })) } : dayOf(row.day)
    setPickedId(row.id)
    setDayIso(row.day)
    setPeople([row.personName])
    setAt(toMinutes(row.start))
    emit(d, [row.personName], toMinutes(row.start))
  }
  const pickDay = (iso: string) => {
    const d = best ? { ...dayOf(iso), stops: best.stopsOf(iso).map((x) => ({ ...x, person: x.person as Stop["person"] })) } : dayOf(iso)
    setPickedId(null)
    setDayIso(iso)
    setAt("any")
    emit(d, people, "any")
  }
  return (
    <div data-slot="schedule-picker" className="flex flex-col gap-4 text-sm">
      {best && (
        <FindATime bare state={best.rows.length ? "results" : "none"} openings={best.rows} forced={best.forced} sort={sort} onSort={setSort} selectedId={pickedId} onPick={pickRow} estimated />
      )}

      <AnotherDay best={best} open={Boolean(best && (best.rows.length === 0 || (best.currentDay && !best.rows.some((r) => r.day === best.currentDay))))}>
      <DayCalendar offers={(best ? [...new Set(best.rows.map((r) => r.day))] : DAYS.map((d) => d.iso)).map((iso) => ({ day: iso, times: [] }))} timed={false} free={{ from: best?.today ?? TODAY_ISO }} density="sheet" headingLevel={3} legend="Day" value={{ day: dayIso, start: null }} onChange={(next) => next.day && pickDay(next.day)} />

      {best?.dayRows ? (
        <DayTimes best={best} day={dayIso} pickedId={pickedId} at={at} onPick={pickRow} onAny={() => (setPickedId(null), setAt("any"), emit(day, people, "any"))} />
      ) : (
        <PersonAndTimes names={names} day={day} people={people} setPeople={(ps) => (setPeople(ps), setPickedId(null), setAt("any"), emit(day, ps, "any"))} stops={stops} starts={starts} at={at} minutes={minutes} pick={(t) => (setPickedId(null), setAt(t), emit(day, people, t))} />
      )}
      </AnotherDay>
      {best?.problems && (() => {
        const problems = best.problems({ day: dayIso, person: people[0]!, start: at === "any" ? null : at })
        return problems.length ? <ul data-slot="place-problems" className="list-disc space-y-1 pl-5 text-foreground">{problems.map((x) => <li key={x}>{x}</li>)}</ul> : null
      })()}

      {best?.notes?.(dayIso).map((x) => <p key={x} data-slot="place-note" className="text-muted-foreground">{x}</p>)}

      <div data-slot="crew-options" className="flex flex-col gap-3">
        {others.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex min-h-11 items-center gap-3 font-medium">
              <input id="crew-text-box" type="checkbox" checked={crew} aria-labelledby="crew-text-label" onChange={(e) => (setCrew(e.target.checked), emit(day, people, at, { crewText: e.target.checked }))} className="size-5 shrink-0 cursor-pointer accent-primary" />
              <span id="crew-text-label" className="cursor-pointer" onClick={() => (setCrew(!crew), emit(day, people, at, { crewText: !crew }))}>{`Text ${others.map((o) => o.split(" ")[0] === "Tech" ? o : o.split(" ")[0]).join(" and ")} that it's assigned`}</span>
            </div>
            <p data-slot="crew-text" className="pl-8 text-muted-foreground">{crewText({ day: day.label, time: at === "any" ? "Any time" : time(at), address, service, instructions })}</p>
          </div>
        )}
        {(!best || names.length > 1) && <FormRow label="Instructions for the crew (optional)" hint={`${instructions.length} of ${CREW_LINE_MAX}. In the text to the crew and on the trip.`}>
          <Input value={instructions} maxLength={CREW_LINE_MAX} onChange={(e) => (setInstructions(e.target.value), emit(day, people, at, { instructions: e.target.value }))} className="min-h-11" />
        </FormRow>}
      </div>

      <p data-slot="schedule-sentence" className="text-muted-foreground">{notices({ first: firstName, channel, others: crew ? others : [] })}</p>
    </div>
  )
}

/** With best times shown, the dialog's own calendar, Who and start time sit behind one quiet "Another day"; without them they are drawn as reviewed. */
function AnotherDay({ best, open, children }: { best?: BestTimes; open: boolean; children: React.ReactNode }) {
  if (!best) return <>{children}</>
  return (
    <details data-slot="another-day" open={open} className="group rounded-lg border border-border">
      <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-foreground">Another day</summary>
      <div className="flex flex-col gap-4 px-3 pb-3">{children}</div>
    </details>
  )
}

/** One chosen day inside "Another day": that day's openings ranked the way the best times are (least added driving first), a time that breaks a rule greyed with its sentence, and Any time. */
function DayTimes({ best, day, pickedId, at, onPick, onAny }: { best: BestTimes; day: string; pickedId: string | null; at: number | "any"; onPick: (r: Opening) => void; onAny: () => void }) {
  const { rows, forced } = best.dayRows!(day)
  return (
    <div data-slot="day-times" className="flex flex-col gap-2">
      <FindATime bare oneDay state={rows.length || forced.length ? "results" : "none"} openings={rows} forced={forced} sort="recommended" onSort={() => undefined} selectedId={pickedId} onPick={onPick} />
      <TimeChips legend="Start time" hideLegend density="sheet" anyTime options={[]} value={at === "any" ? null : hhmm(at)} onChange={() => onAny()} />
    </div>
  )
}

function PersonAndTimes({ names, day, people, setPeople, stops, starts, at, minutes, pick }: { names: readonly string[]; day: Day; people: string[]; setPeople: (ps: string[]) => void; stops: Stop[]; starts: number[]; at: number | "any"; minutes: number; pick: (t: number | "any") => void }) {
  return (
    <>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 font-medium">Who</legend>
        <div className="flex flex-wrap gap-2">
          {names.map((p) => {
            const on = people.includes(p)
            return (
              <button key={p} type="button" role="checkbox" aria-checked={on} onClick={() => setPeople(on ? (people.length > 1 ? people.filter((x) => x !== p) : people) : [...people, p])} className={cn("min-h-11 rounded-full border px-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", on ? "border-primary bg-primary/10" : "border-input text-muted-foreground")}>
                {p}
              </button>
            )
          })}
        </div>
        {people.length > 1 && <p className="text-muted-foreground">The customer is told {people[0]!.split(" ")[0]} is coming.</p>}
      </fieldset>
      <div className="flex flex-col gap-2">
        <p className="font-medium">Start time <span className="font-normal text-muted-foreground">({minutes} minutes)</span></p>
        <p data-slot="day-timeline" className="rounded-lg bg-stone px-3 py-2 text-muted-foreground">
          {stops.length ? `${people[0]!.split(" ")[0]} is booked: ${stops.map((x) => `${time(x.start)} ${x.name}, ${x.town}`).join(" · ")}` : `${people[0]!.split(" ")[0]} has nothing booked ${day.label.startsWith("Today") ? "today" : "that day"}.`}
        </p>
        {starts.length === 0 && <p className="text-muted-foreground">No open time that fits. Pick Any time or another day.</p>}
        <TimeChips legend="Start time" hideLegend density="sheet" anyTime options={starts.map((t) => ({ start: hhmm(t) }))} value={at === "any" ? null : hhmm(at)} onChange={(v) => pick(v === null ? "any" : toMinutes(v))} />
      </div>
    </>
  )
}
