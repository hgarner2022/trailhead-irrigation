/**
 * Place and Place all, pure (docs/plans/2026-11-18-admin-holistic-design.md, 5.2 and 6). One rule, no setting: the scheduling engine's
 * offer rule (`offerFor`, docs/plans/2026-11-18-scheduling-engine-design.md, section 4) run for the job, and its preselected day
 * (the soonest open days, nearness to work already on the road ordering them, tomorrow the earliest) goes to the person whose open
 * slot adds the least drive. A pass's visit keeps to its season window; a one-off has none. The job stays "Any time": no slot is
 * written here. The API refuses a placement that breaks a hard rule, so this plan only chooses where to try.
 */
import type { BusyBlock, Person, SeasonWindow, Visit } from "@/lib/admin/types"
import { addDays, dayOf } from "@/lib/admin/calendar"
import { shortDate, writtenDate } from "@/lib/admin/format"
import { HORIZON_DAYS, offerFor, type BookedVisit, type BlockedSpan } from "@/lib/scheduling/offer"
import { defaultMinutes } from "@/lib/scheduling/types"
import { monthDayOfDate, windowAt } from "@/lib/services-window"
import type { TrayItem } from "./schedule-model"
import { placeVisit } from "./schedule-model"

/** How far past today a job with no window of its own is looked for: the offer rule's horizon. */
export const PLACE_HORIZON_DAYS = HORIZON_DAYS

export interface PlaceContext {
  visits: Visit[]
  people: Person[]
  /** kept for callers that still pass them; the offer rule has no areas */
  areas?: unknown
  windows: SeasonWindow[]
  blocks?: BusyBlock[]
  /** the calendar day today is; the first day offered is the day after */
  today: string
  timeZone: string
}

export interface Placement {
  item: TrayItem
  personId: string
  personName: string
  /** YYYY-MM-DD */
  day: string
}

export type PlaceResult = { ok: true; item: TrayItem; placement: Placement } | { ok: false; item: TrayItem; reason: string }

/** The season window a pass's visit must land in; a one-off job's visit has none. */
const windowOf = (item: TrayItem, windows: SeasonWindow[], today: string) => {
  const found = item.passId ? windows.find((w) => w.kind === item.kind) : undefined
  // read year-agnostic: the saved window carries a year nothing rolls, so it is the season holding (or next after) tomorrow
  return found ? windowAt(found, addDays(today, 1)) : undefined
}

