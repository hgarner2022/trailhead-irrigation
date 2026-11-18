/**
 * The pure derivations behind JobsScreen: one row per job (a Season Pass, or a one-off: repair, installation, other)
 * with who it is for, where, when it was sold and how, how far its visits have got, what it comes to, its stage
 * (`src/lib/jobs/stage.ts`) and its money in the words of `src/lib/money/words.ts`: Paid, "$115 owed", Bill sent, Overdue
 * and Failed. Everything is read from `AdminData`; a bill reads "$145 · Bill sent, due Dec 1" and, once the due day has
 * gone, "$145 · Overdue since Dec 1". The rows are ordered with the bills that are out first, the oldest due day on top.
 */
import { TIME_ZONE } from "@/lib/admin/format"
import { dayOf } from "@/lib/admin/calendar"
import { visitJob } from "@/lib/admin/jobs"
import type { AdminData, AdminInvoice, Client, SoldJob, SoldJobMoney, Visit } from "@/lib/admin/types"
import { jobMoney as moneyOfJob } from "@/lib/money/words"
import { STAGE_WORDS, type JobStage } from "@/lib/jobs/stage"
import type { TaxRule } from "@/lib/jobs/tax"
import { dayLabel, dayOfVisit, ruleOfData } from "./visit-panel-model"

export type JobMoneyState = "not-yet" | "paid" | "owed" | "bill-sent" | "overdue" | "failed"
export type JobKind = SoldJob["kind"]

export interface JobRow {
  id: string
  /** the customer's full name: the first column, and what opens the job panel */
  name: string
  /** name, street, town, phone and pass number together: what the search box matches */
  search: string
  customerId: string
  kind: JobKind
  kindLabel: string
  /** "Season Pass TH-2027-0007", "Repair", "Installation", or the first line's name for other work */
  title: string
  passId?: string
  passNumber?: string
  /** the pass's season, else the calendar year the job was sold */
  season: number
  /** "Erie" or "12 Elm St, Erie" for a manager */
  property: string
  /** the day it was sold, "2026-11-03"; absent when the data has none */
  soldOn?: string
  source: SoldJob["source"]
  /** "Nov 3, website" */
  soldText: string
  visitsDone: number
  visitsLive: number
  /** "2 of 3 done", "No visits" */
  visitsText: string
  /** whole dollars, cancelled lines left out */
  total: number
  stage: JobStage
  stageLabel: string
  money: JobMoneyState
  /** the one Money cell */
  moneyText: string
  owed: number
  /** the due day of the open bill, "2026-12-01", when one is out */
  billDue?: string
  /** the day the next visit has ("2026-11-19"), when one does */
  nextDay?: string
  /** "Thu, Nov 19", "Unscheduled" or "None" */
  nextText: string
}

export const SOURCE_WORDS: Record<SoldJob["source"], string> = { checkout: "website", office: "office", site: "site", renewal: "renewal" }
export const KIND_WORDS_JOB: Record<JobKind, string> = { pass: "Season Pass", repair: "Repair", install: "Installation", other: "Other" }
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const monthDay = (day: string) => `${MONTHS[Number(day.slice(5, 7)) - 1]} ${Number(day.slice(8, 10))}`
const dollars = (n: number) => `$${n.toLocaleString("en-US")}`

/** What a job is called wherever it is named: its pass number, or the work it is. */
export function jobTitle(job: Pick<SoldJob, "kind" | "passNumber" | "lines">): string {
  if (job.kind === "pass") return `Season Pass ${job.passNumber ?? ""}`.trim()
  if (job.kind === "other") return job.lines?.find((l) => !l.cancelledAt)?.name ?? KIND_WORDS_JOB.other
  return KIND_WORDS_JOB[job.kind]
}

/** The job's panel line under the customer's name: "Season Pass TH-2027-0007 · 2027" or "Repair · sold Nov 3". */
export function jobHeading(job: Pick<SoldJob, "kind" | "passNumber" | "lines" | "soldOn">, season: number): string {
  if (job.kind === "pass") return `${jobTitle(job)} · ${season}`
  return `${jobTitle(job)}${job.soldOn ? ` · sold ${monthDay(job.soldOn)}` : ""}`
}

