/**
 * The pure derivations behind VisitsScreen: one row per visit the app owns (pass visits and the office's and the
 * site's one-offs), with the two pills' states, the day and time in words, who has it, the price and the pass
 * number. Search reads the customer's name, street and phone through the first column, so a person finds a visit
 * by whatever they have in hand. Sorted with the visits that need a day first, then by day.
 */
import { TIME_ZONE } from "@/lib/admin/format"
import { dayOf } from "@/lib/admin/calendar"
import { MONEY_WORDS, REASON_WORDS, WORK_WORDS, type MoneyState, type WorkState, visitJob } from "@/lib/admin/jobs"
import { KIND_LABEL, OFFICE_KINDS } from "@/lib/admin/visit-defaults"
import type { AdminData, Visit } from "@/lib/admin/types"
import { personNameOf } from "@/lib/admin/people"
import { dayOfVisit, kindLabel, timeWords, visitPrice } from "./visit-panel-model"

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
  /** the pill's word: Unscheduled, Scheduled, Done, Not done, Cancelled */
  workLabel: string
  /** after the pill on a Not done visit: "could not get in" */
  reason?: string
  money: MoneyState
  moneyLabel: string
  /** the one Money cell: "$95" until Done, then "$95 · Paid, Venmo", "$95 owed", "$95 · Bill sent", "$95 · Failed"; "Cancelled"; "Quote later" */
  moneyText: string
  dayPassed: boolean
  /** whole dollars; what Money sorts by */
  price: number
  /** "TH-2027-0006" for a pass visit, else the job's kind word: "Repair", "Installation" */
  jobLabel: string
  customerId: string
  passNumber?: string
  passId?: string
  /** the job the visit belongs to, so Home counts jobs and not visits */
  jobId?: string
}

/** The job kind as a word for the Job column when the visit is not on a pass. */
const JOB_KIND_WORDS: Record<string, string> = { repair: "Repair", install: "Installation", other: "Job" }

/**
 * The Money cell, one string for the visit: its price until it is Done, then what happened to the money. A cancelled
 * visit with nothing held reads "Cancelled"; one nobody has priced reads "Quote later".
 */
export function moneyText(row: Pick<VisitRow, "work" | "money" | "moneyLabel" | "price"> & { noCard?: boolean }): string {
  if (row.work === "cancelled" && row.money === "not-yet") return "Cancelled"
  const amount = row.price > 0 ? `$${row.price.toLocaleString("en-US")}` : "Quote later"
  if (row.money === "paid" || row.money === "bill-sent" || row.money === "failed") return `${amount} · ${row.moneyLabel}`
  // A pass visit whose customer has no card to charge says so, so an owed visit is never a silent one.
  if (row.money === "owed") return `${row.price > 0 ? `${amount} owed` : "Owed"}${row.noCard ? " · no card" : ""}`
  return amount
}

const digits = (s: string | undefined) => (s ?? "").replace(/\D/g, "")

/** The visits the app owns: a pass's, or one with a job. Visits read from the Jobber calendar feed are the Schedule's, not a sale. */
const isOurs = (v: Visit) => v.isPass || Boolean(v.jobId)

/** The rows for any list of visits, in the order given: the Visits list and the Schedule's day list read the same columns. */
export function rowsOf(data: AdminData, visits: Visit[], today: string): VisitRow[] {
  const day = dayOf(today, TIME_ZONE)
  const clients = new Map(data.clients.map((c) => [c.id, c]))
  const passes = new Map(data.passes.map((p) => [p.id, p]))
  const people = data.settings.people
  return visits.map((v): VisitRow => {
    const client = clients.get(v.clientId)
    const pass = v.passId ? passes.get(v.passId) : undefined
    const states = visitJob(v, day, TIME_ZONE, pass?.cardFailedAt)
    const job = v.jobId ? data.jobs?.find((j) => j.id === v.jobId) : undefined
    const base = { work: states.work, money: states.money, moneyLabel: states.moneyLabel, price: visitPrice(data, v) }
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
      ...base,
      workLabel: WORK_WORDS[states.work],
      ...(states.reason ? { reason: REASON_WORDS[states.reason] ?? states.reason } : {}),
      moneyText: moneyText({ ...base, noCard: Boolean(pass) && !pass?.cardLast4 }),
      dayPassed: states.dayPassed,
      jobLabel: pass?.number ?? JOB_KIND_WORDS[job?.kind ?? "other"] ?? "Job",
      customerId: v.clientId,
      ...(pass ? { passNumber: pass.number, passId: pass.id } : {}),
      ...(v.jobId ? { jobId: v.jobId } : {}),
    }
  })
}

export function visitRows(data: AdminData, today: string): VisitRow[] {
  const rows = rowsOf(data, data.visits.filter(isOurs), today)
  // Unscheduled first (they are the ones that want a person), then the days in order.
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

/**
 * The rows "done and owed" counts, on Visits' header line and on Home's money line ("Owed on N done jobs"): a Done visit whose
 * money word is Owed, and only that word. Bill sent has its own word (a bill that is overdue is Home's "N bills overdue", linking
 * to the Bill sent filter) and Failed its own figure, so neither is counted here. One job counts once however many of its visits are owed.
 */
export const owedRows = (rows: VisitRow[]): VisitRow[] => rows.filter((r) => r.work === "done" && r.money === "owed")
export const jobCount = (rows: VisitRow[]): number => new Set(rows.map((r) => r.jobId ?? r.id)).size

/** The header's line: how many visits, then (only when non-zero) how many have no day and how many done jobs are Owed (`owedRows`, the same count as Home's). */
export function visitsContext(rows: VisitRow[]): string {
  if (rows.length === 0) return "No visits yet."
  const needDay = rows.filter((r) => r.work === "needs-a-day" || r.work === "not-done").length
  const owed = jobCount(owedRows(rows))
  const parts = [`${rows.length} ${rows.length === 1 ? "visit" : "visits"} this season.`]
  if (needDay) parts.push(`${needDay} unscheduled.`)
  if (owed) parts.push(`${owed} done and owed.`)
  return parts.join(" ")
}
