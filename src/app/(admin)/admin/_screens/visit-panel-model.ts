/**
 * The pure derivations behind the visit panel and the Visits list: a visit's two pills, its day and time in words,
 * the facts about its customer, the job it belongs to (the pass with its number and its other visits, or the
 * booked work) and the messages that are about it. Everything is read from `AdminData`; nothing is derived twice.
 * Dates are Mountain calendar days (YYYY-MM-DD).
 */
import { TIME_ZONE } from "@/lib/admin/format"
import { dayOf } from "@/lib/admin/calendar"
import { jobMoney, visitJob, windowLabel, type Job } from "@/lib/admin/jobs"
import { KIND_LABEL, type OfficeKind } from "@/lib/admin/visit-defaults"
import type { AdminData, Client, JobLine, Message, Pass, SoldJob, Visit } from "@/lib/admin/types"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "Thu, Oct 14" for a calendar day. */
export function dayLabel(day: string): string {
  const d = new Date(`${day}T12:00:00Z`)
  return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

/** "8:00 am" for "08:00". */
export function clockLabel(time: string): string {
  const h = Number(time.slice(0, 2))
  return `${h % 12 === 0 ? 12 : h % 12}:${time.slice(3, 5)} ${h < 12 ? "am" : "pm"}`
}

export const kindLabel = (visit: Pick<Visit, "kind">) => KIND_LABEL[visit.kind as OfficeKind] ?? "Visit"

/** The day a visit has, or nothing. */
export const dayOfVisit = (visit: Visit): string | undefined => visit.scheduledOn ?? (visit.startAt ? dayOf(visit.startAt, TIME_ZONE) : undefined)

/** "Any time" or the window the start time opens, "8 to 10 am"; empty before a day is set. */
export function timeWords(visit: Visit): string {
  if (!dayOfVisit(visit)) return ""
  return visit.startTime ? windowLabel(visit.startTime, visit.minutes ?? 120) : "Any time"
}

/** The visit's own line on its job: the one billed after this visit and not cancelled. Absent when the data has no lines. */
export function visitLine(data: Pick<AdminData, "jobs">, visit: Pick<Visit, "id" | "jobId">): JobLine | undefined {
  return data.jobs?.find((j) => j.id === visit.jobId)?.lines?.find((l) => l.visitId === visit.id && !l.cancelledAt)
}

/** What the visit is worth: its line (quantity times unit price) when the job has one for it, else `visit.price`. */
export const visitPrice = (data: Pick<AdminData, "jobs">, visit: Visit): number => {
  const line = visitLine(data, visit)
  return line ? line.quantity * line.unitPrice : (visit.price ?? 0)
}

export const priceWords = (visit: Pick<Visit, "price">) => ((visit.price ?? 0) > 0 ? `$${visit.price!.toLocaleString("en-US")}` : "Quote later")

/** "Spring turn-on, 8 zones · $145": the line's name, then its total; a cancelled line reads "cancelled" in place of the price. */
export const lineWords = (line: JobLine): string => (line.cancelledAt ? `${line.name} · cancelled` : `${line.name} · $${(line.quantity * line.unitPrice).toLocaleString("en-US")}`)

export interface VisitFacts {
  visit: Visit
  client?: Client
  pass?: Pass
  job?: SoldJob
  /** the line billed after this visit, when the job has lines */
  line?: JobLine
  /** what the visit is worth, from that line when there is one */
  price: number
  /** the job's visits in day order, this one included */
  siblings: Visit[]
  states: Job
  /** "1 of 2 paid" */
  money: string
  /** every message to this customer, with the ones about this visit marked */
  messages: Message[]
}

/** Everything the panel shows about one visit; undefined when the visit is not in `data`. */
export function visitFacts(data: AdminData, visitId: string, today: string): VisitFacts | undefined {
  const visit = data.visits.find((v) => v.id === visitId)
  if (!visit) return undefined
  const day = dayOf(today, TIME_ZONE)
  const job = data.jobs?.find((j) => j.id === visit.jobId)
  const pass = data.passes.find((p) => p.id === visit.passId)
  const ids = job?.visitIds ?? (pass ? data.visits.filter((v) => v.passId === pass.id).map((v) => v.id) : [visit.id])
  const siblings = ids.map((id) => data.visits.find((v) => v.id === id)).filter((v): v is Visit => Boolean(v)).sort((a, b) => (dayOfVisit(a) ?? "9").localeCompare(dayOfVisit(b) ?? "9"))
  return {
    visit,
    client: data.clients.find((c) => c.id === visit.clientId),
    pass,
    job,
    line: visitLine(data, visit),
    price: visitPrice(data, visit),
    siblings,
    states: visitJob(visit, day, TIME_ZONE, pass?.cardFailedAt),
    money: jobMoney(siblings.map((v) => visitJob(v, day, TIME_ZONE, pass?.cardFailedAt))),
    messages: data.messages.filter((m) => m.clientId === visit.clientId),
  }
}

/** What Move will say it does, before it does it: "Moves the repair to Thu, Oct 14 and tells Dana." */
export function moveSentence(visit: Visit, day: string, time: string): string {
  const first = visit.clientName.split(" ")[0]
  return `Moves the ${kindLabel(visit).toLowerCase()} to ${dayLabel(day)}${time ? `, ${clockLabel(time)}` : ""} and tells ${first}.`
}

/** The half-hour starts Move offers, 7:00 am to 5:00 pm. */
export const TIME_CHOICES = Array.from({ length: 21 }, (_, i) => {
  const mins = 7 * 60 + i * 30
  const value = `${String(Math.floor(mins / 60)).padStart(2, "0")}:${mins % 60 === 0 ? "00" : "30"}`
  return { value, label: clockLabel(value) }
})