/** A calendar block as the busy spans of the days it touches (Mountain, to the minute). */
function spansOf(blocks: BusyBlock[], timeZone: string): BlockedSpan[] {
  const clock = new Intl.DateTimeFormat("en-GB", { timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" })
  const out: BlockedSpan[] = []
  for (const b of blocks) {
    const a = dayOf(b.startAt, timeZone)
    const z = dayOf(b.endAt, timeZone)
    for (let day = a; day <= z; day = addDays(day, 1)) {
      out.push({ personId: b.personId, day, start: day === a ? clock.format(new Date(b.startAt)) : "00:00", end: day === z ? clock.format(new Date(b.endAt)) : "24:00" })
    }
  }
  return out
}

/** Where the job goes: the offer rule's preselected day with the person whose slot adds the least drive; or why there is none. */
export function placeFor(item: TrayItem, ctx: PlaceContext): PlaceResult {
  const window = windowOf(item, ctx.windows, ctx.today)
  const first = addDays(ctx.today, 1)
  const from = window && window.opensOn.slice(0, 10) > first ? window.opensOn.slice(0, 10) : first
  const last = window ? window.closesOn.slice(0, 10) : addDays(ctx.today, PLACE_HORIZON_DAYS)
  const own = ctx.visits.find((v) => v.id === item.id)
  const booked: BookedVisit[] = ctx.visits
    .filter((v) => v.id !== item.id && v.status !== "cancelled" && v.startAt && v.personId)
    .map((v) => ({
      personId: v.personId!,
      day: dayOf(v.startAt!, ctx.timeZone),
      // a pass visit's start is only the stack its day was ordered in: busy time with no place
      start: !v.isPass && v.startTime ? v.startTime : null,
      minutes: v.minutes ?? defaultMinutes(v.kind),
      kind: v.kind,
      town: v.town,
      point: v.lat !== undefined && v.lng !== undefined ? { lat: v.lat, lng: v.lng } : null,
    }))
  const offers = offerFor({
    today: addDays(from, -1) > ctx.today ? addDays(from, -1) : ctx.today,
    service: { minutes: own?.minutes ?? defaultMinutes(item.kind), kind: item.kind, bookableFrom: window ? monthDayOfDate(window.opensOn.slice(0, 10)) : null, bookableTo: window ? monthDayOfDate(window.closesOn.slice(0, 10)) : null },
    property: { town: item.town, point: own?.lat !== undefined && own?.lng !== undefined ? { lat: own.lat, lng: own.lng } : null },
    people: ctx.people.map((p) => ({ id: p.id, workingDays: p.workingDays, hoursStart: p.hoursStart, hoursEnd: p.hoursEnd, capsByKind: p.capacityByKind, from: p.seasonStart?.slice(0, 10) || null, to: p.seasonEnd?.slice(0, 10) || null })),
    booked,
    blocked: spansOf(ctx.blocks ?? [], ctx.timeZone),
  }).filter((o) => o.day >= from && o.day <= last)
  const best = offers.find((o) => o.best) ?? offers[0]
  const slot = best?.slots[0]
  const person = slot ? ctx.people.find((p) => p.id === slot.personId) : undefined
  if (best && person) return { ok: true, item, placement: { item, personId: person.id, personName: person.name, day: best.day } }
  return { ok: false, item, reason: `No open day before ${shortDate(last)}. Pick a day yourself.` }
}

/** Every job in the list, one after another: each placement fills its day for the next, so two jobs never take the last place. */
export function placeAllPlan(items: TrayItem[], ctx: PlaceContext): PlaceResult[] {
  let visits = ctx.visits
  return items
    .filter((item) => !item.awaitingPick)
    .map((item) => {
      const result = placeFor(item, { ...ctx, visits })
      if (result.ok) visits = placeVisit(visits, item, { id: result.placement.personId, name: result.placement.personName }, result.placement.day, ctx.timeZone)
      return result
    })
}

/** The placements of a plan that found a day. */
export const placed = (plan: PlaceResult[]): Placement[] => plan.flatMap((r) => (r.ok ? [r.placement] : []))

/** The visits as they were on the server for one job: its row there, or no row (a fixture's stand-in is taken off again). */
export function restoreVisit(visits: Visit[], visitId: string, server: Visit[]): Visit[] {
  const original = server.find((v) => v.id === visitId)
  return original ? visits.map((v) => (v.id === visitId ? original : v)) : visits.filter((v) => v.id !== visitId)
}

/** The visits with every pending placement laid on, as the screen shows them before the text goes. */
export function withPlacements(visits: Visit[], pending: Placement[], timeZone: string): Visit[] {
  return pending.reduce((v, p) => placeVisit(v, p.item, { id: p.personId, name: p.personName }, p.day, timeZone), visits)
}

/** "Tue Nov 24" for a day key, with the weekday, for the preview and the strip. */
export const placeDayWords = (day: string): string => `${new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })} ${shortDate(day)}`

/** The API's refusal as the Schedule says it: no "visit" and no ISO date ("Ryan Garner is full of turn-on visits on 2027-04-26" reads "Ryan Garner is full of turn-on jobs on April 26"). */
export function plainRefusal(message: string): string {
  return message
    .replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (day) => writtenDate(day))
    .replace(/\bvisits\b/g, "jobs")
    .replace(/\bvisit\b/g, "job")
}
