/**
 * The pure derivations behind PassPageScreen: each visit's row (name, when,
 * state), the card on file line and the season caption. Kept out of the
 * screen so the wording can be unit tested.
 */
import type { Pass, PassVisit, TimingPreference } from "@/lib/admin/types"
import { TIME_ZONE, preferenceOf, preferencePhrase, writtenDate } from "@/lib/admin/format"
import { formatMoney } from "@/lib/admin/metrics"
import { customerFacingFirstName } from "@/lib/portal/words"
import { passVisitJob, visitPaidTotal, type JobState } from "@/lib/admin/jobs"
import { SCHEDULE_NOTE } from "@/lib/booking/pass-words"
import { clock12 } from "@/lib/booking/day-time"
import { timingLine } from "@/lib/portal/preference-words"

/** "Preference: Our recommended, mid October": a saved timing in the one phrasing the Season Pass tab uses. */
export const prefStatement = (kind: "turn-on" | "blowout", preference: TimingPreference) => `Preference: ${timingLine(kind, preference)}`

export const VISIT_NAMES: Record<PassVisit["kind"], string> = { "turn-on": "Spring turn-on", inspection: "Mid-season inspection", blowout: "Fall blowout" }

export type RowStatus = JobState

export interface VisitRow {
  kind: PassVisit["kind"]
  name: string
  /** the date once there is one, else the customer's preference, else the window (the inspection's July) */
  when: string
  status: RowStatus
  /** the customer's word for the state: Done, Booked, Preferred, or July while the inspection waits for its day */
  label: string
}

/** The visit's job state, from the one derivation the admin uses (`src/lib/admin/jobs.ts`). */
export const visitStatus = (visit: PassVisit): RowStatus => passVisitJob({}, visit, "", TIME_ZONE).state

const FINISHED: readonly RowStatus[] = ["done", "charged", "charge-failed"]
const HAS_DAY: readonly RowStatus[] = ["scheduled", "routed"]

/** The pass's preference for a visit in the customer's words; the inspection has none. */
function preferenceWords(visit: PassVisit, pass: Pass): string | null {
  const preference = preferenceOf(pass, visit.kind)
  return preference && visit.kind !== "inspection" ? prefStatement(visit.kind, preference) : null
}