/** The job's money as the data carries it, else worked out the same way from its lines and payments (the fixtures carry neither). */
function moneyOf(job: SoldJob, visits: Visit[], rule: TaxRule): SoldJobMoney {
  if (job.money) return job.money
  const lines = job.lines?.length ? job.lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice, taxable: l.taxable, cancelledAt: l.cancelledAt ? new Date(l.cancelledAt) : null })) : visits.filter((v) => v.status !== "cancelled").map((v) => ({ quantity: 1, unitPrice: v.price ?? 0, taxable: false, cancelledAt: null }))
  const payments = job.payments ?? visits.flatMap((v) => v.payments ?? [])
  return moneyOfJob(lines, payments, visits.map((v) => ({ id: v.id, cancelled: v.status === "cancelled", price: v.price })), rule, job.invoice ? {} : undefined)
}

/** The Money cell for a state: "$145 · Bill sent, due Dec 1", "$145 · Overdue since Dec 1", "$115 owed", "Paid", "Failed". */
export function moneyCell(state: JobMoneyState, m: Pick<SoldJobMoney, "total" | "owed" | "words"> & { paid?: number }, invoice?: Pick<AdminInvoice, "total" | "sentOn" | "dueOn" | "status">): string {
  switch (state) {
    case "paid":
      return `${dollars(m.total)} · Paid`
    case "owed":
      return m.words
    case "bill-sent":
      return `${dollars(invoice?.total ?? m.owed)} · Bill sent${invoice ? `, due ${monthDay(invoice.dueOn)}` : ""}`
    case "overdue":
      return `${dollars(invoice?.total ?? m.owed)} · Overdue since ${invoice ? monthDay(invoice.dueOn) : "its due day"}`
    case "failed":
      return `${dollars(m.owed)} · Failed`
    default:
      // nothing is due yet: the price, with what arrived beforehand (a deposit) after it
      return m.total > 0 ? `${dollars(m.total)}${m.paid ? ` · ${dollars(m.paid)} paid` : ""}` : "Quote later"
  }
}

/** The money state of a job: Paid, an open bill, Failed, Owed once a done visit is unpaid, else nothing is due yet. */
function stateOf(m: SoldJobMoney, invoice: AdminInvoice | undefined, visitMoneys: string[], cancelled: boolean): JobMoneyState {
  if (m.total > 0 && m.owed === 0) return "paid"
  if (cancelled) return m.paid > 0 ? "paid" : "not-yet"
  if (m.total === 0 && m.paid === 0) return "not-yet"
  if (invoice) return invoice.status === "overdue" ? "overdue" : "bill-sent"
  if (visitMoneys.includes("failed")) return "failed"
  if (visitMoneys.includes("owed")) return "owed"
  return "not-yet"
}

const clientAddress = (c: Client | undefined) => (c?.address ? `${c.address}, ${c.town}` : (c?.town ?? ""))
const digits = (s: string | undefined) => (s ?? "").replace(/\D/g, "")

/** One row per job the app owns. A pass nobody paid for (Pending) is an unfinished checkout, not a job. */
export function jobRows(data: AdminData, today: string): JobRow[] {
  const day = dayOf(today, TIME_ZONE)
  const clients = new Map(data.clients.map((c) => [c.id, c]))
  const passes = new Map(data.passes.map((p) => [p.id, p]))
  const rows = (data.jobs ?? [])
    // a pass that is not sold yet (the checkout's card step is not finished) is an unfinished checkout, not a job
    .filter((j) => !(j.kind === "pass" && !j.soldOn))
    .map((job): JobRow => {
      const client = clients.get(job.customerId)
      const pass = job.passId ? passes.get(job.passId) : undefined
      const visits = data.visits.filter((v) => v.jobId === job.id || job.visitIds.includes(v.id))
      const live = visits.filter((v) => v.status !== "cancelled" && !v.skipped)
      const done = live.filter((v) => v.status === "completed")
      const states = live.map((v) => visitJob(v, day, TIME_ZONE, pass?.cardFailedAt))
      // the job's stage is read from its facts where the data is shaped (`stageOf`): there is no typed status
      const stage = job.status
      const m = moneyOf(job, visits, ruleOfData(data))
      const state = stateOf(m, job.invoice, states.map((s) => s.money), stage === "cancelled")
      const ahead = live.filter((v) => v.status !== "completed")
      const days = ahead.map(dayOfVisit).filter((d): d is string => Boolean(d) && d! >= day).sort()
      const season = pass?.season ?? (job.soldOn ? Number(job.soldOn.slice(0, 4)) : Number(day.slice(0, 4)))
      const street = clientAddress(client)
      return {
        id: job.id,
        name: client ? [client.firstName, client.lastName].filter(Boolean).join(" ") : (visits[0]?.clientName ?? "Customer"),
        search: [client?.firstName, client?.lastName, street, client?.phone, digits(client?.phone), job.passNumber, pass?.number].filter(Boolean).join(" "),
        customerId: job.customerId,
        kind: job.kind,
        kindLabel: KIND_WORDS_JOB[job.kind],
        title: jobTitle(job),
        ...(job.passId ? { passId: job.passId } : {}),
        ...(job.passNumber ? { passNumber: job.passNumber } : {}),
        season,
        property: street,
        ...(job.soldOn ? { soldOn: job.soldOn } : {}),
        source: job.source,
        // "Nov 3, website"; "Not sold yet" while a quote is waiting (`sold_on` is empty)
        soldText: job.soldOn ? [monthDay(job.soldOn), SOURCE_WORDS[job.source]].join(", ") : "Not sold yet",
        visitsDone: done.length,
        visitsLive: live.length,
        visitsText: live.length ? `${done.length} of ${live.length} done` : "No visits",
        total: m.total,
        stage,
        stageLabel: STAGE_WORDS[stage],
        money: state,
        // a cancelled job with nothing held has no money to say
        moneyText: stage === "cancelled" && state === "not-yet" ? "" : moneyCell(state, m, job.invoice),
        owed: m.owed,
        ...(job.invoice ? { billDue: job.invoice.dueOn } : {}),
        ...(days[0] ? { nextDay: days[0] } : {}),
        nextText: days[0] ? dayLabel(days[0]) : ahead.length ? "Unscheduled" : "None",
      }
    })
  // The bills that are out come first, the oldest due day on top; then the newest sale.
  return rows.sort((a, b) => Number(Boolean(b.billDue)) - Number(Boolean(a.billDue)) || (a.billDue ?? "").localeCompare(b.billDue ?? "") || (b.soldOn ?? "").localeCompare(a.soldOn ?? "") || a.name.localeCompare(b.name))
}

