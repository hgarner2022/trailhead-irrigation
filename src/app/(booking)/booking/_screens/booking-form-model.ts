// The booking form's rules, pure and with no React (docs/plans/2026-11-19-booking-form-design.md): which steps a service has, the question each asks, what lets Continue pass, the price and its
// words, and the words of the confirm step. Jobber's order for the first screens (zip code, then services with their lengths), then contact with how we reach you, the address, the service
// details, the day and an exact start time, and a confirm step that says what happens. A request for a quote has the same first five screens and no day. Nothing here knows about the server.
import { SEASON_PASS_VISITS, seasonPassPrice, visitPrice } from "@/lib/season-pass"
import { emailProblem } from "@/lib/email-check"
import { serviceability } from "@/lib/places"
import { zipCheck } from "@/lib/booking/zip"
import { dayAtTime, type DayTimeOffer, type DayTimePick } from "@/lib/booking/day-time"
import type { ServiceEntry } from "@/lib/booking/services"
import { pickComplete } from "@/components/blocks/DayTimePicker"
import type { ContactChannel } from "@/components/blocks/ContactPreference"
import type { ReviewRow } from "@/components/blocks/BookingReview"
import type { CheckoutFields } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"

export type FormStep = "zip" | "service" | "quote-service" | "contact" | "address" | "details" | "day" | "confirm" | "done"

export const QUESTIONS: Record<FormStep, string> = {
  zip: "What's your zip code?",
  service: "What can we do for you?",
  "quote-service": "What do you need a quote for?",
  contact: "Who should we reach?",
  address: "Where is the yard?",
  details: "A few details about the visit",
  day: "Pick your day and time",
  confirm: "Look it over and confirm.",
  done: "Booked",
}
/** The details step of a request is a different question: there is nothing to size, only something to tell Ryan. */
export const QUOTE_QUESTIONS: Partial<Record<FormStep, string>> = { details: "Tell Ryan about it", confirm: "Look it over and send it." }

/** The steps a service goes through, in order; the last is the confirmation, which is not counted ("Step 3 of 7"). */
export function stepsFor(entry: ServiceEntry | null, quote = false): FormStep[] {
  if (quote || entry?.kind === "quote") return ["zip", "quote-service", "contact", "address", "details", "confirm", "done"]
  return ["zip", "service", "contact", "address", "details", "day", "confirm", "done"]
}
export const stepTotal = (steps: readonly FormStep[]) => steps.length - 1

export const SEND_REQUEST = "Send to Ryan"
export const CONFIRM_BOOK = "Confirm and book"
export const CALL_ME = "Have Ryan call me"
export const ACTIONS: Partial<Record<FormStep, string>> = { zip: "Continue", service: "Continue", "quote-service": "Continue", contact: "Continue", address: "Continue", details: "Continue", day: "Continue", confirm: CONFIRM_BOOK }

export const DAY_HINT = "Tap a start time to continue."
export const SERVICE_HINT = "Pick a service to continue."
export const ZIP_HINT = "Add a zip code we serve to continue."

export const money = (n: number) => `$${n.toLocaleString("en-US")}`

/** The one service price for a zone count: the Season Pass total, the turn-on or the blowout at the standard per-zone rates, a repair visit. */
export function priceFor(entry: ServiceEntry, zones: number): number {
  if (entry.kind === "pass") return seasonPassPrice(zones)
  if (entry.key === "spring-turn-on") return visitPrice(SEASON_PASS_VISITS[0], zones)
  if (entry.key === "fall-blowout") return visitPrice(SEASON_PASS_VISITS[2], zones)
  return Number(entry.price.replace(/\D/g, "")) || 0
}

/** "About $145, charged after the visit." The price is an estimate until Ryan sees the system, and it is never charged before the visit. */
export function priceWords(entry: ServiceEntry, zones: number): string {
  if (entry.kind === "quote") return "Ryan prices it after he looks, in writing, before any work."
  return `About ${money(priceFor(entry, zones))}${entry.kind === "pass" ? " for the season, charged after each visit." : ", charged after the visit."}`
}

