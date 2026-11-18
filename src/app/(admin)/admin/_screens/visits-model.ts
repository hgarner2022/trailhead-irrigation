/**
 * The pure derivations behind VisitsScreen: one row per visit the app owns (pass visits and the office's and the
 * site's one-offs), with the two pills' states, the day and time in words, who has it, the price and the pass
 * number. Search reads the customer's name, street and phone through the first column, so a person finds a visit
 * by whatever they have in hand. Sorted with the visits that need a day first, then by day.
 */
import { TIME_ZONE } from "@/lib/admin/format"
import { dayOf } from "@/lib/admin/calendar"
import { MONEY_WORDS, WORK_WORDS, type MoneyState, type WorkState, visitJob } from "@/lib/admin/jobs"
import { KIND_LABEL, OFFICE_KINDS } from "@/lib/admin/visit-defaults"
import type { AdminData, Visit } from "@/lib/admin/types"
import { personNameOf } from "@/lib/admin/people"
import { dayOfVisit, kindLabel, priceWords, timeWords, visitPrice } from "./visit-panel-model"

export interface VisitRow {
  id: string
  /** the customer's full name: the first column, and what opens the visit panel */
  name: string
  /** name, street and phone together: what the search box matches */
  search: string
  town: string
  kind: string
  kindLabel: string
  day?: string
  time: string
  /** who has the visit, "Ryan Garner"; empty until someone does */
  who: string
  /** their id, or "none" */
  personId: string
  work: WorkState
  workLabel: string
  money: MoneyState
  moneyLabel: string
  dayPassed: boolean
  price: number
  priceLabel: string
  /** "Pass" or "One-off" */
  jobType: "pass" | "one-off"
  passNumber?: string
  passId?: string
  /** the job the visit belongs to, so Home counts jobs and not visits */
  jobId?: string
}

const digits = (s: string | undefined) => (s ?? "").replace(/\D/g, "")

/** The visits the app owns: a pass's, or one with a job. Visits read from the Jobber calendar feed are the Schedule's, not a sale. */
const isOurs = (v: Visit) => v.isPass || Boolean(v.jobId)

export function visitRows(data: AdminData, today: string): VisitRow[] {
  const day = dayOf(today, TIME_ZONE)
  const clients = new Map(data.clients.map((c) => [c.id, c]))
  const passes = new Map(data.passes.map((p) => [p.id, p]))
  const people = data.settings.people
  const rows = data.visits.filter(isOurs).map((v): VisitRow => {
    const client = clients.get(v.clientId)
    const pass = v.passId ? passes.get(v.passId) : undefined
    const states = visitJob(v, day, TIME_ZONE, pass?.cardFailedAt)
    return {
      id: v.id,
      name: v.clientName,
      search: [v.clientName, client?.address ?? "", client?.phone ?? "", digits(client?.phone)].join(" "),
      town: v.town,
      kind: v.kind,
      kindLabel: kindLabel(v),
      ...(dayOfVisit(v) ? { day: dayOfVisit(v) } : {}),
      time: timeWords(v),
      who: personNameOf(v, people),
      personId: v.personId ?? "none",
      work: states.work,
      workLabel: states.workLabel,
      money: states.money,
      moneyLabel: states.moneyLabel,
      dayPassed: states.dayPassed,
      price: visitPrice(data, v),
      priceLabel: priceWords({ price: visitPrice(data, v) }),
      jobType: v.passId ? "pass" : "one-off",
      ...(pass ? { passNumber: pass.number, passId: pass.id } : {}),
      ...(v.jobId ? { jobId: v.jobId } : {}),
    }
  })
  // No day yet first (they are the ones that want a person), then the days in order.
  return rows.sort((a, b) => (a.day ?? "0").localeCompare(b.day ?? "0") || a.name.localeCompare(b.name))
}

export const WORK_OPTIONS = (Object.keys(WORK_WORDS) as WorkState[]).map((value) => ({ value, label: WORK_WORDS[value] }))
export const MONEY_OPTIONS = (Object.keys(MONEY_WORDS) as MoneyState[]).filter((value) => MONEY_WORDS[value]).map((value) => ({ value, label: MONEY_WORDS[value] }))
/** A filter chip from a link's `?money=owed,failed`: the listed values that are real options, or no chip at all. */
export function filterFrom(column: string, param: string | undefined, options: { value: string }[]): { column: string; values: string[] }[] {
  const values = (param ?? "").split(",").filter((v) => options.some((o) => o.value === v))
  return values.length ? [{ column, values }] : []
}
export const KIND_OPTIONS = OFFICE_KINDS.map((value) => ({ value, label: KIND_LABEL[value] }))
export const JOB_TYPE_OPTIONS = [
  { value: "pass", label: "On a pass" },
  { value: "one-off", label: "One-off" },
]

/** The header's line: how many visits, then (only when non-zero) how many have no day and how many are done with money still to come (Owed, Bill sent or Failed). */
export function visitsContext(rows: VisitRow[]): string {
  if (rows.length === 0) return "No visits yet."
  const needDay = rows.filter((r) => r.work === "needs-a-day" || r.work === "not-done").length
  const owed = rows.filter((r) => r.work === "done" && r.money !== "paid").length
  const parts = [`${rows.length} ${rows.length === 1 ? "visit" : "visits"} this season.`]
  if (needDay) parts.push(`${needDay} ${needDay === 1 ? "has" : "have"} no day yet.`)
  if (owed) parts.push(`${owed} done and owed.`)
  return parts.join(" ")
}
