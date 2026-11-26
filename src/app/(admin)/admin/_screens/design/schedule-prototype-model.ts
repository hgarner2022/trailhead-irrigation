import { addDays } from "@/lib/admin/calendar"
import type { Person, Town } from "@/lib/admin/types"
import { shortDay } from "@/emails/format"
import type { UnscheduledJob } from "@/components/blocks/scheduler-panels-types"
import { placeProblems } from "./schedule-engine"
import { clockToMinutes, clockWords, hoursSpan, rangeWords, type GridBlock, type TimeOff } from "@/components/blocks/time-grid-model"

// The Schedule prototype's state and every change to it, pure (docs/plans/2026-11-25-scheduler-design.md, 7.8 to 7.11, and the second review, docs/plans/2026-11-26-scheduler-review-research.md,
// point 3). A move by any route (a drag, a resize, the keyboard, the Edit visit dialog, a row dropped from Unscheduled) goes through `reduce`: the visit changes, one toast is made
// and its Undo holds the state before, so Undo restores exactly. The toast may offer Notify the customer; nothing is ever sent here, and nothing is tracked about who was told.
// `was` is only where a visit was before its last move, for the words of the message.

export interface Place { day: string; personId: string; start: number | null; minutes: number }
/** What the prototype knows about the customer and the yard, by visit or job id. */
export interface Meta { customer: string; phone?: string; email?: string; lat: number; lng: number }
/** A job with no day: the Unscheduled row plus what placing it needs. */
export interface ProtoJob extends UnscheduledJob { street: string; minutes: number; kind: GridBlock["kind"]; phone?: string; email?: string }

export interface Snapshot { visits: GridBlock[]; was: Record<string, Place>; unscheduled: ProtoJob[]; meta: Record<string, Meta> }
/** What the confirmation says: "Moved to Thu, Nov 26, 9:00 am". `offerNotify` shows Notify the customer (not when the dialog already told them, or the start did not change); `undo` is null for "Customer notified". */
export interface ProtoToast { key: number; message: string; ids: string[]; offerNotify: boolean; undo: Snapshot | null }
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
  /** where a visit was before its last move */
  was?: Record<string, Place>
}
export type Action =
  | { type: "move"; id: string; to: Target; notified?: boolean; /** the new length too (Edit visit) */ minutes?: number }
  | { type: "resize"; id: string; minutes: number }
  | { type: "place"; jobId: string; to: Target; notified?: boolean; /** the length chosen in Schedule visit */ minutes?: number }
  | { type: "add"; visit: GridBlock; meta: Meta }
  | { type: "add-unscheduled"; job: ProtoJob }
  /** Order the day: the Any time stops of one person's day take their place in the order (no time is given); nothing was promised to them, so nothing is told */
  | { type: "order-day"; moves: { id: string; afterId: string | null; order: number }[]; message: string }
  /** Schedule all: every job placed at once, one toast, one Undo */
  | { type: "place-all"; places: { jobId: string; to: Target }[]; notified: boolean; /** jobs with no room, said in the toast */ noRoom?: number }
  /** a visit that came from outside the calendar (New job with a day): it joins as it is, no toast */
  | { type: "seed-visit"; visit: GridBlock; meta: Meta }
  /** Mark done on a visit today or earlier (the standalone Schedule; the walkthrough's goes through the job page) */
  | { type: "mark-done"; id: string }
  | { type: "undo" }
  | { type: "dismiss-toast" }
  | { type: "ask-notify"; ids: string[] }
  | { type: "notify-next"; sent: boolean }
  | { type: "notify-close" }
  | { type: "time-off-save"; value: TimeOff }
  | { type: "time-off-remove"; id: string }

const snapshotOf = (s: ProtoState): Snapshot => ({ visits: s.visits, was: s.was, unscheduled: s.unscheduled, meta: s.meta })
const placeOf = (b: GridBlock): Place => ({ day: b.day, personId: b.personId, start: b.start, minutes: b.minutes })
const clockOrAny = (start: number | null) => (start === null ? "Any time" : clockWords(start))

/** "Thu, Nov 26, 9:00 am" or "Thu, Nov 26, Any time". */
export const whenWords = (p: { day: string; start: number | null }) => `${shortDay(p.day)}, ${clockOrAny(p.start)}`

/** What each change says in its toast. */
function stamp(s: ProtoState, message: string, ids: string[], offerNotify = true): ProtoToast {
  return { key: s.seq + 1, message, ids, offerNotify, undo: snapshotOf(s) }
}

/** "Moved to Thu, Nov 26, 9:00 am" or "Scheduled for ...": the day alone for a visit with no time. */
const onWords = (p: { day: string; start: number | null }) => (p.start === null ? shortDay(p.day) : whenWords(p))