export function visitRow(visit: PassVisit, pass: Pass): VisitRow {
  const status = visitStatus(visit)
  const preference = preferenceWords(visit, pass)
  const when = visit.completedAt ? writtenDate(visit.completedAt) : visit.scheduledAt ? writtenDate(visit.scheduledAt) : (preference ?? visit.window)
  const label = FINISHED.includes(status) ? "Done" : HAS_DAY.includes(status) ? "Booked" : preference ? "Preferred" : visit.window
  return { kind: visit.kind, name: VISIT_NAMES[visit.kind], when, status, label }
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

/** "Tuesday, May 5" for a booked visit, with the first name of who is coming when it has someone: "Tuesday, May 5 with Ryan". Null before a day is set or once the visit is done. */
export function bookedWhen(visit: PassVisit, start?: string): string | null {
  if (!visit.scheduledAt || visit.completedAt) return null
  const weekday = WEEKDAYS[new Date(`${visit.scheduledAt.slice(0, 10)}T12:00:00Z`).getUTCDay()]
  const who = customerFacingFirstName(visit.personName)
  return `${weekday}, ${writtenDate(visit.scheduledAt)}${start ? ` at ${clock12(start)}` : ""}${who ? ` with ${who}` : ""}`
}

/** The visit's price ("$145") and what it includes, both from its line; the description is absent when the line has none. */
export function visitLineInfo(visit: PassVisit): { price: string; description?: string } {
  return { price: formatMoney(visit.amount), ...(visit.description ? { description: visit.description } : {}) }
}

export const visitRows = (pass: Pass): VisitRow[] => pass.visits.map((v) => visitRow(v, pass))

/** The turn-on and the blowout can be moved by the customer until a day is set; the inspection has no preference. */
export const canChange = (visit: PassVisit): visit is PassVisit & { kind: "turn-on" | "blowout" } => visit.kind !== "inspection" && !visit.scheduledAt && !visit.completedAt

export type HeadlineAction = "change-day" | "update-card" | "reserve-next" | "book" | null

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
 * a failed card first, then cancelled, then the next
 * visit, then a season that is done (with "Reserve next season" once the next season is
 * on sale). Hannah, 2026-11-13: "think through the different states".
 */
export function passHeadline(pass: Pass, today: string): Headline {
  if (pass.status === "cancelled") return { title: "This pass is canceled.", line: "Nothing further is charged and no more visits are placed. Book any visit online whenever you like.", action: "book" }
  if (pass.cardFailedAt) return { title: "Your card didn't go through.", line: "Update it and we'll try again. Your visits stay as they are until then.", action: "update-card" }
  const next = upcoming(pass)
  if (!next) {
    const renewalOpen = today >= `${pass.season}${SEASON_ROLLS}`
    return renewalOpen
      ? { title: `Your ${pass.season} season is done.`, line: `Reserve ${pass.season + 1} on the same card. We charge it after each visit.`, action: "reserve-next" }
      : { title: `Your ${pass.season} season is done.`, line: `We'll email you in January about ${pass.season + 1}.`, action: null }
  }
  const row = visitRow(next, pass)
  if (next.scheduledAt) return { title: `Next up: ${row.name.toLowerCase()}, ${writtenDate(next.scheduledAt)}.`, line: "We confirm it by text two weeks before and remind you the day before.", action: "change-day", kind: next.kind }
  // A visit with no day yet is never a prompt to pick one: it reads its preference and that we schedule it (below).
  const done = pass.visits.filter((v) => v.completedAt)
  const last = done[done.length - 1]
  const lastWords = last ? `${VISIT_NAMES[last.kind]} done ${writtenDate(last.completedAt!)}. ` : ""
  const when = next.kind === "inspection" ? "in July" : preferencePhrase(next.kind, preferenceOf(pass, next.kind) ?? "recommended")
  // A visit with a preference and no day says the preference and when it is scheduled (Hannah, Nov 20 2026); the July inspection, an add-on, keeps its own line.
  const tell = next.kind === "inspection" ? "We'll text your date in June." : SCHEDULE_NOTE
  const asked = next.kind === "inspection" ? `${row.name} ${when}. ${tell}` : `${prefStatement(next.kind, preferenceOf(pass, next.kind) ?? "recommended")}. ${tell}`
  return { title: last ? `${lastWords}Next up: ${row.name.toLowerCase()}, ${when}.` : `Your ${pass.season} season is reserved.`, line: last ? tell : asked, action: null, kind: next.kind }
}

/** "3 of 3 visits done, $385 paid" for an earlier season; a skipped or canceled season says how many were done. */
export function seasonSummary(pass: Pass): string {
  const done = pass.visits.filter((v) => v.completedAt).length
  const paid = pass.visits.reduce((sum, v) => sum + visitPaidTotal(v), 0)
  const visits = `${done} of ${pass.visits.length} visit${pass.visits.length === 1 ? "" : "s"} done`
  return paid > 0 ? `${visits}, $${paid.toLocaleString("en-US")} paid` : visits
}

/** The address of the checkout filled in from this pass: "Reserve next season" opens it. */
export const reserveNextHref = (pass: Pass) => `/season-pass/checkout?renew=${pass.id}`

/** From November 1 of the pass's season, while no later season is held: the customer can reserve the next one. */
export const canReserveNext = (pass: Pass, passes: Pass[], today: string): boolean =>
  pass.status === "active" && today >= `${pass.season}${SEASON_ROLLS}` && !passes.some((p) => p.season > pass.season && p.status === "active")

/** Earlier seasons newest first, the current one left out. */
export const earlierSeasons = (passes: Pass[], current: Pass): Pass[] => passes.filter((p) => p.id !== current.id && p.season < current.season).sort((a, b) => b.season - a.season)

/** "08/28" from the stored "2028-08". */
export const expiry = (yearMonth: string) => `${yearMonth.slice(5, 7)}/${yearMonth.slice(2, 4)}`

/** "Visa ending 4242, expires 08/28"; the brand is Visa until Stripe tells us otherwise in the wiring phase. A pass sold by the office may have no card: the customer pays at each visit, or adds one here. */
export function cardLine(pass: Pass): string {
  if (!pass.cardLast4) return "No card on file yet. Pay at each visit by check, Venmo or cash, or add a card and we charge it after each visit."
  const ending = `Visa ending ${pass.cardLast4}`
  return pass.cardExpires ? `${ending}, expires ${expiry(pass.cardExpires)}` : ending
}

/** The one line on the plan about how it is paid: after each visit, to the card on file, or at each visit when there is none. The card itself is changed on Details. */
export const chargeLine = (pass: Pick<Pass, "cardLast4">): string => (pass.cardLast4 ? `You pay after each visit, to your Visa ending ${pass.cardLast4}.` : "No card on file yet. You pay at each visit.")

/** The card button's verb: a pass with a card updates it, a pass with none adds one. Both open Stripe's hosted page. */
export const cardAction = (pass: Pick<Pass, "cardLast4">): string => (pass.cardLast4 ? "Update card" : "Add a card")

/** One line under the season line: what is next, or that the season is done. */
export function seasonCaption(pass: Pass): string {
  const next = pass.visits.find((v) => !v.completedAt)
  if (!next) return `Every visit is done. We'll email you in January about ${pass.season + 1}.`
  const row = visitRow(next, pass)
  if (next.scheduledAt) return `Next up: ${row.name.toLowerCase()} on ${row.when}.`
  if (next.kind === "blowout") return `${prefStatement("blowout", pass.blowoutPreference)}. ${SCHEDULE_NOTE}`
  if (next.kind === "turn-on") return `${prefStatement("turn-on", pass.turnOnPreference)}. ${SCHEDULE_NOTE}`
  return `Next up: ${row.name.toLowerCase()} in ${row.when}.`
}
