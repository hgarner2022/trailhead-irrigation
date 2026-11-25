import { TOWN_CENTRES } from "@/components/blocks/day-map-helpers"
import { clockToMinutes, type GridBlock, type TimeOff } from "@/components/blocks/time-grid-model"
import type { Person, Town, VisitKind } from "@/lib/admin/types"
import { pointNear } from "../schedule-prototype-data"
import type { Meta, Place, ProtoJob, ProtoWorld } from "../schedule-prototype-model"
import type { GridJob } from "../JobsGridDesign"
import { allRows, contactOf, jobView, rowOf } from "./jobs-data"
import { WEEK_VISITS, weekVisitOf } from "./week-visits"
import { serviceMinutes } from "./walk-settings"

// The walkthrough's calendar: every dated visit is read from the job's own page, so the Schedule and the job pages cannot disagree (the Day, Time and Who the page
// shows are parsed back into a place on the clock). "Today" is Wednesday, Nov 18 2026, the day the job pages are written for. A visit the page calls "Done at 9:40 am" is
// done and has no start on the clock: the page gives when it was finished, not when it was booked. Andrea's and Dale's Season Pass visits come from their rows (Mon, May 3, 2027).
// Hannah Garner is a person of the walkthrough (Who on the Jobs grid) and has no visit because every job page names Ryan Garner. Pure functions over the walkthrough's rows.

export const WALK_SCHEDULE_TODAY = "2026-11-18"
export const RYAN_ID = "person_ryan"
export const HANNAH_ID = "person_hannah"

const WEEK = ["mon", "tue", "wed", "thu", "fri"] as const
const CAPACITY = { "turn-on": 6, inspection: 6, blowout: 10, repair: 4, other: 4 }
export const WALK_PEOPLE: Person[] = [
  { id: RYAN_ID, name: "Ryan Garner", initials: "RG", role: "owner", truck: "Ryan Garner", workingDays: [...WEEK], capacityByKind: CAPACITY, hoursStart: "08:00", hoursEnd: "17:00" },
  { id: HANNAH_ID, name: "Hannah Garner", initials: "HG", role: "admin", truck: "Hannah Garner", workingDays: [...WEEK], capacityByKind: CAPACITY, hoursStart: "08:00", hoursEnd: "17:00" },
]
const personIdOf = (who: string) => WALK_PEOPLE.find((p) => p.name === who)?.id

const MONTHS: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" }
/** "Today, Wed Nov 18", "Tue, Nov 24", "Mon, May 3" to an ISO day; the year is the caller's. Null for "None", "No day yet". */
export function isoFromWords(text: string, year: string): string | null {
  const m = /([A-Z][a-z]{2}) (\d{1,2})\b/.exec(text.replace(/^[A-Za-z]+, /, ""))
  const month = m && MONTHS[m[1]!]
  return m && month ? `${year}-${month}-${m[2]!.padStart(2, "0")}` : null
}

/** "9:00 am" to 540; "Any time", "Done at 9:40 am" and anything else to null. */
export function startFromWords(text: string): number | null {
  if (/^done/i.test(text)) return null
  const m = /^(\d{1,2}):(\d{2}) (am|pm)$/.exec(text)
  if (!m) return null
  return clockToMinutes(`${String((Number(m[1]) % 12) + (m[3] === "pm" ? 12 : 0)).padStart(2, "0")}:${m[2]}`)
}

