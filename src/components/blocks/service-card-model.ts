// What a service card on the booking form says, read from the catalogue and never retyped (src/lib/booking/services.ts over the backend rows). Pure, no React.
import { PASS_SCHEDULES } from "@/lib/booking/pass-words"
import { includedList, money, shortLength, type ServiceEntry } from "@/lib/booking/services"
import { SERVICE_LIST } from "@/lib/services"

export const CHOOSE = "Choose this service"
export const CHOSEN = "Chosen"
export const REMOVE = "Remove"
export const DETAILS = "Details"
export const HIDE = "Hide"

const upperFirst = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`

/** The catalogue's description as the open card shows it: "A full system check: a, b and c." is a lead line and a list of its parts; any other text is read as it is written. */
export function describe(included?: string): { lead: string; items: string[] } {
  const [first = "", ...rest] = includedList(included)
  const colon = first.indexOf(": ")
  if (colon < 0) return { lead: included ?? "", items: [] }
  return { lead: [first.slice(0, colon), ...rest].map((s) => `${s}.`).join(" "), items: first.slice(colon + 2).split(", ").map(upperFirst) }
}

/** "$95 up to 6 zones, then $10 a zone", from the service's own row; the card's price where the row has no zone rule. */
export function priceRule(entry: ServiceEntry): string {
  const row = SERVICE_LIST.find((s) => s.key === entry.serviceKeys[0])
  if (row?.price !== undefined && row.includedZones && row.extraZonePrice) return `${money(row.price)} up to ${row.includedZones} zones, then ${money(row.extraZonePrice)} a zone`
  return entry.price
}

/** The closed card's one meta line, short enough never to wrap at 375: "From $145 · 1 hr 30 min"; the Season Pass names its visits. */
export function metaLine(entry: ServiceEntry): string {
  if (entry.kind === "pass") return entry.length ?? ""
  return [entry.price, entry.length && entry.minutes ? shortLength(entry.minutes) : null].filter(Boolean).join(" · ")
}

/** What the open card holds: the lead line, the list (a pass lists its visits with what each costs from), and the length and price rule of a single visit. */
export function panelOf(entry: ServiceEntry): { lead: string; items: { text: string; price?: string }[]; facts: { length?: string; rule?: string } } {
  if (entry.kind === "pass") return { lead: PASS_SCHEDULES, items: (entry.passVisits ?? []).map((v) => ({ text: v.name, price: v.price })), facts: {} }
  const { lead, items } = describe(entry.included)
  return { lead, items: items.map((text) => ({ text })), facts: { length: entry.length, rule: priceRule(entry) || undefined } }
}
