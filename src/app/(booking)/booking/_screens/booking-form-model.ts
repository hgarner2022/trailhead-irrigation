// The booking form's rules, pure and with no React (docs/plans/2026-11-19-booking-form-design.md): which steps a service has, the heading of each, what lets Continue pass and what a press names when it
// cannot. The first screen is the address (the box is the type-ahead; the ZIP decides the service area), then the service, which holds the details of the service in its own open card (Hannah, Nov 22 2026:
// no separate details step), then a calendar day and an exact start time, then contact, a card and a review. A request for a quote is the address, what we quote, "Details" and contact, with no day.
// The words of the price and the review live in booking-review-model.ts. Nothing here knows about the server.
import type { TimingPreference } from "@/lib/admin/types"
import { exactVisits, preferenceVisits, type PassPlan } from "@/lib/booking/pass-visits"
import { emailProblem } from "@/lib/email-check"
import { SERVICE_ZIPS, outOfAreaMessage, serviceability, zipCityMismatch, type PlaceSuggestion } from "@/lib/places"
import { CITY_PROBLEM, STREET_PROBLEM, typedProblems, type TypedValues } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-address-typed"
import { pickComplete, type DayTimeOffer, type DayTimePick } from "@/lib/booking/day-time"
import type { ServiceEntry } from "@/lib/booking/services"
import type { CheckoutFields } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"

export type FormStep = "address" | "service" | "quote-service" | "details" | "day" | "preference" | "contact" | "card" | "confirm" | "done"

/** The heading of each step: the plain name of what it asks (Hannah, Nov 22 2026). The preference step is named for the visit; see `preferenceQuestion`. */
export const QUESTIONS: Record<FormStep, string> = {
  address: "Address",
  service: "Service",
  "quote-service": "Service",
  details: "Details",
  day: "Day",
  preference: "Preference",
  contact: "Contact",
  card: "Card",
  confirm: "Review",
  done: "Booked",
}
/** A request has the same headings; its details step has nothing to size, only something to tell Ryan. */
export const QUOTE_QUESTIONS: Partial<Record<FormStep, string>> = { details: "Details" }

/**
 * The steps a service goes through, in order; the last is the confirmation, which is not counted ("Step 3 of 7"). The address is first and qualifies the area, so nothing after it is offered outside
 * the six cities' ZIP codes. The service step holds only the service cards (Hannah, Nov 23 2026: the zones and the access question in the card were too much for one screen); the next step, Details, holds
 * what belongs to the chosen service: zones, access, a note and photos. A repair is address, service, details, day, contact, card and review (seven). A Season Pass adds a day for a visit that is exact now
 * and a preference for a visit that is not. Every service has something to ask (access at least), so none skips Details.
 */
export function stepsFor(entry: ServiceEntry | null, quote = false, plan: PassPlan | null = null): FormStep[] {
  if (quote || entry?.kind === "quote") return ["address", "quote-service", "details", "contact", "done"]
  if (entry?.kind === "pass" && plan) return ["address", "service", "details", ...(exactVisits(plan).length ? (["day"] as const) : []), ...(preferenceVisits(plan).length ? (["preference"] as const) : []), "contact", "card", "confirm", "done"]
  return ["address", "service", "details", "day", "contact", "card", "confirm", "done"]
}
export const stepTotal = (steps: readonly FormStep[]) => steps.length - 1

export const SEND_REQUEST = "Send to Ryan"
export const CONFIRM_BOOK = "Confirm and book"
export const CONFIRM_PASS = "Set up my Season Pass"
export const ACTIONS: Partial<Record<FormStep, string>> = { address: "Continue", service: "Continue", "quote-service": "Continue", details: "Continue", day: "Continue", preference: "Continue", contact: "Continue", card: "Save card", confirm: CONFIRM_BOOK }

// Continue is never disabled and no standing hint sits above it (Hannah, Nov 25 2026): pressing it with something missing says what, in these words, at the top of the step and beside the field.
export const SERVICE_PROBLEM = "Pick a service."
export const DAY_PROBLEM = "Pick a time."

/** What each contact field needs, written as help: the field and the fix. Null when the field can pass. */
export function contactProblem(field: "firstName" | "lastName" | "email" | "phone", value: string): string | null {
  switch (field) {
    case "firstName":
      return value.trim() ? null : "Add your first name."
    case "lastName":
      return value.trim() ? null : "Add your last name."
    case "email":
      return value.trim() === "" ? "Add your email." : emailProblem(value) ? "That email doesn't look complete. Check it for a typo." : null
    case "phone": {
      const digits = value.replace(/\D/g, "").length
      return digits === 10 ? null : digits === 0 ? "Add your phone number." : "A phone number has ten digits. Check yours."
    }
  }
}
const CONTACT_FIELDS = ["firstName", "lastName", "email", "phone"] as const
export const ACCESS_PROBLEM = "Tell us whether we can get to the system without you."

// Agreement to the terms is pressing Continue on the contact step (Hannah, Nov 23 2026): there is no box to tick, so nothing here can block on it.
const contactOk = (f: CheckoutFields) => CONTACT_FIELDS.every((k) => contactProblem(k, f[k]) === null)

export interface FormAnswers {
  service: ServiceEntry | null
  fields: CheckoutFields
  /** the typed fields are open under the address box, so a missing city is asked for by name */
  addressTyped?: boolean
  /** what is in the typed fields, to name each gap */
  typed?: TypedValues
  /** one pick per visit: "visit" for a day service, "turn-on" and "blowout" for a pass (only for a visit that takes an exact day now) */
  picks: Record<string, DayTimePick>
  offers: Record<string, DayTimeOffer[]>
  /** the customer's own words when no day is open */
  when: string
  /** a Season Pass: Our recommended, Early season or Late season for each visit that is months away */
  prefs?: Record<string, TimingPreference>
}

