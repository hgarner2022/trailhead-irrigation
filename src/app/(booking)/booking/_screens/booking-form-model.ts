// The booking form's rules, pure and with no React (docs/plans/2026-11-19-booking-form-design.md): which steps a service has, the question each asks, what lets Continue pass, the price and its
// words, and the words of the confirm step. The first screen is the address (Hannah, Nov 20 2026: no zip step, the address qualifies the yard: its city and zip decide the service area), then the
// services with their lengths, the service details, the day and an exact start time, contact with how we reach you, a card, and a confirm step that says what happens. A request for a quote is the address,
// what we quote, "Tell Ryan about it" and contact, with no day. Nothing here knows about the server.
import { SEASON_PASS_VISITS, seasonPassPrice, visitPrice } from "@/lib/season-pass"
import type { TimingPreference } from "@/lib/admin/types"
import { exactVisits, preferenceVisits, type PassPlan } from "@/lib/booking/pass-visits"
import { CARD_FOR_PASS, NOTHING_CHARGED } from "@/lib/booking/pass-words"
import { passReviewRows } from "./booking-pass-model"
import { emailProblem } from "@/lib/email-check"
import { SERVICE_ZIPS, serviceability, type PlaceSuggestion } from "@/lib/places"
import { CITY_PROBLEM, STREET_PROBLEM } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-address-typed"
import { dayAtTime, type DayTimeOffer, type DayTimePick } from "@/lib/booking/day-time"
import { PRICE_AT_VISIT, type ServiceEntry } from "@/lib/booking/services"
import { pickComplete } from "@/components/blocks/DayTimePicker"
import type { ContactChannel } from "@/components/blocks/ContactPreference"
import type { ReviewRow } from "@/components/blocks/BookingReview"
import type { CheckoutFields } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"

export type FormStep = "address" | "service" | "quote-service" | "details" | "day" | "preference" | "pass" | "contact" | "card" | "confirm" | "done"

export const QUESTIONS: Record<FormStep, string> = {
  address: "Where is the yard?",
  service: "What can we do for you?",
  "quote-service": "What do you need a quote for?",
  details: "A few details about the visit",
  day: "Pick your day and time",
  preference: "When would you like it?",
  pass: "Your Season Pass",
  contact: "Who should we reach?",
  card: "Add a card",
  confirm: "Look it over and confirm.",
  done: "Booked",
}
/** The details step of a request is a different question: there is nothing to size, only something to tell Ryan. */
export const QUOTE_QUESTIONS: Partial<Record<FormStep, string>> = { details: "Tell Ryan about it", contact: "How can Ryan reach you?" }

/** The steps a service goes through, in order; the last is the confirmation, which is not counted ("Step 3 of 6"). The address is first and qualifies the area, so nothing after it is offered outside the six cities. */
export function stepsFor(entry: ServiceEntry | null, quote = false, plan: PassPlan | null = null): FormStep[] {
  if (quote || entry?.kind === "quote") return ["address", "quote-service", "details", "contact", "done"]
  // A Season Pass bought on a date: an exact day and time for a visit that is open now, a preference for a visit months away, what the pass is, then contact. Every booking ends with a card before the look-over.
  if (entry?.kind === "pass" && plan) {
    return ["address", "service", "details", ...(exactVisits(plan).length ? (["day"] as const) : []), ...(preferenceVisits(plan).length ? (["preference"] as const) : []), "pass", "contact", "card", "confirm", "done"]
  }
  return ["address", "service", "details", "day", "contact", "card", "confirm", "done"]
}
export const stepTotal = (steps: readonly FormStep[]) => steps.length - 1

export const SEND_REQUEST = "Send to Ryan"
export const CONFIRM_BOOK = "Confirm and book"
export const CONFIRM_PASS = "Set up my Season Pass"
export const ACTIONS: Partial<Record<FormStep, string>> = { address: "Continue", service: "Continue", "quote-service": "Continue", details: "Continue", day: "Continue", preference: "Continue", pass: "Continue", contact: "Continue", card: "Save card", confirm: CONFIRM_BOOK }

