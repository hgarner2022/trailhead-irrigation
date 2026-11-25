// The booking list for a date: the Season Pass with each kind's next visit, and the single-visit cards (docs/plans/2026-11-20-season-pass-booking-research.md, "The bug Hannah saw"). Every price and length is
// read from the catalogue (`services.ts`, built on the backend rows) and every window from `pass-visits.ts`, the one place the windows live. **No opening day is shown to a customer** (Hannah, Nov 22 2026:
// "It says open April 25th. I don't think that's true"), so a single turn-on or blowout is always on the list and its days simply start when its window does (`singleRange`).
import { nextRun, passPlanFor, type PassVisitKind } from "@/lib/booking/pass-visits"
import { CATALOGUE, type PassVisitLine, type ServiceEntry } from "@/lib/booking/services"

/** The catalogue entry behind each visit of a pass: its name, length and minutes. */
export const VISIT_SERVICE: Record<PassVisitKind, string> = { "turn-on": "spring-turn-on", blowout: "fall-blowout" }
const catalogueEntry = (kind: PassVisitKind) => CATALOGUE.find((s) => s.key === VISIT_SERVICE[kind])!

/** How long a visit takes, from the catalogue: 60 for the turn-on, 30 for the blowout. */
export const visitMinutes = (kind: PassVisitKind): number => catalogueEntry(kind).minutes ?? 60

/** The Season Pass card for the date: each kind's next visit, this season's or next. */
function passEntry(pass: ServiceEntry, today: string): ServiceEntry {
  const plan = passPlanFor(today)
  // a visit that belongs to next season is named with its year ("Spring turn-on 2028"), as everywhere else
  const lines: PassVisitLine[] = plan.visits.map((v) => ({ kind: v.kind, name: v.nextSeason ? `${catalogueEntry(v.kind).name} ${v.season}` : catalogueEntry(v.kind).name, price: catalogueEntry(v.kind).price, mode: v.mode }))
  return {
    ...pass,
    name: `Season Pass ${plan.season}`,
    // a pass is a setup, not an order: each visit shows what it costs, and nothing is due now
    price: "",
    length: lines.map((l, i) => (i === 0 ? l.name : l.name.toLowerCase())).join(" and "),
    passVisits: lines,
  }
}

/** The list the form shows today: the pass read from the plan, and every other entry as it is. */
export function bookingEntries(entries: readonly ServiceEntry[], today: string): ServiceEntry[] {
  return entries.map((e) => (e.kind === "pass" ? passEntry(e, today) : e))
}

/** The days a single visit may be offered: from its window's opening (or tomorrow, if later) to its closing; null for a service with no season, which looks 56 days ahead. */
export function singleRange(entry: ServiceEntry, today: string, tomorrow: string): { from: string; until?: string } {
  if (!entry.window) return { from: tomorrow }
  const run = nextRun(entry.window, today)
  return { from: run.opens > tomorrow ? run.opens : tomorrow, until: run.closes }
}
