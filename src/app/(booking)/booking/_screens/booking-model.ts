// The booking flow's rules, pure and with no React (docs/plans/2026-11-18-online-booking-design.md sections 3 to 5, with the day step replaced by day and time): which steps a
// service has, the question each asks, what lets Continue pass, and the prices the zones step shows. A day service has Service, Zones (only when the price depends on them),
// Address, Day and time, Contact, Card, Done; a quoted one has Service, Address, Contact, Done; the Season Pass picks a day and time for each of its two visits.
import { visitPrice, SEASON_PASS_VISITS, seasonPassPrice } from "@/lib/season-pass"
import { contactProblem, type CheckoutFields } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { pickComplete } from "@/components/blocks/DayTimePicker"
import { serviceability } from "@/lib/places"
import type { DayTimeOffer, DayTimePick } from "@/lib/booking/day-time"
import type { ServiceEntry } from "@/lib/booking/services"

export type BookingStep = "service" | "quote-service" | "details" | "zones" | "address" | "day" | "contact" | "card" | "done"

export const QUESTIONS: Record<BookingStep, string> = {
  service: "What can we do for you?",
  "quote-service": "What do you need a quote for?",
  details: "Tell Ryan about it",
  zones: "How many zones does your system have?",
  address: "Where is the yard?",
  day: "Pick your day and time",
  contact: "Who should we reach?",
  card: "Save a card for after the visit.",
  done: "Booked",
}

/** The steps a service goes through, in order. */
export function stepsFor(entry: ServiceEntry | null, quote = false): BookingStep[] {
  if (quote || entry?.kind === "quote") return ["quote-service", "address", "details", "contact", "done"]
  if (!entry) return ["service"]
  return ["service", ...(entry.perZone ? (["zones"] as const) : []), "address", "day", "contact", "card", "done"]
}

/** What Continue says on a step. */
export const SEND_REQUEST = "Send to Ryan"
export const ACTIONS: Partial<Record<BookingStep, string>> = { service: "Continue", "quote-service": "Continue", details: "Continue", zones: "Continue", address: "Continue", day: "Continue", contact: "Continue", card: "Save card and book" }

export const DAY_HINT = "Tap a start time to continue."

/** The one service price for a zone count: the Season Pass total, the turn-on or the blowout at the standard per-zone rates. */
export function priceFor(entry: ServiceEntry, zones: number): number {
  if (entry.kind === "pass") return seasonPassPrice(zones)
  if (entry.key === "spring-turn-on") return visitPrice(SEASON_PASS_VISITS[0], zones)
  if (entry.key === "fall-blowout") return visitPrice(SEASON_PASS_VISITS[2], zones)
  return Number(entry.price.replace(/\D/g, "")) || 0
}

export const money = (n: number) => `$${n.toLocaleString("en-US")}`

/** What the quoted path's contact step needs: the four fields, no terms. */
const contactOk = (f: CheckoutFields, terms: boolean) => (["firstName", "lastName", "email", "phone"] as const).every((k) => contactProblem(k, f[k]) === null) && (!terms || f.termsAccepted)

export interface BookingAnswers {
  service: ServiceEntry | null
  fields: CheckoutFields
  /** one pick per visit: "visit" for a day service, "turn-on" and "blowout" for a pass */
  picks: Record<string, DayTimePick>
  offers: Record<string, DayTimeOffer[]>
}

/** Whether the step on screen has what it needs: Continue is off until it does. A day step with no days open can pass (the job is made for a call). */
export function canContinue(step: BookingStep, a: BookingAnswers): boolean {
  switch (step) {
    case "service":
    case "quote-service":
      return a.service !== null && !a.service.opens
    case "zones":
      return a.fields.zones >= 6
    case "address":
      return a.fields.place !== null && serviceability(a.fields.place).ok && (a.service?.kind === "quote" || a.fields.access !== null)
    case "day":
      return Object.keys(a.offers).every((key) => pickComplete(a.offers[key] ?? [], a.picks[key] ?? { day: null, start: null }))
    case "contact":
      return contactOk(a.fields, a.service?.kind !== "quote")
    default:
      return true
  }
}

/** "Sprinkler repair, Erie" and so on: the parts of the summary line over each later step. */
export const townOf = (f: CheckoutFields) => f.town ?? f.place?.town ?? null
