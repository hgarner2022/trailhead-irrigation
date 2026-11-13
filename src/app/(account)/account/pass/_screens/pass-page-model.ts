/**
 * The pure derivations behind PassPageScreen: each visit's row (name, when,
 * state), the card on file line and the season caption. Kept out of the
 * screen so the wording can be unit tested.
 */
import type { Pass, PassVisit, VisitStatus } from "@/lib/admin/types"
import { preferenceLabel, preferenceOf, preferencePhrase, writtenDate } from "@/lib/admin/format"

export const VISIT_NAMES: Record<PassVisit["kind"], string> = { "turn-on": "Spring turn-on", inspection: "Mid-season inspection", blowout: "Fall blowout" }

export type RowStatus = Extract<VisitStatus, "completed" | "scheduled" | "unscheduled">

export interface VisitRow {
  kind: PassVisit["kind"]
  name: string
  /** the date once there is one, else the customer's preference, else the window (the inspection's July) */
  when: string
  status: RowStatus
  /** the customer's word for the state: Done, Booked, Preferred, or July while the inspection waits for its day */
  label: string
}

export const visitStatus = (visit: PassVisit): RowStatus => (visit.completedAt ? "completed" : visit.scheduledAt ? "scheduled" : "unscheduled")

/** The pass's preference for a visit in the customer's words; the inspection has none. */
function preferenceWords(visit: PassVisit, pass: Pass): string | null {
  const preference = preferenceOf(pass, visit.kind)
  return preference && visit.kind !== "inspection" ? preferenceLabel(visit.kind, preference) : null
}

export function visitRow(visit: PassVisit, pass: Pass): VisitRow {
  const status = visitStatus(visit)
  const preference = preferenceWords(visit, pass)
  const when = visit.completedAt ? writtenDate(visit.completedAt) : visit.scheduledAt ? writtenDate(visit.scheduledAt) : (preference ?? visit.window)
  const label = status === "completed" ? "Done" : status === "scheduled" ? "Booked" : preference ? "Preferred" : visit.window
  return { kind: visit.kind, name: VISIT_NAMES[visit.kind], when, status, label }
}

export const visitRows = (pass: Pass): VisitRow[] => pass.visits.map((v) => visitRow(v, pass))

/** The turn-on and the blowout can be moved by the customer until a day is set; the inspection has no preference. */
export const canChange = (visit: PassVisit): visit is PassVisit & { kind: "turn-on" | "blowout" } => visit.kind !== "inspection" && !visit.scheduledAt && !visit.completedAt

/** "08/28" from the stored "2028-08". */
export const expiry = (yearMonth: string) => `${yearMonth.slice(5, 7)}/${yearMonth.slice(2, 4)}`

/** "Visa ending 4242, expires 08/28"; the brand is Visa until Stripe tells us otherwise in the wiring phase. */
export function cardLine(pass: Pass): string {
  if (!pass.cardLast4) return "No card on file yet."
  const ending = `Visa ending ${pass.cardLast4}`
  return pass.cardExpires ? `${ending}, expires ${expiry(pass.cardExpires)}` : ending
}

/** One line under the season line: what is next, or that the season is done. */
export function seasonCaption(pass: Pass): string {
  const next = pass.visits.find((v) => !v.completedAt)
  if (!next) return `Every visit is done. We'll email you in January about ${pass.season + 1}.`
  const row = visitRow(next, pass)
  if (next.scheduledAt) return `Next up: ${row.name.toLowerCase()} on ${row.when}.`
  if (next.kind === "blowout") return `Your blowout is preferred for ${preferencePhrase("blowout", pass.blowoutPreference)}. Ryan sets the day in September.`
  if (next.kind === "turn-on") return `Next up: ${row.name.toLowerCase()}, preferred ${preferencePhrase("turn-on", pass.turnOnPreference)}.`
  return `Next up: ${row.name.toLowerCase()} in ${row.when}.`
}
