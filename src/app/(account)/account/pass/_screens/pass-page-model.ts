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

export type HeadlineAction = "pick-day" | "change-day" | "update-card" | "renew" | "book" | null

export interface Headline {
  title: string
  line: string
  action: HeadlineAction
  /** the visit the action is about, when there is one */
  kind?: PassVisit["kind"]
}

const SEASON_ROLLS = "-11-01"
const upcoming = (pass: Pass) => pass.visits.find((v) => !v.completedAt)

/**
 * The one thing that matters to this customer right now, read top to bottom:
 * a failed card first, then cancelled, then a day to pick, then the next
 * visit, then a season that is done (with renewal once the next season is
 * on sale). Hannah, 2026-11-13: "think through the different states".
 */
export function passHeadline(pass: Pass, today: string): Headline {
  if (pass.status === "cancelled") return { title: "This pass is cancelled.", line: "Nothing further is charged and no more visits are placed. Book any visit online whenever you like.", action: "book" }
  if (pass.cardFailedAt) return { title: "Your card didn't go through.", line: "Update it and we'll try again; your visits stay as they are until then.", action: "update-card" }
  const next = upcoming(pass)
  if (!next) {
    const renewalOpen = today >= `${pass.season}${SEASON_ROLLS}`
    return renewalOpen
      ? { title: `Your ${pass.season} season is done.`, line: `Reserve ${pass.season + 1} on the same card; nothing is charged until a visit is done.`, action: "renew" }
      : { title: `Your ${pass.season} season is done.`, line: `We'll email you in January about ${pass.season + 1}.`, action: null }
  }
  const row = visitRow(next, pass)
  if (next.scheduledAt) return { title: `Next up: ${row.name.toLowerCase()}, ${writtenDate(next.scheduledAt)}.`, line: "We'll text you the day before, and when we're on our way.", action: "change-day", kind: next.kind }
  if (pass.needsCustomerHome && next.kind !== "inspection") return { title: `Pick your ${row.name.toLowerCase()} day.`, line: "These are the days we're in your town. Pick the one that works and we'll see you then.", action: "pick-day", kind: next.kind }
  const done = pass.visits.filter((v) => v.completedAt)
  const last = done[done.length - 1]
  const lastWords = last ? `${VISIT_NAMES[last.kind]} done ${writtenDate(last.completedAt!)}. ` : ""
  const when = next.kind === "inspection" ? "in July" : `preferred ${preferencePhrase(next.kind, preferenceOf(pass, next.kind) ?? "recommended")}`
  const tell = next.kind === "blowout" ? "We'll text your date in September." : next.kind === "inspection" ? "We'll text your date in June." : "We'll text your date in April."
  return { title: last ? `${lastWords}Next up: ${row.name.toLowerCase()}, ${when}.` : `Your ${pass.season} season is reserved.`, line: last ? tell : `${row.name} ${when}. ${tell}`, action: null, kind: next.kind }
}

/** Three days we are in the customer's town inside the visit's window, Tuesday and Thursday first, as YYYY-MM-DD. The prototype's stand-in for the scheduler's area days. */
export function pickDayOptions(pass: Pass, kind: "turn-on" | "blowout"): string[] {
  const preference = preferenceOf(pass, kind) ?? "recommended"
  const month = kind === "turn-on" ? "05" : "10"
  const start = { earlier: 1, recommended: 8, later: 18 }[preference]
  const days: string[] = []
  for (let d = start; d <= start + 13 && days.length < 3; d++) {
    const iso = `${pass.season}-${month}-${String(d).padStart(2, "0")}`
    const weekday = new Date(`${iso}T12:00:00Z`).getUTCDay()
    if (weekday === 2 || weekday === 4) days.push(iso)
  }
  return days
}

/** "3 of 3 visits done, $385 paid" for an earlier season; a skipped or cancelled season says how many were done. */
export function seasonSummary(pass: Pass): string {
  const done = pass.visits.filter((v) => v.completedAt).length
  const paid = pass.visits.filter((v) => v.chargedAt).reduce((sum, v) => sum + v.amount, 0)
  const visits = `${done} of ${pass.visits.length} visit${pass.visits.length === 1 ? "" : "s"} done`
  return paid > 0 ? `${visits}, $${paid.toLocaleString("en-US")} paid` : visits
}

/** Earlier seasons newest first, the current one left out. */
export const earlierSeasons = (passes: Pass[], current: Pass): Pass[] => passes.filter((p) => p.id !== current.id && p.season < current.season).sort((a, b) => b.season - a.season)

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
