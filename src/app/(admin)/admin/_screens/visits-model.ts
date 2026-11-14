/**
 * The pure derivations behind VisitsScreen: one row per visit the app owns (pass visits and the office's and the
 * site's one-offs), with the two pills' states, the day and time in words, the truck, the price and the pass
 * number. Search reads the customer's name, street and phone through the first column, so a person finds a visit
 * by whatever they have in hand. Sorted with the visits that need a day first, then by day.
 */
import { TIME_ZONE } from "@/lib/admin/format"
import { dayOf } from "@/lib/admin/calendar"
import { MONEY_WORDS, WORK_WORDS, type MoneyState, type WorkState, visitJob } from "@/lib/admin/jobs"
import { KIND_LABEL, OFFICE_KINDS } from "@/lib/admin/visit-defaults"
import type { AdminData, Visit } from "@/lib/admin/types"
import { dayOfVisit, kindLabel, priceWords, timeWords } from "./visit-panel-model"

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
  truck: string
  truckId: string
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
}

const digits = (s: string | undefined) => (s ?? "").replace(/\D/g, "")

/** The visits the app owns: a pass's, or one with a job. Visits read from the Jobber calendar feed are the Schedule's, not a sale. */
const isOurs = (v: Visit) => v.isPass || Boolean(v.jobId)

export function visitRows(data: AdminData, today: string): VisitRow[] {
  const day = dayOf(today, TIME_ZONE)
  const clients = new Map(data.clients.map((c) => [c.id, c]))
  const passes = new Map(data.passes.map((p) => [p.id, p]))
  const trucks = new Map(data.settings.trucks.map((t) => [t.id, t.name]))
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
      truck: v.truckName ?? (v.truckId ? (trucks.get(v.truckId) ?? "") : ""),
      truckId: v.truckId ?? "none",
      work: states.work,
      workLabel: states.workLabel,
      money: states.money,
      moneyLabel: states.moneyLabel,
      dayPassed: states.dayPassed,
      price: v.price ?? 0,
      priceLabel: priceWords(v),
      jobType: v.passId ? "pass" : "one-off",
      ...(pass ? { passNumber: pass.number, passId: pass.id } : {}),
    }
  })
  // Needs a day first (they are the ones that want a person), then the days in order.
  return rows.sort((a, b) => (a.day ?? "0").localeCompare(b.day ?? "0") || a.name.localeCompare(b.name))
}

export const WORK_OPTIONS = (Object.keys(WORK_WORDS) as WorkState[]).map((value) => ({ value, label: WORK_WORDS[value] }))
export const MONEY_OPTIONS = (Object.keys(MONEY_WORDS) as MoneyState[]).map((value) => ({ value, label: MONEY_WORDS[value] }))
export const KIND_OPTIONS = OFFICE_KINDS.map((value) => ({ value, label: KIND_LABEL[value] }))
export const JOB_TYPE_OPTIONS = [
  { value: "pass", label: "On a pass" },
  { value: "one-off", label: "One-off" },
]

/** The header's line: how many visits, and how many need a day or money. */
export function visitsContext(rows: VisitRow[]): string {
  if (rows.length === 0) return "No visits yet."
  const needDay = rows.filter((r) => r.work === "needs-a-day" || r.work === "not-done").length
  const owed = rows.filter((r) => r.work === "done" && r.money !== "paid").length
  const parts = [`${rows.length} ${rows.length === 1 ? "visit" : "visits"}`]
  if (needDay) parts.push(`${needDay} need a day`)
  if (owed) parts.push(`${owed} done and not paid`)
  return `${parts.join(", ")}.`
}