/** The card step's answer: saved, or put off ("Not now", a one-off only), or not asked yet. The stories draw Stripe's form and a saved card is always this Visa. */
export type CardChoice = "saved" | "skipped" | null
export const CARD_SAVED = "Visa ending 4242"
export const CARD_NONE = "No card"
export const cardWords = (card: CardChoice) => (card === "saved" ? CARD_SAVED : CARD_NONE)
/** The one line on the card step: when the card is charged. For a pass nothing is charged now. */
export const cardCharged = (pass: boolean) => (pass ? CARD_FOR_PASS : "Charged after the visit.")

export const DAY_HINT = "Tap a start time to continue."
export const SERVICE_HINT = "Pick a service to continue."

export const money = (n: number) => `$${n.toLocaleString("en-US")}`

/** The one service price for a zone count: the Season Pass total, the turn-on or the blowout at the standard per-zone rates, or the catalogue's own price. Null when the catalogue has none (the visit sets it). */
export function priceFor(entry: ServiceEntry, zones: number, plan: PassPlan | null = null): number | null {
  if (entry.kind === "pass") return plan ? plan.visits.reduce((sum, v) => sum + visitPrice(SEASON_PASS_VISITS[v.kind === "turn-on" ? 0 : 2], zones), 0) : seasonPassPrice(zones)
  if (entry.key === "spring-turn-on") return visitPrice(SEASON_PASS_VISITS[0], zones)
  if (entry.key === "fall-blowout") return visitPrice(SEASON_PASS_VISITS[2], zones)
  if (typeof entry.amount === "function") return entry.amount(zones)
  return entry.amount ?? null
}

/** "About $145, charged after the visit." for a priced service; "Price set at the visit" when the catalogue has no price; nothing is said for a service that is only requested. */
export function priceWords(entry: ServiceEntry, zones: number, plan: PassPlan | null = null): string {
  // A Season Pass is a setup, not an order: each visit says what it costs, and the pass has no total.
  if (entry.kind === "pass") return ""
  const price = priceFor(entry, zones, plan)
  if (price === null) return entry.kind === "quote" ? "" : `${PRICE_AT_VISIT}.`
  if (price === 0) return "Free."
  return `About ${money(price)}, charged after the visit.`
}

export * from "./booking-extras"
import { NO_EXTRAS, extraRows, type Extras } from "./booking-extras"

/** What each contact field needs, written as help: the field and the fix. Null when the field can pass. */
export function contactProblem(field: "firstName" | "lastName" | "email" | "phone", value: string): string | null {
  switch (field) {
    case "firstName":
      return value.trim() ? null : "Add your first name."
    case "lastName":
      return value.trim() ? null : "Add your last name."
    case "email":
      return value.trim() === "" ? "Add an email so we can send your receipt." : emailProblem(value) ? "That email doesn't look complete. Check it for a typo." : null
    case "phone": {
      const digits = value.replace(/\D/g, "").length
      return digits === 10 ? null : digits === 0 ? "Add a phone number so we can text you the day." : "A phone number has ten digits. Check yours."
    }
  }
}
const CONTACT_FIELDS = ["firstName", "lastName", "email", "phone"] as const
export const TERMS_PROBLEM = "Tick the box to accept the terms."
export const ACCESS_PROBLEM = "Tell us whether we can get to the system without you."

const contactOk = (f: CheckoutFields, terms: boolean) => CONTACT_FIELDS.every((k) => contactProblem(k, f[k]) === null) && (!terms || f.termsAccepted)

export interface FormAnswers {
  service: ServiceEntry | null
  fields: CheckoutFields
  /** the typed fields are open under the address box, so a missing city is asked for by name */
  addressTyped?: boolean
  /** one pick per visit: "visit" for a day service, "turn-on" and "blowout" for a pass (only for a visit that takes an exact day now) */
  picks: Record<string, DayTimePick>
  offers: Record<string, DayTimeOffer[]>
  /** "None of these work? Tell us when": the customer's own words */
  when: string
  /** a Season Pass: Early, Mid or Late for each visit that is months away */
  prefs?: Record<string, TimingPreference>
}

