// What the booking form says about a Season Pass bought on a date, pure (docs/plans/2026-11-20-season-pass-booking-research.md): the confirm step's rows, one per visit, and the lines of the booked card.
// A visit that is open now shows its exact day and time; a visit that is months away shows its preference and when it is scheduled. The renewal is a stated fact. Nothing here is invented: the sentences
// are the two Hannah allowed (`pass-words.ts`) and the preference words (`preferenceLabel`).
import type { ReviewRow } from "@/components/blocks/BookingReview"
import type { BookedVisitLine } from "@/components/blocks/BookedCard"
import type { TimingPreference } from "@/lib/admin/types"
import { clock12, dayAtTime, type DayTimePick } from "@/lib/booking/day-time"
import { exactVisits, type PassPlan, type PassVisitKind } from "@/lib/booking/pass-visits"
import { RENEWAL_FACTS, SCHEDULE_NOTE, preferenceFull, preferenceStatement } from "@/lib/booking/pass-words"
import { shortDay } from "@/lib/portal/words"
import type { FormStep } from "./booking-form-model"

export const VISIT_NAMES: Record<PassVisitKind, string> = { "turn-on": "Spring turn-on", blowout: "Fall blowout" }

type Picks = Record<string, DayTimePick>
type Prefs = Record<string, TimingPreference>

/** The confirm step's rows for a pass: the season when it starts next year, one row per visit, and the renewal (a Change link goes to the step that asked). */
export function passReviewRows(plan: PassPlan, picks: Picks, prefs: Prefs, go: (step: FormStep) => void): ReviewRow[] {
  const visits = plan.visits.map((v): ReviewRow => {
    if (v.mode === "exact") {
      const p = picks[v.kind]
      return { label: VISIT_NAMES[v.kind], value: p?.day && p.start ? dayAtTime(p.day, p.start) : "No day yet.", onChange: () => go("day") }
    }
    return { label: VISIT_NAMES[v.kind], value: preferenceFull(v.kind, prefs[v.kind] ?? "recommended"), onChange: () => go("preference") }
  })
  const renews = RENEWAL_FACTS[0]!
  return [...(plan.startsNextSeason ? [{ label: "Season", value: String(plan.season) }] : []), ...visits, { label: renews.label, value: renews.value, onChange: () => go("agreement") }]
}

/** The booked card's lines and the visits with an exact day, from what the customer chose. */
export function bookedPassOf(name: string, plan: PassPlan, picks: Picks, prefs: Prefs): { name: string; lines: BookedVisitLine[]; exact: { name: string; day: string; start: string }[] } {
  const lines = plan.visits.map((v): BookedVisitLine => {
    const p = picks[v.kind]
    if (v.mode === "exact") return { name: VISIT_NAMES[v.kind], when: p?.day && p.start ? `${shortDay(p.day)} at ${clock12(p.start)}` : "No day yet" }
    return { name: VISIT_NAMES[v.kind], when: preferenceStatement(v.kind, prefs[v.kind] ?? "recommended"), note: SCHEDULE_NOTE }
  })
  const exact = exactVisits(plan).flatMap((v) => {
    const p = picks[v.kind]
    return p?.day && p.start ? [{ name: VISIT_NAMES[v.kind], day: p.day, start: p.start }] : []
  })
  return { name, lines, exact }
}