/** A visit that moves leaves the place Order the day gave it. */
const stale = (patch: Partial<GridBlock>) => ("day" in patch || "start" in patch || "personId" in patch ? { afterId: undefined, order: undefined } : {})

function moveOne(s: ProtoState, id: string, patch: Partial<GridBlock>): Pick<ProtoState, "visits" | "was"> | null {
  const before = s.visits.find((b) => b.id === id)
  if (!before) return null
  return { visits: s.visits.map((b) => (b.id === id ? { ...b, ...patch, ...stale(patch) } : b)), was: "day" in patch || "start" in patch || "personId" in patch ? { ...s.was, [id]: placeOf(before) } : s.was }
}

export function reduce(s: ProtoState, a: Action): ProtoState {
  switch (a.type) {
    case "move": {
      const before = s.visits.find((b) => b.id === a.id)
      const same = before && before.day === a.to.day && before.personId === a.to.personId && before.start === a.to.start
      // a drop where it already was is not a move: no toast
      if (same && (a.minutes === undefined || a.minutes === before.minutes)) return s
      if (before && same) return reduce(s, { type: "resize", id: a.id, minutes: a.minutes! })
      const next = moveOne(s, a.id, { day: a.to.day, personId: a.to.personId, start: a.to.start, ...(a.minutes !== undefined ? { minutes: a.minutes } : {}) })
      if (!before || !next) return s
      return { ...s, ...next, seq: s.seq + 1, toast: stamp(s, `Moved to ${onWords(a.to)}`, [a.id], !a.notified) }
    }
    case "resize": {
      const before = s.visits.find((b) => b.id === a.id)
      if (before && before.minutes === a.minutes) return s
      const next = moveOne(s, a.id, { minutes: a.minutes })
      if (!before || !next) return s
      return { ...s, ...next, seq: s.seq + 1, toast: stamp(s, lengthChange({ start: before.start, minutes: a.minutes }), [a.id], false) }
    }
    case "place": {
      const job = s.unscheduled.find((j) => j.id === a.jobId)
      if (!job) return s
      const visit = { ...visitOfJob(job, a.to), ...(a.minutes !== undefined ? { minutes: a.minutes } : {}) }
      return { ...s, visits: [...s.visits, visit], unscheduled: s.unscheduled.filter((j) => j.id !== job.id), meta: { ...s.meta, [job.id]: metaOfJob(job) }, seq: s.seq + 1, toast: stamp(s, `Scheduled for ${onWords(a.to)}`, [job.id], !a.notified) }
    }
    case "add": {
      return { ...s, visits: [...s.visits, a.visit], meta: { ...s.meta, [a.visit.id]: a.meta }, seq: s.seq + 1, toast: stamp(s, `Scheduled for ${onWords(a.visit)}`, [a.visit.id]) }
    }
    case "order-day": {
      if (!a.moves.length) return s
      const at = new Map(a.moves.map((m) => [m.id, m]))
      return { ...s, visits: s.visits.map((b) => (at.has(b.id) ? { ...b, afterId: at.get(b.id)!.afterId, order: at.get(b.id)!.order } : b)), seq: s.seq + 1, toast: stamp(s, a.message, a.moves.map((m) => m.id), false) }
    }
    case "place-all": {
      const jobs = a.places.flatMap((p) => { const job = s.unscheduled.find((j) => j.id === p.jobId); return job ? [{ job, to: p.to }] : [] })
      if (!jobs.length) return s
      const ids = new Set(jobs.map((x) => x.job.id))
      return {
        ...s,
        visits: [...s.visits, ...jobs.map(({ job, to }) => visitOfJob(job, to))],
        unscheduled: s.unscheduled.filter((j) => !ids.has(j.id)),
        meta: { ...s.meta, ...Object.fromEntries(jobs.map(({ job }) => [job.id, metaOfJob(job)])) },
        seq: s.seq + 1,
        toast: stamp(s, `${jobs.length} ${jobs.length === 1 ? "visit" : "visits"} scheduled${a.noRoom ? `. ${a.noRoom} ${a.noRoom === 1 ? "has" : "have"} no room.` : ""}`, jobs.map((x) => x.job.id), !a.notified),
      }
    }
    case "seed-visit":
      return { ...s, visits: [...s.visits.filter((b) => b.id !== a.visit.id), a.visit], meta: { ...s.meta, [a.visit.id]: a.meta }, unscheduled: s.unscheduled.filter((j) => j.id !== a.visit.id) }
    case "add-unscheduled":
      return { ...s, unscheduled: [...s.unscheduled, a.job], toast: null }
    case "mark-done": {
      const before = s.visits.find((b) => b.id === a.id)
      if (!before || before.done) return s
      return { ...s, visits: s.visits.map((b) => (b.id === a.id ? { ...b, done: true } : b)), seq: s.seq + 1, toast: stamp(s, "Marked done", [a.id], false) }
    }
    case "undo":
      return s.toast?.undo ? { ...s, ...s.toast.undo, notify: [], toast: null } : s
    case "dismiss-toast":
      return s.toast ? { ...s, toast: null } : s
    case "ask-notify":
      return { ...s, notify: a.ids }
    case "notify-next": {
      const [head, ...rest] = s.notify
      if (head === undefined) return s
      const told = a.sent && rest.length === 0 ? { key: s.seq + 1, message: "Customer notified", ids: [head], offerNotify: false, undo: null } : s.toast
      return { ...s, notify: rest, seq: told !== s.toast ? s.seq + 1 : s.seq, toast: told }
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
  return { id: j.id, day: to.day, personId: to.personId, start: to.start, minutes: j.minutes, title: j.street, name: j.customer.split(" ")[0] ?? j.customer, kind: j.kind, town: j.town, service: j.service }
}

/** A move in the app's own words (`visit.moved` in src/lib/events/words.ts, "moved from X to Y"): the day is said once when it did not change, both when it did. */
export function changeWords(was: Pick<Place, "day" | "start"> & { minutes?: number } | undefined, now: Pick<Place, "day" | "start"> & { minutes?: number }): string {
  if (!was) return `Scheduled for ${whenWords(now)}`
  // only the length changed: said as the toast says it, "Now 8:00 to 8:45 am"
  if (was.day === now.day && was.start === now.start && was.minutes !== undefined && now.minutes !== undefined && was.minutes !== now.minutes) return `${lengthChange({ start: now.start, minutes: now.minutes })}, ${shortDay(now.day)}`
  if (was.day === now.day) return `Moved from ${clockOrAny(was.start)} to ${clockOrAny(now.start)}, ${shortDay(now.day)}`
  return `Moved from ${whenWords(was)} to ${whenWords(now)}`
}

/** What a resize says, in the toast and the history: "Now 8:00 to 8:45 am". */
export const lengthChange = (b: { start: number | null; minutes: number }) => (b.start === null ? `Now ${b.minutes} minutes` : `Now ${rangeWords(b.start, b.minutes)}`)

/** The jobs of the Unscheduled panel as it takes them (the panel reads UnscheduledJob; the extra fields ride along). */
export const jobsOf = (s: Pick<ProtoState, "unscheduled">): UnscheduledJob[] => s.unscheduled

// What a place breaks, in plain words. A drop on any of these asks "Move anyway?"; an empty list moves at once.

export interface PlaceInput { driving?: boolean; id: string; day: string; personId: string; start: number | null; minutes: number; town?: Town; kind?: string; point?: { lat: number; lng: number } | null }

/** What a place breaks: the one rule of `schedule-engine.ts` (hours, a visit or time off in the way, the room to drive, a full day, added driving). */
export const placementProblems = (s: Pick<ProtoState, "visits" | "timeOff"> & Partial<Pick<ProtoState, "meta">>, people: readonly Person[], p: PlaceInput): string[] => placeProblems({ people, visits: s.visits, meta: s.meta ?? {}, timeOff: s.timeOff }, p)

/** The size of a block's day for the side panel: "Wed, Nov 25, 9:00 to 11:00 am". */
export const visitWhen = (b: Pick<GridBlock, "day" | "start" | "minutes">): string => (b.start === null ? `${shortDay(b.day)}, Any time` : `${shortDay(b.day)}, ${rangeWords(b.start, b.minutes)}`)

/** "Mon, Nov 30, all day" or "Fri, Nov 20, 12 to 2 pm": one time off as Settings, People lists it. */
export const timeOffWords = (o: TimeOff): string => `${shortDay(o.day)}, ${o.start === null || o.end === null ? "all day" : hoursSpan(o.start, o.end)}`

/** The rows a saved time off makes: one per day from `from` to `to` (at most 31), all day or the hours. */
export function timeOffRows(v: { personId: string; allDay: boolean; from: string; to: string; startTime: string; endTime: string }, idFor: (day: string) => string): TimeOff[] {
  const rows: TimeOff[] = []
  for (let d = v.from; d <= v.to && rows.length < 31; d = addDays(d, 1)) {
    rows.push({ id: idFor(d), personId: v.personId, day: d, start: v.allDay ? null : clockToMinutes(v.startTime), end: v.allDay ? null : clockToMinutes(v.endTime) })
  }
  return rows
}
