import { addDays, worksOn } from "@/lib/admin/calendar"
import { firstNameOf, hoursOf } from "@/lib/admin/people"
import type { Person } from "@/lib/admin/types"
import { dayShort } from "@/components/blocks/find-a-time-model"
import type { NotToldVisit, UnscheduledJob } from "@/components/blocks/scheduler-panels-types"
import { clockToMinutes, clockWords, hoursSpan, rangeWords, type GridBlock, type TimeOff } from "@/components/blocks/time-grid-model"

// The Schedule prototype's state and every change to it, pure (docs/plans/2026-11-25-scheduler-design.md, 7.8 to 7.11). A move by any route (a drag, a
// resize, the keyboard, a block's menu, a row dropped from Unscheduled) goes through `reduce`: the visit changes, the customer is marked not notified,
// one toast is made and its Undo holds the state before, so Undo restores exactly. NOTHING is ever sent here: Notify and Don't tell only clear the mark.

export interface Place { day: string; personId: string; start: number | null; minutes: number }
/** What the prototype knows about the customer and the yard, by visit or job id. */
export interface Meta { customer: string; phone?: string; email?: string; lat: number; lng: number }
/** A job with no day: the Unscheduled row plus what placing it needs. */
export interface ProtoJob extends UnscheduledJob { street: string; minutes: number; kind: GridBlock["kind"]; phone?: string; email?: string }

export interface Snapshot { visits: GridBlock[]; was: Record<string, Place>; unscheduled: ProtoJob[]; meta: Record<string, Meta> }
/** What the moved confirmation says: "Moved to Thu, Nov 26, 9:00 am". `notified` is set when the customer was told by the Schedule dialog, so the bar offers Undo alone. */
export interface ProtoToast { key: number; message: string; ids: string[]; notified: boolean; undo: Snapshot }
/** `notify` is the queue of visits whose message is being written, in order: the first has the Send a message dialog */
export interface ProtoState extends Snapshot { timeOff: TimeOff[]; toast: ProtoToast | null; seq: number; notify: string[] }

export interface Target { day: string; personId: string; start: number | null }
/** The people, calendar and jobs a screen opens over (the walkthrough's world, or the standalone fixtures). */
export interface ProtoWorld {
  today: string
  now: { day: string; minutes: number }
  people: Person[]
  visits: GridBlock[]
  meta: Record<string, Meta>
  unscheduled: ProtoJob[]
  timeOff: TimeOff[]
}
export type Action =
  | { type: "move"; id: string; to: Target; notified?: boolean }
  | { type: "resize"; id: string; minutes: number }
  | { type: "place"; jobId: string; to: Target; notified?: boolean }
  | { type: "add"; visit: GridBlock; meta: Meta }
  | { type: "add-unscheduled"; job: ProtoJob }
  | { type: "undo" }
  | { type: "dismiss-toast" }
  | { type: "told"; ids: string[] }
  | { type: "ask-notify"; ids: string[] }
  | { type: "notify-next"; sent: boolean }
  | { type: "notify-close" }
  | { type: "time-off-save"; value: TimeOff }
  | { type: "time-off-remove"; id: string }

const snapshotOf = (s: ProtoState): Snapshot => ({ visits: s.visits, was: s.was, unscheduled: s.unscheduled, meta: s.meta })
const placeOf = (b: GridBlock): Place => ({ day: b.day, personId: b.personId, start: b.start, minutes: b.minutes })
const clockOrAny = (start: number | null) => (start === null ? "Any time" : clockWords(start))
const lower = (service: string) => service.charAt(0).toLowerCase() + service.slice(1)

/** "Thu, Nov 26, 9:00 am" or "Thu, Nov 26, Any time". */
export const whenWords = (p: { day: string; start: number | null }) => `${dayShort(p.day)}, ${clockOrAny(p.start)}`

/** The notified words from the saved "Day moved, text" template (src/emails/editable.ts): "Trailhead: your spring turn-on moved to Thu, Nov 26 at 9:00 am." */
export const moveMessage = (b: Pick<GridBlock, "service" | "day" | "start">): string =>
  `Trailhead: your ${lower(b.service)} moved to ${dayShort(b.day)}${b.start === null ? "" : ` at ${clockWords(b.start)}`}.`

