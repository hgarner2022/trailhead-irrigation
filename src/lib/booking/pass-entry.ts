// The booking list for a date: the Season Pass with each kind's next visit (each with its length, price and opening day), and the single-visit cards that open and close by the same windows
// (docs/plans/2026-11-20-season-pass-booking-research.md, "The bug Hannah saw"). Every length, price and opening day is read from the catalogue and from `pass-visits.ts`, the one place the windows live.
import { PASS_WINDOWS, opensLabel, passPlanFor, type PassPlan, type PassVisitKind } from "@/lib/booking/pass-visits"
import { PASS_SCHEDULES } from "@/lib/booking/pass-words"
import { CATALOGUE, type PassVisitLine, type ServiceEntry } from "@/lib/booking/services"

/** The catalogue entry behind each visit of a pass: its name, length and minutes. */
export const VISIT_SERVICE: Record<PassVisitKind, string> = { "turn-on": "spring-turn-on", blowout: "fall-blowout" }
const SINGLE_VISIT: Record<string, PassVisitKind> = { "spring-turn-on": "turn-on", "fall-blowout": "blowout" }
const catalogueEntry = (kind: PassVisitKind) => CATALOGUE.find((s) => s.key === VISIT_SERVICE[kind])!

/** How long a visit takes, from the catalogue: 60 for the turn-on, 30 for the blowout. */
export const visitMinutes = (kind: PassVisitKind): number => catalogueEntry(kind).minutes ?? 60

/** Whether a day is inside a visit's window this year. */
function inWindow(kind: PassVisitKind, today: string): boolean {
  const md = today.slice(5, 10)
  return md >= PASS_WINDOWS[kind].opens && md <= PASS_WINDOWS[kind].closes
}

/** The Season Pass card for the date: each kind's next visit, this season's or next. */
function passEntry(pass: ServiceEntry, plan: PassPlan, today: string): ServiceEntry {
  const lines: PassVisitLine[] = plan.visits.map((v) => {
    const svc = catalogueEntry(v.kind)
    const open = today >= v.opens
    return { kind: v.kind, name: svc.name, length: svc.length ?? "", price: svc.price, ...(open ? {} : { opens: v.opensLabel }), mode: v.mode }
  })
  return {
    ...pass,
    name: `Season Pass ${plan.season}`,
    line: PASS_SCHEDULES,
    // a pass is a setup, not an order: the price is what each visit costs, on its own line, and nothing is due now
    price: "",
    length: undefined,
    passVisits: lines,
  }
}

/** The list the form shows today: the pass read from the plan, and a single turn-on or blowout card marked "Opens Apr 25" until its window opens (cards with no `opens` stay open). */
export function bookingEntries(entries: readonly ServiceEntry[], today: string): ServiceEntry[] {
  const plan = passPlanFor(today)
  return entries.map((e) => {
    if (e.kind === "pass") return passEntry(e, plan, today)
    const kind = SINGLE_VISIT[e.key]
    if (kind && e.opens) return inWindow(kind, today) ? { ...e, opens: undefined } : { ...e, opens: opensLabel(kind) }
    return e
  })
}
