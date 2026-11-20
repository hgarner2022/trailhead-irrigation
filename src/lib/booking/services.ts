// The services a customer meets in the booking form, ONE catalogue (docs/plans/2026-11-19-booking-form-design.md, "Catalogue changes for the build step"): every service carries an `online` value, the
// same three as Settings > Services' Online select, and the form derives both of its lists from it. "bookable" is in the booking list (a day and an exact time), "quote" is on the request path only
// ("Need a quote? Request one"), "off" appears nowhere. The real list will come from `pickerEntries(catalogue, today)`; this file is the fixture the stories use, with the same shape, and its facts
// (names, minutes, prices) are the ones in src/lib/services.ts. A price the catalogue does not have is never invented: it reads "Price set at the visit". Pure.

export type ServiceKind =
  /** the Season Pass: two visits, priced per zone */
  | "pass"
  /** a service with a day and time */
  | "day"
  /** not booked online: the flow ends with a request */
  | "quote"

/** Settings > Services' Online select: Book a day, We quote, Off. */
export type Online = "bookable" | "quote" | "off"

/** Which service-specific questions the details step asks, besides the ones every visit has. */
export type DetailsKind = "rachio" | "efficiency" | "install"

export interface ServiceEntry {
  key: string
  name: string
  /** where the service is offered; the form's two lists are derived from this */
  online: Online
  /** one sentence from the catalogue */
  line: string
  /** "$145", "From $145", "Free" or "Price set at the visit" */
  price: string
  /** "About 2 hours" */
  length?: string
  /** the rest of the catalogue text, behind "What's included" */
  included?: string
  kind: ServiceKind
  /** minutes a visit takes: sizes the start times */
  minutes?: number
  /** whether the price depends on the zone count: the details step asks for zones */
  perZone?: boolean
  /** the price for a zone count; absent when the catalogue has no price (the visit sets it) */
  amount?: number | ((zones: number) => number)
  /** the service-specific questions on the details step */
  details?: DetailsKind
  /** "Opens Apr 25": out of season, shown and not selectable */
  opens?: string
}

export const CATALOGUE: readonly ServiceEntry[] = [
  { key: "season-pass", name: "Season Pass 2027", online: "bookable", line: "Both visits, and your days held when you reserve.", price: "From $240", length: "Spring turn-on and fall blowout", included: "A spring turn-on and a fall blowout at the standard per-zone price, your days held, the same schedule every year and priority for repairs. Add a July inspection at checkout.", kind: "pass", minutes: 60, perZone: true },
  { key: "spring-turn-on", name: "Spring turn-on", online: "bookable", line: "Start the system up, run every zone and check each head.", price: "From $145", length: "About 1 hour", included: "Complete system activation and check: sprinkler head adjustments, minor leak fixes where possible, controller programming and a water efficiency evaluation. Larger repairs are quoted separately and may need a return visit.", kind: "day", minutes: 60, perZone: true, opens: "Apr 25" },
  { key: "fall-blowout", name: "Fall blowout", online: "bookable", line: "Clear the water out of the lines before the first hard freeze.", price: "From $95", length: "About 30 minutes", included: "Compressor hookup and a blowout of every zone to clear water from the lines, valves and heads, and the backflow and controller readied for winter. We need access to the system, the controller and the backflow.", kind: "day", minutes: 30, perZone: true, opens: "Oct 1" },
  { key: "repair", name: "Sprinkler repair", online: "bookable", line: "Find the fault and fix what we can.", price: "$145", length: "About 2 hours", included: "A visit to find the fault and fix what can be fixed on the spot. Larger repairs are quoted and may need a return visit.", kind: "day", minutes: 120, amount: 145 },
  { key: "consult", name: "Free consultation", online: "bookable", line: "A visit to look at the property and talk over what you have in mind.", price: "Free", length: "About 30 minutes", kind: "day", minutes: 30, amount: 0 },
  { key: "rachio-install", name: "Rachio smart controller install", online: "bookable", line: "A Rachio 3 for your zone count, mounted and wired to your existing valves.", price: "From $350", length: "About 2 hours", included: "A Rachio 3 for your zone count, mounted and wired to your existing valves, with the Wi-Fi set up, the zones named, the schedules built and a walkthrough of the app before we leave.", kind: "day", minutes: 120, perZone: true, amount: (zones) => (zones <= 8 ? 350 : 420), details: "rachio" },
  { key: "water-efficiency", name: "Water efficiency and drip", online: "bookable", line: "A visit to look at your yard and what you want to improve.", price: "Price set at the visit", length: "About 1 hour 30 minutes", kind: "day", minutes: 90, details: "efficiency" },
  { key: "install", name: "New sprinkler system installation", online: "bookable", line: "A design visit to look at your yard.", price: "Price set at the visit", length: "About 2 hours", kind: "day", minutes: 120, details: "install" },
  { key: "big-repair", name: "Larger sprinkler repair", online: "quote", line: "New lines, valves or a rebuilt zone.", price: "", kind: "quote" },
  { key: "lights", name: "Christmas lights", online: "quote", line: "Hung and lit for you.", price: "", kind: "quote" },
  { key: "aeration", name: "Core aeration", online: "off", line: "Core aeration of the lawn.", price: "", kind: "day", minutes: 60 },
]

/** The booking list: what is set to "Book a day", in the catalogue's order. */
export const SERVICES: readonly ServiceEntry[] = CATALOGUE.filter((s) => s.online === "bookable")

/**
 * What a customer asks for a quote on: the services whose Online setting is "We quote". They are never in the booking list (Hannah, Nov 18 2026: a service we do not book online is removed from the
 * form and the site, and goes to a request instead); the "Request a quote" path offers them. A service set to Off appears in neither list.
 */
export const QUOTE_SERVICES: readonly ServiceEntry[] = CATALOGUE.filter((s) => s.online === "quote")

export const REQUEST_QUOTE = "Need a quote? Request one"
export const QUOTE_DONE = "Thanks. We've got your request."
export const PRICE_AT_VISIT = "Price set at the visit"
export const OUT_OF_SEASON_NOTE = "Reserve the Season Pass and your turn-on day is held."