/** Whether the day step ends in a call or a text from Ryan: no open day, or no time tapped and the customer said when instead. */
export function callbackMode(a: Pick<FormAnswers, "picks" | "offers" | "when">): boolean {
  const keys = Object.keys(a.offers)
  if (keys.length === 0) return false
  if (keys.every((k) => (a.offers[k] ?? []).length === 0)) return true
  return a.when.trim() !== "" && keys.some((k) => a.picks[k]?.start == null)
}

/** Whether the step on screen has what it needs: Continue is off until it does. */
export function canContinue(step: FormStep, a: FormAnswers): boolean {
  switch (step) {
    case "service":
    case "quote-service":
      return a.service !== null && !a.service.opens
    case "contact":
      return contactOk(a.fields, a.service?.kind !== "quote")
    case "address":
      return areaState(a.fields.place) === "ok"
    case "details":
      return a.service?.kind === "quote" || a.fields.access !== null
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
      return [...CONTACT_FIELDS.filter((k) => contactProblem(k, a.fields[k]) !== null).map((k) => label[k]), ...(a.service?.kind === "quote" || a.fields.termsAccepted ? [] : ["Terms"])]
    }
    case "details":
      return a.service?.kind === "quote" || a.fields.access !== null ? [] : ["Access"]
    default:
      return canContinue(step, a) ? [] : ["Your choice"]
  }
}

/** What the picked address says about the service area: not picked yet, in the six cities (by city name, then zip), outside them, or with no city we can read (no city and no zip we serve), which asks for the city instead of turning the customer away. */
export type AreaState = "none" | "ok" | "outside" | "needs-city"
export function areaState(place: PlaceSuggestion | null): AreaState {
  if (!place) return "none"
  if (serviceability(place).ok) return "ok"
  return place.town.trim() === "" && !SERVICE_ZIPS[place.zip] ? "needs-city" : "outside"
}

export const townOf = (f: CheckoutFields) => f.town ?? f.place?.town ?? null

/** The phone in the way it is read back: "(970) 555-0123". */
export function phoneWords(phone: string): string {
  const d = phone.replace(/\D/g, "").slice(-10)
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : phone
}

/** What happens when the button is pressed, in one plain sentence per channel. A request says only what we do with the contact the customer gave, never when. */
export function happensWords(a: { channel: ContactChannel; phone: string; email: string; quote: boolean; callback: boolean; pass?: boolean }): string {
  const text = phoneWords(a.phone)
  if (a.pass) return `${NOTHING_CHARGED} ${happensWords({ ...a, pass: false })}`
  if (a.quote) return "We'll use this to get back to you about your quote."
  if (a.callback) return `We'll use ${text} to get back to you about a day.`
  if (a.channel === "text") return `We'll text you a confirmation to ${text} and email a receipt when it's done.`
  if (a.channel === "email") return `We'll email a confirmation to ${a.email} and email a receipt when it's done.`
  return `We'll text a confirmation to ${text} and email one to ${a.email}, then email a receipt when it's done.`
}

export const channelLine = (c: ContactChannel) => (c === "text" ? "By text" : c === "email" ? "By email" : "By text and email")

export interface ReviewInput {
  service: ServiceEntry
  fields: CheckoutFields
  town: string | null
  pick: DayTimePick | undefined
  /** a Season Pass bought on a date: what it holds, the day and time of each exact visit and the preference of each other one */
  plan?: PassPlan | null
  picks?: Record<string, DayTimePick>
  prefs?: Record<string, TimingPreference>
  when: string
  callback: boolean
  channel: ContactChannel
  photos: number
  quote: boolean
  extras?: Extras
  card?: CardChoice
  go: (step: FormStep) => void
}

