// What the account screens pick out of a customer's jobs, pure: the next visit, the invoices waiting to be paid, the visits coming up and past, and
// the words on a job row. Everything reads the customer-safe `PortalJob` the API sends (`jobs.list`), never a row of its own.
import type { PortalJobType, PortalVisitType } from "@/api/v1/portal/schemas"
import { moneyWord, visitDay, type MoneyTone } from "@/lib/portal/words"

/** A visit with the job it belongs to, for the lists that cross jobs. */
export interface VisitOfJob {
  visit: PortalVisitType
  job: PortalJobType
}

const GONE = ["cancelled", "skipped"]

/** Every visit that is still part of live work: not canceled or skipped, on a job that is not canceled. */
export const liveVisits = (jobs: readonly PortalJobType[]): VisitOfJob[] =>
  jobs.filter((j) => !j.canceled && j.open).flatMap((job) => job.visits.filter((v) => !GONE.includes(v.status)).map((visit) => ({ visit, job })))

const byDay = (a: VisitOfJob, b: VisitOfJob) => (visitDay(a.visit) ?? "").localeCompare(visitDay(b.visit) ?? "") || (a.visit.startTime ?? "").localeCompare(b.visit.startTime ?? "")

/** The next day on the account: the earliest booked visit from today on; failing that the first visit still waiting for a day; null when there is neither. */
export function nextVisit(jobs: readonly PortalJobType[], today: string): VisitOfJob | null {
  const live = liveVisits(jobs)
  const booked = live.filter((x) => x.visit.status === "scheduled" && x.visit.scheduledOn && x.visit.scheduledOn >= today).sort(byDay)
  if (booked[0]) return booked[0]
  return live.find((x) => x.visit.status === "unscheduled") ?? null
}

/** The visits coming up: booked from today on, then the ones waiting for a day. Past: done, canceled, skipped, or a booked day that has gone by, newest first. */
export function visitLists(jobs: readonly PortalJobType[], today: string): { comingUp: VisitOfJob[]; past: VisitOfJob[] } {
  const all = jobs.flatMap((job) => job.visits.map((visit) => ({ visit, job })))
  const upcoming = (x: VisitOfJob) => !x.job.canceled && (x.job.open || x.visit.status === "scheduled") && !GONE.includes(x.visit.status) && x.visit.status !== "completed" && (x.visit.status === "unscheduled" || (x.visit.scheduledOn ?? "") >= today)
  const comingUp = all.filter(upcoming).sort((a, b) => (a.visit.scheduledOn ? 0 : 1) - (b.visit.scheduledOn ? 0 : 1) || byDay(a, b))
  const past = all.filter((x) => !upcoming(x)).sort((a, b) => byDay(b, a))
  return { comingUp, past }
}

export interface OpenInvoice {
  id: string
  jobId: string
  jobName: string
  total: number
  dueOn: string
  status: "sent" | "overdue"
  payHref: string
}

/** The invoices waiting to be paid, oldest due day first. Only an open one with a pay link counts; a paid invoice is history. */
export function openInvoices(jobs: readonly PortalJobType[]): OpenInvoice[] {
  return jobs
    .filter((j) => !j.canceled)
    .flatMap((j) => j.invoices.filter((i) => i.status !== "paid" && i.payUrl).map((i) => ({ id: i.id, jobId: j.id, jobName: j.name, total: i.total, dueOn: i.dueOn, status: i.status as "sent" | "overdue", payHref: i.payUrl! })))
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
}

/** The money word of a job, from its facts: the open invoice and what is owed. */
export function jobMoneyWord(job: PortalJobType): { tone: MoneyTone; label: string } {
  const open = job.invoices.find((i) => i.status !== "paid")
  return moneyWord({ owed: job.money.owed, words: job.money.words, invoice: open ? { dueOn: open.dueOn, status: open.status as "sent" | "overdue" } : null })
}

/** "2 visits" for the live visits of a job; null for a job with none. */
export function visitsLineOf(job: PortalJobType): string | undefined {
  const n = job.visits.filter((v) => !GONE.includes(v.status)).length
  return n ? `${n} visit${n === 1 ? "" : "s"}` : undefined
}

/** The ids of the visits whose day the customer may pick or change online, so the page asks `visits.areaDays` for those and no others. */
export const visitsToOffer = (list: readonly VisitOfJob[]): string[] => list.filter((x) => x.visit.change === "yes").map((x) => x.visit.id)
