// What the booking form says about a Season Pass bought on a date, pure (docs/plans/2026-11-20-season-pass-booking-research.md): the review step's rows, one per visit, and the lines of the booked card.
// A visit that is open now (or within a month) shows its exact day and time; a visit that is months away shows its preference and, on the booked card, when it is scheduled. A preference is named
// "Our recommended", "Early season" or "Late season" with its month, in the account's own words (`timingLine`; Hannah, Nov 23 2026). A pass is a setup, not an order: each visit row says what it costs and there is no total.
import type { ReviewRow } from "@/components/blocks/BookingReview"
import type { BookedVisitLine } from "@/components/blocks/BookedCard"
import type { TimingPreference } from "@/lib/admin/types"
import { clock12, dayAtTime, type DayTimePick } from "@/lib/booking/day-time"
import { exactVisits, passPlanFor, type PassPlan, type PassVisitKind, type PassVisitPlan } from "@/lib/booking/pass-visits"
import { SCHEDULE_NOTE } from "@/lib/booking/pass-words"
import { money } from "@/lib/booking/services"
import { SEASON_PASS_VISITS, visitPrice } from "@/lib/season-pass"
import { timingLine } from "@/lib/portal/preference-words"
import { shortDay } from "@/lib/portal/words"
import type { FormStep } from "./booking-form-model"

export const VISIT_NAMES: Record<PassVisitKind, string> = { "turn-on": "Spring turn-on", blowout: "Fall blowout" }
/** "Spring turn-on", or "Spring turn-on 2028" for a visit that belongs to next season. */
export const visitName = (v: Pick<PassVisitPlan, "kind" | "season" | "nextSeason">) => (v.nextSeason ? `${VISIT_NAMES[v.kind]} ${v.season}` : VISIT_NAMES[v.kind])

type Picks = Record<string, DayTimePick>
type Prefs = Record<string, TimingPreference>

/** What a visit costs at the customer's zones: the only place the pass shows a price (a setup is not an order, so there is no total). */
export const visitCostWords = (kind: PassVisitKind, zones: number) => `${money(visitPrice(SEASON_PASS_VISITS[kind === "turn-on" ? 0 : 2], zones))}`

/** The Season Pass offer's two price lines for a zone count: each visit of the pass and what it costs, exactly. */
export const upsellPrices = (today: string, zones: number) => passPlanFor(today).visits.map((v) => ({ name: visitName(v), price: visitCostWords(v.kind, zones) }))

/** "Preference: Our recommended, mid May": the account's own phrasing (`timingLine`), so the form, the confirmation and the Season Pass tab read alike. */
export const choiceStatement = (kind: PassVisitKind, preference: TimingPreference) => `Preference: ${timingLine(kind, preference)}`

/**
 * The review step's rows for a pass: the season when it starts next year, and one row per visit with its exact day and time, or its preference, and what it costs (a Change link goes to the step
 * that asked). The preference a visit booked exactly keeps for the seasons after is not said here: it starts as the part of the window of the day picked and is changed in the account.
 */
export function passReviewRows(plan: PassPlan, picks: Picks, _prefs: Prefs, go: (step: FormStep) => void, zones = 8): ReviewRow[] {
  const visits = plan.visits.map((v): ReviewRow => {
    if (v.mode === "exact") {
      const p = picks[v.kind]
      return { label: visitName(v), value: [p?.day && p.start ? dayAtTime(p.day, p.start) : "No day yet.", visitCostWords(v.kind, zones)], onChange: () => go("day") }
    }
    return { label: visitName(v), value: [choiceStatement(v.kind, _prefs[v.kind] ?? "recommended"), visitCostWords(v.kind, zones)], onChange: () => go("preference") }
  })
  return [...(plan.startsNextSeason ? [{ label: "Season", value: String(plan.season) }] : []), ...visits]
}

/** The booked card's lines and the visits with an exact day, from what the customer chose. */
export function bookedPassOf(name: string, plan: PassPlan, picks: Picks, prefs: Prefs): { name: string; lines: BookedVisitLine[]; exact: { name: string; day: string; start: string }[] } {
  const lines = plan.visits.map((v): BookedVisitLine => {
    const p = picks[v.kind]
    if (v.mode === "exact") return { name: visitName(v), when: p?.day && p.start ? `${shortDay(p.day)} at ${clock12(p.start)}` : "No day yet" }
    return { name: visitName(v), when: choiceStatement(v.kind, prefs[v.kind] ?? "recommended"), note: SCHEDULE_NOTE }
  })
  const exact = exactVisits(plan).flatMap((v) => {
    const p = picks[v.kind]
    return p?.day && p.start ? [{ name: visitName(v), day: p.day, start: p.start }] : []
  })
  return { name, lines, exact }
}