/** Whether the day step ends in a call or a text from Ryan: no open day at all. */
export function callbackMode(a: Pick<FormAnswers, "picks" | "offers" | "when">): boolean {
  const keys = Object.keys(a.offers)
  return keys.length > 0 && keys.every((k) => (a.offers[k] ?? []).filter((o) => o.times.length > 0).length === 0)
}

/** Whether the step on screen has what it needs: Continue is off until it does. */
export function canContinue(step: FormStep, a: FormAnswers): boolean {
  switch (step) {
    case "service":
    case "quote-service":
      return a.service !== null
    case "details":
      return a.service?.kind === "quote" || a.fields.access !== null
    case "contact":
      return contactOk(a.fields)
    case "address":
      return areaState(a.fields.place) === "ok"
    case "day":
      return callbackMode(a) || Object.keys(a.offers).every((key) => pickComplete(a.offers[key] ?? [], a.picks[key] ?? { day: null, start: null }))
    default:
      return true
  }
}

/** The fields that could not pass, named for the error summary when more than one is wrong. */
export function problemsFor(step: FormStep, a: FormAnswers): string[] {
  switch (step) {
    case "contact": {
      const label = { firstName: "First name", lastName: "Last name", email: "Email", phone: "Phone" } as const
      return CONTACT_FIELDS.filter((k) => contactProblem(k, a.fields[k]) !== null).map((k) => label[k])
    }
    case "details":
      return a.service?.kind !== "quote" && a.fields.access === null ? ["Access"] : []
    default:
      return canContinue(step, a) ? [] : ["Your choice"]
  }
}

/**
 * What the picked address says about the service area. **The ZIP decides** (Hannah, Nov 22 2026): not picked yet, in the six cities' ZIP codes, outside them, with no city we can read (no city and no ZIP
 * we serve), which asks for the city instead of turning the customer away, or a typed city that is not the town of its ZIP, which is a quiet error beside the city.
 */
export type AreaState = "none" | "ok" | "outside" | "needs-city" | "mismatch"
export function areaState(place: PlaceSuggestion | null): AreaState {
  if (!place) return "none"
  if (serviceability(place).ok) return zipCityMismatch(place) ? "mismatch" : "ok"
  return place.town.trim() === "" && !SERVICE_ZIPS[place.zip] ? "needs-city" : "outside"
}

export const townOf = (f: CheckoutFields) => f.town ?? f.place?.town ?? null

export const PICK_ADDRESS_PROBLEM = "Pick your address from the list."

export interface Problem {
  /** the message, the same words as beside the field */
  message: string
  /** a CSS selector for the field it is about, so the summary can send focus there */
  field: string
}

/** What stops Continue on the step, in the words beside each field, for the summary at the top and the first field to focus. */
export function problemList(step: FormStep, a: FormAnswers): Problem[] {
  switch (step) {
    case "service":
    case "quote-service":
      return a.service === null ? [{ message: SERVICE_PROBLEM, field: "[data-slot=service-picker] button, [data-slot=service-picker] input" }] : []
    case "day":
      return canContinue(step, a) ? [] : [{ message: DAY_PROBLEM, field: "[data-slot=time-chips] input" }]
    case "address": {
      const area = areaState(a.fields.place)
      // An address outside the six cities is a dead end: the line beside the box says so, and a press of Continue says it again at the top.
      if (area === "ok") return []
      if (area === "outside") return [{ message: outOfAreaMessage(serviceability(a.fields.place!) as Extract<ReturnType<typeof serviceability>, { ok: false }>), field: "[role=combobox], [name=address]" }]
      if (area === "mismatch") return [{ message: zipCityMismatch(a.fields.place!)!, field: "[name=city]" }]
      // The typed fields name each of their own gaps; a pick with no city asks for the city.
      if (a.addressTyped && a.typed) return typedProblems(a.typed)
      if (area === "needs-city" || a.addressTyped) return [{ message: a.fields.place === null && a.fields.address.trim().length < 3 ? STREET_PROBLEM : CITY_PROBLEM, field: a.fields.place === null && a.fields.address.trim().length < 3 ? "[name=address]" : "[name=city]" }]
      return [{ message: PICK_ADDRESS_PROBLEM, field: "[role=combobox]" }]
    }
    case "details":
      return a.service?.kind !== "quote" && a.fields.access === null ? [{ message: ACCESS_PROBLEM, field: "[data-slot=access-choice] input" }] : []
    case "contact": {
      const out: Problem[] = []
      for (const k of CONTACT_FIELDS) {
        const message = contactProblem(k, a.fields[k])
        if (message) out.push({ message, field: `[name=${k}]` })
      }
      return out
    }
    default:
      return []
  }
}

/** Whether the customer has entered anything yet: leaving then asks first ("Leave without booking?"); before that it just leaves. */
export function hasEntries(a: { service: ServiceEntry | null; fields: CheckoutFields; when: string; photos: number }): boolean {
  const f = a.fields
  return a.service !== null || f.address.trim() !== "" || f.place !== null || [f.firstName, f.lastName, f.email, f.phone, f.accessNote].some((t) => t.trim() !== "") || a.when.trim() !== "" || a.photos > 0
}

export * from "./booking-extras"
export * from "./booking-review-model"