const KIND_OF: Record<string, VisitKind> = { "Spring turn-on": "turn-on", "Fall blowout": "blowout", "Sprinkler repair": "repair", "Mid-season inspection": "inspection", "Season Pass": "turn-on" }
const SERVICE_NAME: Record<string, string> = { "Sprinkler repair": "Repair", "Spring turn-on": "Spring turn-on", "Fall blowout": "Fall blowout", "Season Pass": "Spring turn-on" }
export const serviceWords = (service: string): string => SERVICE_NAME[service] ?? service
const kindOf = (service: string): VisitKind => KIND_OF[service] ?? "other"
const LENGTH = (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`)

const streetOf = (row: GridJob) => (row.property.split(",")[0] ?? row.property).replace(/^\d+\s+/, "").trim()
const townOf = (row: GridJob): Town => ((row.property.split(", ")[1] ?? "Erie") as Town) in TOWN_CENTRES ? ((row.property.split(", ")[1] ?? "Erie") as Town) : "Erie"
/** The town of "480 Briggs St, Erie", Erie when it is none of the six. */
export const townOfProperty = (property: string): Town => ((property.split(", ")[1] ?? "Erie") as Town) in TOWN_CENTRES ? ((property.split(", ")[1] ?? "Erie") as Town) : "Erie"
const firstOf = (row: GridJob) => row.name.split(" ")[0] ?? row.name

function blockOf(row: GridJob, at: { day: string; personId: string; start: number | null; done: boolean }): GridBlock {
  const kind = kindOf(row.service)
  return { id: row.id, day: at.day, personId: at.personId, start: at.start, minutes: serviceMinutes(kind), title: streetOf(row), name: firstOf(row), kind, town: townOf(row), service: SERVICE_NAME[row.service] ?? row.service, done: at.done || undefined }
}

function metaOf(row: GridJob): Meta {
  const c = contactOf(row.name)
  return { customer: row.name, phone: c.text, email: c.email, ...pointNear(townOf(row), row.property) }
}

/** The week's visits (week-visits.ts, the one source) as blocks, with where each moved one was. */
function weekBlocks(): { visits: GridBlock[]; was: Record<string, Place>; meta: Record<string, Meta> } {
  const visits: GridBlock[] = []
  const was: Record<string, Place> = {}
  const meta: Record<string, Meta> = {}
  for (const w of WEEK_VISITS) {
    const row = rowOf(w.id)
    if (!row) continue
    const personId = personIdOf(w.who)!
    const kind = w.service === "Fall blowout" ? "blowout" : "repair"
    visits.push({ id: w.id, day: w.day, personId, start: w.start, minutes: w.minutes, title: streetOf(row), name: firstOf(row), kind, town: townOf(row), service: w.service === "Fall blowout" ? "Fall blowout" : "Repair", done: w.done || undefined, waiting: w.waiting || undefined, notTold: w.was ? true : undefined })
    if (w.was) was[w.id] = { day: w.was.day, personId, start: w.was.start, minutes: w.minutes }
    meta[w.id] = metaOf(row)
  }
  return { visits, was, meta }
}

/** The calendar the walkthrough's Schedule opens over. */
export function buildWalkWorld(): ProtoWorld {
  const week = weekBlocks()
  const visits: GridBlock[] = [...week.visits]
  const unscheduled: ProtoJob[] = []
  const meta: Record<string, Meta> = { ...week.meta }
  for (const row of allRows()) {
    if (row.stage === "cancelled" || weekVisitOf(row.id)) continue
    const view = jobView(row.id)
    meta[row.id] = metaOf(row)
    const old = Number(row.season) > 0 && Number(row.season) < Number(WALK_SCHEDULE_TODAY.slice(0, 4))
    if (old) continue
    if (view.kind === "trips" && row.stage === "scheduled") {
      const day = isoFromWords(row.next, row.season || "2027")
      const personId = personIdOf(row.who)
      if (day && personId) visits.push(blockOf(row, { day, personId, start: null, done: false }))
      continue
    }
    // a job with no day, and a Season Pass sold with no day for its visits, wait for one
    if (row.stage === "unscheduled" || (row.stage === "scheduled" && row.next === "Unscheduled")) {
      const kind = kindOf(row.service)
      const minutes = serviceMinutes(kind)
      const pin = pointNear(townOf(row), row.property)
      const c = contactOf(row.name)
      unscheduled.push({ id: row.id, customer: row.name, town: townOf(row), service: SERVICE_NAME[row.service] ?? row.service, length: LENGTH(minutes), minutes, kind, street: streetOf(row), addedOn: row.id === "andrea-repair" ? "2026-11-18" : "2026-11-12", phone: c.text, email: c.email, ...pin })
    }
  }
  const timeOff: TimeOff[] = [
    { id: "off-hannah-1", personId: HANNAH_ID, day: "2026-11-20", start: 12 * 60, end: 14 * 60 },
    { id: "off-ryan-1", personId: RYAN_ID, day: "2026-11-30", start: null, end: null },
  ]
  return { today: WALK_SCHEDULE_TODAY, now: { day: WALK_SCHEDULE_TODAY, minutes: 10 * 60 + 20 }, people: WALK_PEOPLE, visits, meta, unscheduled, timeOff, was: week.was }
}

/** What a job the calendar does not hold would be if it were placed (a pass, an old job): its town, its length from Services and its service, read from its row. Null for an id with no row. */
export function heldFromRow(id: string): Pick<GridBlock, "town" | "minutes" | "kind" | "title" | "service"> | null {
  const row = rowOf(id)
  if (!row) return null
  const kind = kindOf(row.service)
  return { town: townOf(row), minutes: serviceMinutes(kind), kind, title: streetOf(row), service: SERVICE_NAME[row.service] ?? row.service }
}
