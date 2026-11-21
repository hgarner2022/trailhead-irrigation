// Which visits a Season Pass bought today holds, and how each one gets its day (docs/plans/2026-11-20-season-pass-booking-research.md, and Hannah's decisions of Nov 20 and Nov 21 2026), pure.
//
// The pass can be bought whenever, and it renews every season, so it holds BOTH visit kinds every time: each kind's next visit. A visit that is open now (today is inside its window) or starts within two
// weeks is booked with an exact day and time ("exact"); every other visit, this season's or next season's (a July buyer's spring turn-on, an October buyer's), takes only a preference, Early, Mid or Late in
// its window ("preference"), and is scheduled about two weeks before. The preference is kept per visit kind for every season, so a renewal schedules the visit without asking again; for a kind booked
// exactly it defaults to the part of the window of the day picked (`preferenceOfDay`). The windows below are the booking fixture's (the spring turn-on opens Apr 25, the fall blowout opens Oct 1), the one
// place the booking form reads them; the closing days are the seed's. Nothing here knows about React or the server.
import type { TimingPreference } from "@/lib/admin/types"

export type PassVisitKind = "turn-on" | "blowout"

/** The one place the booking form reads a visit's window: month and day, repeating every year. */
export const PASS_WINDOWS: Record<PassVisitKind, { opens: string; closes: string }> = {
  "turn-on": { opens: "04-25", closes: "05-31" },
  blowout: { opens: "10-01", closes: "10-31" },
}

/** The visits in season order. */
export const PASS_KINDS: readonly PassVisitKind[] = ["turn-on", "blowout"]

/** A visit this many days or fewer from opening is booked now with an exact day and time. */
export const EXACT_WITHIN_DAYS = 14

/** The first day of the sale that rolls to the next season: after the last window closes, the pass starts next season. */
export const SEASON_ROLLS = "11-01"

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
  /** "Apr 25", or "Apr 25, 2028" when the visit is next season */
  opensLabel: string
}

export interface PassPlan {
  /** the season the pass is named for: this year, or next year for a buyer in November or December */
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

/** The label of a kind's opening day, "Apr 25": what the single-visit cards say ("Opens Apr 25"). */
export const opensLabel = (kind: PassVisitKind) => shortDate(PASS_WINDOWS[kind].opens)

/** The season a purchase today belongs to: the calendar year through October, the next year from November 1. */
export const seasonOf = (today: string): number => +today.slice(0, 4) + (today.slice(5, 10) >= SEASON_ROLLS ? 1 : 0)

/** One visit's window in a season, with its mode for a buyer today. */
function planVisit(kind: PassVisitKind, season: number, today: string): PassVisitPlan {
  const opens = `${season}-${PASS_WINDOWS[kind].opens}`
  const closes = `${season}-${PASS_WINDOWS[kind].closes}`
  const mode: VisitMode = toDays(opens) - toDays(today) <= EXACT_WITHIN_DAYS ? "exact" : "preference"
  const nextSeason = season > +today.slice(0, 4)
  return { kind, season, nextSeason, mode, opens, closes, opensLabel: nextSeason ? `${shortDate(opens)}, ${season}` : shortDate(opens) }
}

/**
 * The visits a pass bought today holds: each kind's next one, soonest first. `today` is YYYY-MM-DD in Mountain time. A kind whose window has closed this year is next year's; from November 1 both
 * are, and both are months away so both take a preference.
 */
export function passPlanFor(today: string): PassPlan {
  const year = +today.slice(0, 4)
  const visits = PASS_KINDS.map((k) => planVisit(k, today <= `${year}-${PASS_WINDOWS[k].closes}` ? year : year + 1, today)).sort((a, b) => a.opens.localeCompare(b.opens))
  return { season: seasonOf(today), visits, startsNextSeason: visits.every((v) => v.nextSeason) }
}

/** The visits that take an exact day now, and those that take a preference. */
export const exactVisits = (plan: PassPlan) => plan.visits.filter((v) => v.mode === "exact")
export const preferenceVisits = (plan: PassPlan) => plan.visits.filter((v) => v.mode === "preference")

/** The days of a visit's window, as one third each (the last gets the remainder): Early, Mid and Late with their real dates. */
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