/** The rows of the confirm step: only what the customer gave, each with its Change link to the step that asked. */
export function reviewRows(i: ReviewInput): ReviewRow[] {
  const f = i.fields
  const street = f.place?.line1 ?? f.address
  const serviceLine = [i.service.name, ...(!i.quote && i.service.perZone ? [`${f.zones} zones`] : [])].join(", ")
  const when = i.quote
    ? null
    : i.callback
      ? [i.when.trim() ? `No day yet. You asked for: ${i.when.trim()}` : "No day yet."]
      : i.pick?.day && i.pick.start
        ? [dayAtTime(i.pick.day, i.pick.start)]
        : null
  const passRows: ReviewRow[] = i.plan ? passReviewRows(i.plan, i.picks ?? {}, i.prefs ?? {}, i.go, f.zones) : []
  const rows: (ReviewRow | null)[] = [
    { label: "Service", value: [serviceLine, ...(i.service.length ? [i.service.length] : [])], onChange: () => i.go(i.quote ? "quote-service" : "service") },
    { label: "Where", value: [street, `${i.town ?? ""}${i.town ? ", CO " : ""}${f.place?.zip ?? ""}`.trim()], onChange: () => i.go("address") },
    when && !i.plan ? { label: "When", value: when, onChange: () => i.go("day") } : null,
    ...passRows,
    { label: "You", value: [`${f.firstName} ${f.lastName}`.trim(), phoneWords(f.phone), f.email], onChange: () => i.go("contact") },
    { label: "We reach you", value: channelLine(i.channel), onChange: () => i.go("contact") },
    i.quote ? null : { label: "Access", value: f.access === "yes" ? "We can reach the controller and shut-off without you." : "You'll be there.", onChange: () => i.go("details") },
    ...(i.quote ? [] : extraRows(i.service, i.extras ?? NO_EXTRAS, () => i.go("details"))),
    i.photos > 0 ? { label: "Photos", value: `${i.photos} photo${i.photos === 1 ? "" : "s"}`, onChange: () => i.go("details") } : null,
    f.accessNote.trim() ? { label: i.quote ? "What you wrote" : "Note for the crew", value: f.accessNote.trim(), onChange: () => i.go("details") } : null,
    i.quote ? null : { label: "Card", value: cardWords(i.card ?? null), onChange: () => i.go("card") },
    priceWords(i.service, f.zones, i.plan ?? null) ? { label: "Price", value: priceWords(i.service, f.zones, i.plan ?? null) } : null,
  ]
  return rows.filter((r): r is ReviewRow => r !== null)
}

/** Whether the customer has entered anything yet: leaving then asks first ("Leave without booking?"); before that it just leaves. */
export function hasEntries(a: { service: ServiceEntry | null; fields: CheckoutFields; when: string; photos: number }): boolean {
  const f = a.fields
  return a.service !== null || f.address.trim() !== "" || f.place !== null || [f.firstName, f.lastName, f.email, f.phone, f.accessNote].some((t) => t.trim() !== "") || a.when.trim() !== "" || a.photos > 0
}

export const PICK_ADDRESS_PROBLEM = "Pick your address from the list so we have it right."

export interface Problem {
  /** the message, the same words as beside the field */
  message: string
  /** a CSS selector for the field it is about, so the summary can send focus there */
  field: string
}

/** What stops Continue on the step, in the words beside each field, for the summary at the top and the first field to focus. */
export function problemList(step: FormStep, a: FormAnswers): Problem[] {
  switch (step) {
    case "address": {
      const area = areaState(a.fields.place)
      // An address outside the six cities is a dead end with its own line beside the box; a missing city is asked for by name.
      if (area === "ok" || area === "outside") return []
      if (area === "needs-city" || a.addressTyped) return a.fields.place === null && a.fields.address.trim().length < 3 ? [{ message: STREET_PROBLEM, field: "[name=address]" }] : [{ message: CITY_PROBLEM, field: "[name=city]" }]
      return [{ message: PICK_ADDRESS_PROBLEM, field: "[role=combobox]" }]
    }
    case "details":
      return a.service?.kind === "quote" || a.fields.access !== null ? [] : [{ message: ACCESS_PROBLEM, field: "[data-slot=access-choice] input" }]
    case "contact": {
      const out: Problem[] = []
      for (const k of CONTACT_FIELDS) {
        const message = contactProblem(k, a.fields[k])
        if (message) out.push({ message, field: `[name=${k}]` })
      }
      if (a.service?.kind !== "quote" && !a.fields.termsAccepted) out.push({ message: TERMS_PROBLEM, field: "[data-slot=booking-terms] [role=checkbox]" })
      return out
    }
    default:
      return []
  }
}
