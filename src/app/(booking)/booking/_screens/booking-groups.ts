// The day groups and held answers of the booking form, pure: which visits ask a day now and the days offered for each, the day that starts selected (the SOONEST open day, Hannah, Nov 22 2026: "we
// should always try to get them in the soonest"), and the preference each pass visit holds. Split out of BookingForm.tsx.
import type { TimingPreference } from "@/lib/admin/types"
import type { DayTimeOffer, DayTimePick } from "@/lib/booking/day-time"
import { singleRange, visitMinutes } from "@/lib/booking/pass-entry"
import { exactVisits, preferenceOfDay, type PassPlan } from "@/lib/booking/pass-visits"
import type { ServiceEntry } from "@/lib/booking/services"
import { visitName } from "./booking-pass-model"
import type { DayGroup } from "./booking-day"

/** The open days for a visit: from the first day it may be offered to the last (a window's close), the fixture days by default. */
export type OffersFor = (key: string, minutes: number, town: string | null, from?: string, until?: string) => DayTimeOffer[]

export const addDay = (iso: string, n: number) => new Date(new Date(`${iso}T12:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10)

/** A pass asks a day only for a visit that is open now or within a month, with its own length, from tomorrow or the day its window opens, to the day it closes; any other service is one group. */
export function dayGroups(a: { service: ServiceEntry | null; plan: PassPlan | null; today: string; town: string | null; zones: number; offersFor: OffersFor }): DayGroup[] {
  const { service, plan, today, town, zones, offersFor } = a
  if (!service || service.kind === "quote") return []
  const tomorrow = addDay(today, 1)
  if (plan)
    return exactVisits(plan).map((v) => ({ key: v.kind, heading: visitName(v), minutes: visitMinutes(v.kind), offers: offersFor(v.kind, visitMinutes(v.kind), town, v.opens > tomorrow ? v.opens : tomorrow, v.closes) }))
  const minutes = service.minutesFor?.(zones) ?? service.minutes ?? 60
  const { from, until } = singleRange(service, today, tomorrow)
  return [{ key: "visit", minutes, offers: offersFor("visit", minutes, town, from, until) }]
}

/** The soonest day with a time open: the day that starts selected. */
export const soonestDay = (offers: readonly DayTimeOffer[]): string | null => offers.find((o) => o.times.length > 0)?.day ?? null

/** The soonest day starts selected on each visit; a time is never selected for the customer. */
export const heldPicksOf = (groups: readonly DayGroup[], picks: Record<string, DayTimePick>): Record<string, DayTimePick> =>
  Object.fromEntries(groups.map((g) => [g.key, picks[g.key] ?? { day: soonestDay(g.offers), start: null }]))

/** The preference is kept per visit kind for every season: asked for a visit with no day, and for a kind booked exactly it starts as the part of the window of the day picked. */
export function heldPrefsOf(plan: PassPlan | null, heldPicks: Record<string, DayTimePick>, prefs: Record<string, TimingPreference>): Record<string, TimingPreference> {
  return Object.fromEntries(
    (plan?.visits ?? []).map((v) => {
      const day = heldPicks[v.kind]?.day
      return [v.kind, v.mode === "exact" ? (day ? preferenceOfDay(v, day) : "recommended") : (prefs[v.kind] ?? "recommended")]
    }),
  )
}
