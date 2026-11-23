// What the booking form says about price and what it reviews, pure (docs/plans/2026-11-19-booking-form-design.md, "Words (Nov 22 2026)"). The price shows once, in the open service card, with when it is
// charged; everywhere else it is the number alone. The review step lists only what the customer gave, each row with its Change link, and one plain sentence of what happens.
import type { ContactChannel } from "@/components/blocks/ContactPreference"
import type { ReviewRow } from "@/components/blocks/BookingReview"
import type { TimingPreference } from "@/lib/admin/types"
import { dayAtTime, type DayTimePick } from "@/lib/booking/day-time"
import type { PassPlan } from "@/lib/booking/pass-visits"
import { CARD_FOR_PASS, PASS_LINES } from "@/lib/booking/pass-words"
import { PROPERTY_MARK } from "@/lib/booking/known-address"
import { PRICE_AT_VISIT, money, type ServiceEntry } from "@/lib/booking/services"
import { SEASON_PASS_VISITS, seasonPassPrice, visitPrice } from "@/lib/season-pass"
import type { CheckoutFields } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { passReviewRows } from "./booking-pass-model"
import { NO_EXTRAS, extraRows, type Extras } from "./booking-extras"
import type { FormStep } from "./booking-form-model"

export { money }

/** The card step's answer: saved, or put off ("Not now", a one-off only), or not asked yet. The stories draw Stripe's form and a saved card is always this Visa. */
export type CardChoice = "saved" | "file" | "skipped" | null
export const CARD_SAVED = "Visa ending 4242"
export const CARD_NONE = "No card"
/** "file" is the card on file, offered only after the contact step and only to the email on file (`cardToOffer`); its words are the brand and last four it was given. */
export const cardWords = (card: CardChoice, onFile?: string | null) => (card === "file" && onFile ? onFile : card === "saved" ? CARD_SAVED : CARD_NONE)
/** The one line on the card step: when the card is charged, which is how a saved card is used. */
export const cardCharged = (pass: boolean) => (pass ? CARD_FOR_PASS : "Charged after the visit.")


/** The one service price for a zone count: the turn-on, the blowout or the catalogue's own per-zone rule, or a Season Pass's visits added up. Null when the catalogue has none (the visit sets it). */
export function priceFor(entry: ServiceEntry, zones: number, plan: PassPlan | null = null): number | null {
  if (entry.kind === "pass") return plan ? plan.visits.reduce((sum, v) => sum + visitPrice(SEASON_PASS_VISITS[v.kind === "turn-on" ? 0 : 2], zones), 0) : seasonPassPrice(zones)
  if (typeof entry.amount === "function") return entry.amount(zones)
  return entry.amount ?? null
}

/** "About $145" for a priced service; "Price set at the visit" when the catalogue has no price; nothing for a service that is only requested and for a pass, which prices each visit. */
export function priceWords(entry: ServiceEntry, zones: number, plan: PassPlan | null = null): string {
  if (entry.kind === "pass" || entry.kind === "quote") return ""
  const price = priceFor(entry, zones, plan)
  if (price === null) return PRICE_AT_VISIT
  return `About ${money(price)}`
}

/** The phone in the way it is read back: "(970) 555-0123". */
export function phoneWords(phone: string): string {
  const d = phone.replace(/\D/g, "").slice(-10)
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : phone
}

/** What happens when the button is pressed, in one plain sentence per channel. A request says only what we do with the contact the customer gave, never when. */
export function happensWords(a: { channel: ContactChannel; phone: string; email: string; quote: boolean; callback: boolean; pass?: boolean }): string {
  const text = phoneWords(a.phone)
  if (a.quote) return "We'll use this to get back to you about your quote."
  if (a.callback) return `We'll use ${text} to get back to you about a day.`
  const sent = a.channel === "text" ? `We'll text a confirmation to ${text}.` : a.channel === "email" ? `We'll email a confirmation to ${a.email}.` : "We'll text and email a confirmation."
  return a.pass ? `${PASS_LINES[0]} ${sent}` : sent
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
  /** the card on file that was offered and used */
  cardOnFile?: string | null
  /** the address is a property Trailhead already has: its mark reads On file, any other New */
  onFile?: boolean
  go: (step: FormStep) => void
}

/** The rows of the review step: only what the customer gave, each with its Change link to the step that asked. */
export function reviewRows(i: ReviewInput): ReviewRow[] {
  const f = i.fields
  const street = f.place?.line1 ?? f.address
  const serviceLine = [i.service.name, ...(!i.quote && i.service.perZone ? [`${f.zones} zones`] : [])].join(", ")
  const when = i.quote ? null : i.callback ? [i.when.trim() ? `No day yet. You asked for: ${i.when.trim()}` : "No day yet."] : i.pick?.day && i.pick.start ? [dayAtTime(i.pick.day, i.pick.start)] : null
  const passRows: ReviewRow[] = i.plan ? passReviewRows(i.plan, i.picks ?? {}, i.prefs ?? {}, i.go, f.zones) : []
  const service: FormStep = i.quote ? "quote-service" : "service"
  const rows: (ReviewRow | null)[] = [
    { label: "Service", value: serviceLine, onChange: () => i.go(service) },
    { label: "Address", value: [street, `${i.town ?? ""}${i.town ? ", CO " : ""}${f.place?.zip ?? ""}`.trim(), ...(i.quote ? [] : [i.onFile ? PROPERTY_MARK.onFile : PROPERTY_MARK.fresh])], onChange: () => i.go("address") },
    when && !i.plan ? { label: "Day", value: when, onChange: () => i.go("day") } : null,
    ...passRows,
    { label: "Contact", value: [`${f.firstName} ${f.lastName}`.trim(), phoneWords(f.phone), f.email, channelLine(i.channel)], onChange: () => i.go("contact") },
    i.quote ? null : { label: "Access", value: f.access === "yes" ? "You don't need to be there." : "You'll be there.", onChange: () => i.go(service) },
    ...(i.quote ? [] : extraRows(i.service, i.extras ?? NO_EXTRAS, () => i.go(service))),
    i.photos > 0 ? { label: "Photos", value: `${i.photos} photo${i.photos === 1 ? "" : "s"}`, onChange: () => i.go(i.quote ? "details" : service) } : null,
    f.accessNote.trim() ? { label: i.quote ? "Details" : "Note", value: f.accessNote.trim(), onChange: () => i.go(i.quote ? "details" : service) } : null,
    i.quote ? null : { label: "Card", value: cardWords(i.card ?? null, i.cardOnFile), onChange: () => i.go("card") },
    priceWords(i.service, f.zones, i.plan ?? null) ? { label: "Price", value: priceWords(i.service, f.zones, i.plan ?? null) } : null,
  ]
  return rows.filter((r): r is ReviewRow => r !== null)
}