export const STAGE_OPTIONS = (Object.keys(STAGE_WORDS) as JobStage[]).map((value) => ({ value, label: STAGE_WORDS[value] }))
export const MONEY_STATE_WORDS: Record<Exclude<JobMoneyState, "not-yet">, string> = { owed: "Owed", "bill-sent": "Bill sent", overdue: "Overdue", paid: "Paid", failed: "Failed" }
export const MONEY_OPTIONS = (Object.keys(MONEY_STATE_WORDS) as (keyof typeof MONEY_STATE_WORDS)[]).map((value) => ({ value, label: MONEY_STATE_WORDS[value] }))
export const KIND_OPTIONS = (Object.keys(KIND_WORDS_JOB) as JobKind[]).map((value) => ({ value, label: KIND_WORDS_JOB[value] }))
/** The seasons the rows are from, newest first, as Season filter options. */
export const seasonOptions = (rows: JobRow[]) => [...new Set(rows.map((r) => r.season))].sort((a, b) => b - a).map((s) => ({ value: String(s), label: String(s) }))

/** The Money values the "bills out" chip applies: a bill sent and a bill past its due day. */
export const BILLS_OUT: JobMoneyState[] = ["bill-sent", "overdue"]
export const billsOut = (rows: JobRow[]): number => rows.filter((r) => BILLS_OUT.includes(r.money)).length
export const owedJobs = (rows: JobRow[]): number => rows.filter((r) => r.money === "owed").length

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * The header line: "12 jobs this season. 3 owed. 1 needs a quote."; the bills out are the chip beside it. This season is the
 * calendar year `today` is in and any season after it (a pass sold in November for the next year is already this season's work).
 */
export function jobsContext(rows: JobRow[], today: string): string {
  if (rows.length === 0) return "No jobs yet."
  const year = Number(today.slice(0, 4))
  const parts = [`${plural(rows.filter((r) => r.season >= year).length, "job", "jobs")} this season.`]
  const owed = owedJobs(rows)
  if (owed) parts.push(`${owed} owed.`)
  const quotes = rows.filter((r) => r.stage === "needs-a-quote").length
  if (quotes) parts.push(`${quotes} ${quotes === 1 ? "needs a quote" : "need a quote"}.`)
  return parts.join(" ")
}

/** The chip's words: "2 bills out". */
export const billsChip = (n: number): string => `${n} ${n === 1 ? "bill" : "bills"} out`

/** A link's `?money=bill-sent,overdue` or `?kind=repair`: the listed values that are real options, or no chip. */
export function filterFrom(column: string, param: string | undefined, options: { value: string }[]): { column: string; values: string[] }[] {
  const values = (param ?? "").split(",").filter((v) => options.some((o) => o.value === v))
  return values.length ? [{ column, values }] : []
}