/** What each contact field needs, written as help: the field and the fix. Null when the field can pass. */
export function contactProblem(field: "firstName" | "lastName" | "email" | "phone", value: string): string | null {
  switch (field) {
    case "firstName":
      return value.trim() ? null : "Add your first name so Ryan knows who to ask for."
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

/** The words under the zip box once five digits are in, so a screen can name the problem by its field. */
const contactOk = (f: CheckoutFields, terms: boolean) => CONTACT_FIELDS.every((k) => contactProblem(k, f[k]) === null) && (!terms || f.termsAccepted)

export interface FormAnswers {
  zip: string
  service: ServiceEntry | null
  fields: CheckoutFields
  /** one pick per visit: "visit" for a day service, "turn-on" and "blowout" for a pass */
  picks: Record<string, DayTimePick>
  offers: Record<string, DayTimeOffer[]>
  /** "None of these work? Tell us when": the customer's own words */
  when: string
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
    case "zip":
      return zipCheck(a.zip).state === "ok"
    case "service":
    case "quote-service":
      return a.service !== null && !a.service.opens
    case "contact":
      return contactOk(a.fields, a.service?.kind !== "quote")
    case "address":
      return a.fields.place !== null && serviceability(a.fields.place).ok
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

export const townOf = (f: CheckoutFields) => f.town ?? f.place?.town ?? null

/** The phone in the way it is read back: "(970) 555-0123". */
export function phoneWords(phone: string): string {
  const d = phone.replace(/\D/g, "").slice(-10)
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : phone
}

/** What happens when the button is pressed, in one plain sentence per channel. */
export function happensWords(a: { channel: ContactChannel; phone: string; email: string; quote: boolean; callback: boolean }): string {
  const text = phoneWords(a.phone)
  if (a.quote) return `Ryan reads this and calls you at ${text} by tomorrow. He puts the price in writing before any work.`
  if (a.callback) return `Ryan will call you at ${text} to find a day. We'll email a receipt when the visit is done.`
  if (a.channel === "text") return `We'll text you a confirmation to ${text} and email a receipt when it's done.`
  if (a.channel === "email") return `We'll email a confirmation to ${a.email} and email a receipt when it's done.`
  return `We'll text a confirmation to ${text} and email one to ${a.email}, then email a receipt when it's done.`
}

export const channelLine = (c: ContactChannel) => (c === "text" ? "By text" : c === "email" ? "By email" : "By text and email")

export interface ReviewInput {
  service: ServiceEntry
  fields: CheckoutFields
  town: string | null
  zip: string
  pick: DayTimePick | undefined
  when: string
  callback: boolean
  channel: ContactChannel
  photos: number
  quote: boolean
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
      ? [i.when.trim() ? `Ryan will text you a day and time. You asked for: ${i.when.trim()}` : "Ryan will call you to find a day."]
      : i.pick?.day && i.pick.start
        ? [dayAtTime(i.pick.day, i.pick.start)]
        : null
  const rows: (ReviewRow | null)[] = [
    { label: "Service", value: [serviceLine, ...(i.service.length ? [i.service.length] : [])], onChange: () => i.go(i.quote ? "quote-service" : "service") },
    { label: "Where", value: [street, `${i.town ?? ""}${i.town ? ", CO " : ""}${i.zip}`.trim()], onChange: () => i.go("address") },
    when ? { label: "When", value: when, onChange: () => i.go("day") } : null,
    { label: "You", value: [`${f.firstName} ${f.lastName}`.trim(), phoneWords(f.phone), f.email], onChange: () => i.go("contact") },
    { label: "We reach you", value: channelLine(i.channel), onChange: () => i.go("contact") },
    i.quote ? null : { label: "Access", value: f.access === "yes" ? "We can reach the controller and shut-off without you." : "You'll be there for the visit.", onChange: () => i.go("details") },
    i.photos > 0 ? { label: "Photos", value: `${i.photos} photo${i.photos === 1 ? "" : "s"}`, onChange: () => i.go("details") } : null,
    f.accessNote.trim() ? { label: i.quote ? "What you told Ryan" : "Note for the crew", value: f.accessNote.trim(), onChange: () => i.go("details") } : null,
    { label: "Price", value: priceWords(i.service, f.zones) },
  ]
  return rows.filter((r): r is ReviewRow => r !== null)
}