/** What each change says in its toast. */
function stamp(s: ProtoState, message: string, ids: string[], notified = false): ProtoToast {
  return { key: s.seq + 1, message, ids, notified, undo: snapshotOf(s) }
}

/** "Moved to Thu, Nov 26, 9:00 am" or "Scheduled for ...": the day alone for a visit with no time. */
const onWords = (p: { day: string; start: number | null }) => (p.start === null ? dayShort(p.day) : whenWords(p))

/** Marks a visit not told, remembering where it was the first time. */
function untold(was: Record<string, Place>, before: GridBlock): Record<string, Place> {
  return before.notTold ? was : { ...was, [before.id]: placeOf(before) }
}

function moveOne(s: ProtoState, id: string, patch: Partial<GridBlock>, notified = false): Pick<ProtoState, "visits" | "was"> | null {
  const before = s.visits.find((b) => b.id === id)
  if (!before) return null
  if (notified) return { visits: s.visits.map((b) => (b.id === id ? { ...b, ...patch, notTold: false } : b)), was: Object.fromEntries(Object.entries(s.was).filter(([k]) => k !== id)) }
  return { visits: s.visits.map((b) => (b.id === id ? { ...b, ...patch, notTold: true } : b)), was: untold(s.was, before) }
}

export function reduce(s: ProtoState, a: Action): ProtoState {
  switch (a.type) {
    case "move": {
      const before = s.visits.find((b) => b.id === a.id)
      // a drop where it already was is not a move: no toast and no "not told"
      if (before && before.day === a.to.day && before.personId === a.to.personId && before.start === a.to.start) return s
      const next = moveOne(s, a.id, { day: a.to.day, personId: a.to.personId, start: a.to.start }, a.notified)
      if (!before || !next) return s
      return { ...s, ...next, seq: s.seq + 1, toast: stamp(s, `Moved to ${onWords(a.to)}`, [a.id], a.notified) }
    }
    case "resize": {
      const before = s.visits.find((b) => b.id === a.id)
      if (before && before.minutes === a.minutes) return s
      const next = moveOne(s, a.id, { minutes: a.minutes })
      if (!before || !next) return s
      const message = before.start === null ? `Changed to ${a.minutes} minutes` : `Changed to ${rangeWords(before.start, a.minutes)}`
      return { ...s, ...next, seq: s.seq + 1, toast: stamp(s, message, [a.id]) }
    }
    case "place": {
      const job = s.unscheduled.find((j) => j.id === a.jobId)
      if (!job) return s
      const visit = { ...visitOfJob(job, a.to), notTold: !a.notified }
      return { ...s, visits: [...s.visits, visit], unscheduled: s.unscheduled.filter((j) => j.id !== job.id), meta: { ...s.meta, [job.id]: metaOfJob(job) }, seq: s.seq + 1, toast: stamp(s, `Scheduled for ${onWords(a.to)}`, [job.id], a.notified) }
    }
    case "add": {
      return { ...s, visits: [...s.visits, { ...a.visit, notTold: true }], meta: { ...s.meta, [a.visit.id]: a.meta }, seq: s.seq + 1, toast: stamp(s, `Scheduled for ${onWords(a.visit)}`, [a.visit.id]) }
    }
    case "add-unscheduled":
      return { ...s, unscheduled: [...s.unscheduled, a.job], toast: null }
    case "undo":
      return s.toast ? { ...s, ...s.toast.undo, notify: [], toast: null } : s
    case "dismiss-toast":
      return s.toast ? { ...s, toast: null } : s
    case "told": {
      const ids = new Set(a.ids)
      const was = Object.fromEntries(Object.entries(s.was).filter(([id]) => !ids.has(id)))
      return { ...s, was, visits: s.visits.map((b) => (ids.has(b.id) ? { ...b, notTold: false } : b)) }
    }
    case "ask-notify":
      return { ...s, notify: a.ids }
    case "notify-next": {
      const [head, ...rest] = s.notify
      if (head === undefined) return s
      const done = a.sent ? reduce(s, { type: "told", ids: [head] }) : s
      return { ...done, notify: rest }
    }
    case "notify-close":
      return s.notify.length ? { ...s, notify: [] } : s
    case "time-off-save":
      return { ...s, timeOff: [...s.timeOff.filter((o) => o.id !== a.value.id), a.value] }
    case "time-off-remove":
      return { ...s, timeOff: s.timeOff.filter((o) => o.id !== a.id) }
  }
}

