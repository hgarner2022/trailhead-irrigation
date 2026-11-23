// Which visits a Season Pass bought today holds, and how each one gets its day (docs/plans/2026-11-20-season-pass-booking-research.md, and Hannah's decisions of Nov 20, 21 and 22 2026), pure.
//
// The pass can be bought whenever, and it renews every season, so it holds BOTH visit kinds every time: each kind's next visit. A visit whose window is open now or opens within a month
// (`EXACT_WITHIN_DAYS`: a buyer in April books the spring turn-on exactly, a buyer in September or October books the blowout exactly) is booked with an exact day and time ("exact"); every other visit,
// this season's or next season's, takes only a preference ("preference") and is scheduled about two weeks before. The preference is kept per visit kind for every season, so a renewal schedules the
// visit without asking again; for a kind booked exactly it defaults to the part of the window of the day picked (`preferenceOfDay`). **The windows are the scheduler's own settings**
// (`defaultWindows` in src/lib/settings/defaults.ts: turn-on May 1 to 31, inspection July 1 to 31, blowout October 1 to November 15), read here and nowhere else in the booking form. Hannah, Nov 22 2026: the
// old fixture's "Opens Apr 25" is not true, and no opening day is shown to a customer until the dates are confirmed. Nothing here knows about React or the server.
import type { TimingPreference } from "@/lib/admin/types"
import { defaultWindows } from "@/lib/settings/defaults"

export type PassVisitKind = "turn-on" | "blowout"
export type WindowKind = PassVisitKind | "inspection"

const monthDay = (iso: string) => iso.slice(5, 10)

/** The one place the booking form reads a visit's window: month and day, repeating every year, from the scheduler's settings. */
export const WINDOWS = Object.fromEntries(defaultWindows(2000).map((w) => [w.kind, { opens: monthDay(w.opensOn), closes: monthDay(w.closesOn) }])) as Record<WindowKind, { opens: string; closes: string }>
export const PASS_WINDOWS: Record<PassVisitKind, { opens: string; closes: string }> = { "turn-on": WINDOWS["turn-on"], blowout: WINDOWS.blowout }

/** The visits in season order. */
export const PASS_KINDS: readonly PassVisitKind[] = ["turn-on", "blowout"]

/** A visit this many days or fewer from opening is booked now with an exact day and time: 30 days, so April for the turn-on and September for the blowout. */
export const EXACT_WITHIN_DAYS = 30

/** The day after the last window closes ("11-16"): from it the pass starts next season. */
const dayAfter = (md: string) => new Date(Date.UTC(2001, +md.slice(0, 2) - 1, +md.slice(3, 5) + 1)).toISOString().slice(5, 10)
export const SEASON_ROLLS = dayAfter(PASS_KINDS.map((k) => PASS_WINDOWS[k].closes).sort().at(-1)!)

export type VisitMode = "exact" | "preference"

export interface PassVisitPlan {
  kind: PassVisitKind
  season: number
  /** the visit belongs to a season after this calendar year (a July buyer's spring turn-on) */
  nextSeason: boolean
  mode: VisitMode
  /** YYYY-MM-DD */
  opens: string
  closes: string
}

export interface PassPlan {
  /** the season the pass is named for: this year, or next year once the last window has closed */
  season: number
  /** each kind's next visit, soonest first; every one has a day to come */
  visits: PassVisitPlan[]
  /** nothing is left this season, so every visit is next season's */
  startsNextSeason: boolean
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const toDays = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86_400_000
const fromDays = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10)

/** "Apr 25" from "2027-04-25" or "04-25". */
export function shortDate(iso: string): string {
  const md = iso.slice(-5)
  return `${MONTHS[+md.slice(0, 2) - 1]} ${+md.slice(3, 5)}`
}

/**
 * The days a single visit of this kind may be offered: its window this year while today is before it closes, else next year's (the engine offers a service with dates "through its next run of dates and
 * no further"). The booking form starts its days from the later of the opening day and tomorrow, and stops at the closing day.
 */
export function nextRun(kind: WindowKind, today: string): { opens: string; closes: string } {
  const year = +today.slice(0, 4)
  const w = WINDOWS[kind]
  const y = monthDay(today) <= w.closes ? year : year + 1
  return { opens: `${y}-${w.opens}`, closes: `${y}-${w.closes}` }
}

/** The season a purchase today belongs to: the calendar year until the day after the last window closes, the next year from then. */
export const seasonOf = (today: string): number => +today.slice(0, 4) + (monthDay(today) >= SEASON_ROLLS ? 1 : 0)

/** One visit's window in a season, with its mode for a buyer today. */
function planVisit(kind: PassVisitKind, season: number, today: string): PassVisitPlan {
  const opens = `${season}-${PASS_WINDOWS[kind].opens}`
  const closes = `${season}-${PASS_WINDOWS[kind].closes}`
  const mode: VisitMode = toDays(opens) - toDays(today) <= EXACT_WITHIN_DAYS ? "exact" : "preference"
  const nextSeason = season > +today.slice(0, 4)
  return { kind, season, nextSeason, mode, opens, closes }
}

/**
 * The visits a pass bought today holds: each kind's next one, soonest first. `today` is YYYY-MM-DD in Mountain time. A kind whose window has closed this year is next year's; once the last window has
 * closed both are, and both are months away so both take a preference.
 */
export function passPlanFor(today: string): PassPlan {
  const year = +today.slice(0, 4)
  const visits = PASS_KINDS.map((k) => planVisit(k, today <= `${year}-${PASS_WINDOWS[k].closes}` ? year : year + 1, today)).sort((a, b) => a.opens.localeCompare(b.opens))
  return { season: seasonOf(today), visits, startsNextSeason: visits.every((v) => v.nextSeason) }
}

/** The visits that take an exact day now, and those that take a preference. */
export const exactVisits = (plan: PassPlan) => plan.visits.filter((v) => v.mode === "exact")
export const preferenceVisits = (plan: PassPlan) => plan.visits.filter((v) => v.mode === "preference")

/** The days of a visit's window, as one third each (the last gets the remainder): Early, Mid and Late. Used to work out which part a day falls in; the form shows the names only. */
export function preferenceDates(v: Pick<PassVisitPlan, "opens" | "closes">): Record<TimingPreference, { from: string; to: string }> {
  const start = toDays(v.opens)
  const total = toDays(v.closes) - start + 1
  const third = Math.floor(total / 3)
  const at = (offset: number) => fromDays(start + offset)
  return {
    earlier: { from: at(0), to: at(third - 1) },
    recommended: { from: at(third), to: at(2 * third - 1) },
    later: { from: at(2 * third), to: at(total - 1) },
  }
}

/** The part of a visit's window a day falls in: the preference a kind booked exactly starts with, kept for the seasons after. */
export function preferenceOfDay(v: Pick<PassVisitPlan, "opens" | "closes">, day: string): TimingPreference {
  const dates = preferenceDates(v)
  return day <= dates.earlier.to ? "earlier" : day <= dates.recommended.to ? "recommended" : "later"
}

/** "Oct 1 to Oct 10" */
export const rangeWords = (r: { from: string; to: string }) => `${shortDate(r.from)} to ${shortDate(r.to)}`
