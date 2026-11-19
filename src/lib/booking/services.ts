// The services a customer can book online, one entry per service, in the order the picker shows them (docs/plans/2026-11-18-online-booking-design.md section 6). The
// real list will come from `pickerEntries(catalogue, today)`; this file is the fixture the stories use, with the same shape. Pure.

export type ServiceKind =
  /** the Season Pass: two visits, priced per zone */
  | "pass"
  /** a service with a day and time */
  | "day"
  /** priced after Ryan looks: the flow ends with "We'll call you" */
  | "quote"

export interface ServiceEntry {
  key: string
  name: string
  /** one sentence from the catalogue */
  line: string
  /** "$145", "From $145", or "Priced after Ryan looks." */
  price: string
  /** "About 2 hours" */
  length?: string
  /** the rest of the catalogue text, behind "What's included" */
  included?: string
  kind: ServiceKind
  /** minutes a visit takes: sizes the start times */
  minutes?: number
  /** whether the price depends on the zone count: the zones step shows */
  perZone?: boolean
  /** "Opens Apr 25": out of season, shown and not selectable */
  opens?: string
}

export const SERVICES: readonly ServiceEntry[] = [
  { key: "season-pass", name: "Season Pass 2027", line: "Both visits, and your days held when you reserve.", price: "From $240", length: "Spring turn-on and fall blowout", included: "A spring turn-on and a fall blowout at the standard per-zone price, your days held, the same schedule every year and priority for repairs. Add a July inspection at checkout.", kind: "pass", minutes: 60, perZone: true },
  { key: "spring-turn-on", name: "Spring turn-on", line: "Start the system up, run every zone and check each head.", price: "From $145", length: "About 1 hour", included: "We turn the water on, pressurize the lines, run every zone and check each head for leaks, clogs and aim.", kind: "day", minutes: 60, perZone: true, opens: "Apr 25" },
  { key: "fall-blowout", name: "Fall blowout", line: "Clear the water out of the lines before the first hard freeze.", price: "From $95", length: "About 30 minutes", included: "We drain the system with compressed air, zone by zone, and shut off and drain the backflow preventer.", kind: "day", minutes: 30, perZone: true, opens: "Oct 1" },
  { key: "repair", name: "Sprinkler repair", line: "Find the fault and fix what we can.", price: "$145", length: "About 2 hours", included: "One visit to find what is wrong and repair it. If Ryan finds bigger work, he quotes it first and you decide.", kind: "day", minutes: 120 },
]

/**
 * What a customer asks for a quote on: the services whose Online setting (Settings > Services) is "We quote". They are never in the booking list (Hannah, Nov 18 2026: a service we do not book
 * online is removed from the form and the site, and goes to a request instead); the "Request a quote" path offers them. A service set to Off appears in neither list.
 */
export const QUOTE_SERVICES: readonly ServiceEntry[] = [
  { key: "rachio", name: "Rachio smart controller", line: "A controller that waters by the weather.", price: "Priced after Ryan looks.", kind: "quote" },
  { key: "new-system", name: "New sprinkler system", line: "A system designed for your yard.", price: "Priced after Ryan looks.", kind: "quote" },
  { key: "lights", name: "Christmas lights", line: "Hung, lit and taken down for you.", price: "Priced after Ryan looks.", kind: "quote" },
  { key: "big-repair", name: "Larger sprinkler repair", line: "New lines, valves or a rebuilt zone.", price: "Priced after Ryan looks.", kind: "quote" },
]

export const REQUEST_QUOTE = "Need a quote? Request one"
export const QUOTE_DONE = "Thanks, Ryan will call you by tomorrow."
export const OUT_OF_SEASON_NOTE = "Reserve the Season Pass and your turn-on day is held."