export const metaOfJob = (j: ProtoJob): Meta => ({ customer: j.customer, phone: j.phone, email: j.email, lat: j.lat ?? 40.05, lng: j.lng ?? -105.05 })

export function visitOfJob(j: ProtoJob, to: Target): GridBlock {
  return { id: j.id, day: to.day, personId: to.personId, start: to.start, minutes: j.minutes, title: j.street, name: j.customer.split(" ")[0] ?? j.customer, kind: j.kind, town: j.town, service: j.service, notTold: true }
}

/** The visits whose customer has not been told, as the Not told tab lists them. */
export function notToldList(s: Pick<ProtoState, "visits" | "was" | "meta">): NotToldVisit[] {
  return s.visits.filter((b) => b.notTold).map((b) => {
    const m = s.meta[b.id]
    const was = s.was[b.id]
    return { id: b.id, customer: m?.customer ?? b.name, town: b.town, service: b.service, was: was ? whenWords(was) : "Not scheduled", now: whenWords(b), phone: m?.phone, email: m?.email }
  })
}

/** The jobs of the Unscheduled panel as it takes them (the panel reads UnscheduledJob; the extra fields ride along). */
export const jobsOf = (s: Pick<ProtoState, "unscheduled">): UnscheduledJob[] => s.unscheduled

// What a place breaks, in plain words. A drop on any of these asks "Move anyway?"; an empty list moves at once.

export interface PlaceInput { id: string; day: string; personId: string; start: number | null; minutes: number }

export function placementProblems(s: Pick<ProtoState, "visits" | "timeOff">, people: readonly Person[], p: PlaceInput): string[] {
  const person = people.find((x) => x.id === p.personId)
  if (!person) return []
  const who = firstNameOf(person.name) ?? "They"
  if (!worksOn(person, p.day)) return [`${who} does not work that day.`]
  const out: string[] = []
  if (p.start === null) return out
  const end = p.start + p.minutes
  const hours = hoursOf(person)
  const hs = clockToMinutes(hours.start) ?? 540
  const he = clockToMinutes(hours.end) ?? 1020
  if (p.start < hs) out.push(`${who} starts at ${clockWords(hs)}.`)
  if (end > he) out.push(`${who} works until ${clockWords(he)}.`)
  for (const b of s.visits) {
    if (b.id === p.id || b.day !== p.day || b.personId !== p.personId || b.start === null || b.planned) continue
    if (p.start < b.start + b.minutes && b.start < end) out.push(`${who} has ${b.title} at ${clockWords(b.start)}.`)
  }
  for (const o of s.timeOff) {
    if (o.day !== p.day || o.personId !== p.personId) continue
    const whole = o.start === null || o.end === null
    if (whole || (p.start < o.end! && o.start! < end)) out.push(`${who} is off ${whole ? "all day" : hoursSpan(o.start!, o.end!)}.`)
  }
  return out
}

/** The size of a block's day for the side panel: "Wed, Nov 25, 9:00 to 11:00 am". */
export const visitWhen = (b: Pick<GridBlock, "day" | "start" | "minutes">): string => (b.start === null ? `${dayShort(b.day)}, Any time` : `${dayShort(b.day)}, ${rangeWords(b.start, b.minutes)}`)

/** "Mon, Nov 30, all day" or "Fri, Nov 20, 12 to 2 pm": one time off as Settings, People lists it. */
export const timeOffWords = (o: TimeOff): string => `${dayShort(o.day)}, ${o.start === null || o.end === null ? "all day" : hoursSpan(o.start, o.end)}`

/** The rows a saved time off makes: one per day from `from` to `to` (at most 31), all day or the hours. */
export function timeOffRows(v: { personId: string; allDay: boolean; from: string; to: string; startTime: string; endTime: string }, idFor: (day: string) => string): TimeOff[] {
  const rows: TimeOff[] = []
  for (let d = v.from; d <= v.to && rows.length < 31; d = addDays(d, 1)) {
    rows.push({ id: idFor(d), personId: v.personId, day: d, start: v.allDay ? null : clockToMinutes(v.startTime), end: v.allDay ? null : clockToMinutes(v.endTime) })
  }
  return rows
}
