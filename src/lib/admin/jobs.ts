/**
 * Visits are jobs (scheduling design, 14 Nov 2026). One status set for a
 * visit as the admin shows it, derived in one place from the row, so the
 * Passes panel, the Schedule, the pass page and Home never word a state two
 * ways. Nothing here is stored: the words map onto the existing rows
 * (`visit.status`, `scheduled_on`, `start_time`, the job's payment rows
 * (`charge`), `customer.card_failed_at`). Money is never read from a flag: the
 * words come from the payment rows through `src/lib/money/words.ts`.
 *
 *   Unscheduled      unscheduled
 *   Scheduled       a day, no start time yet
 *   Routed          a start time is set
 *   Done            marked done, no payment row yet (money: Owed)
 *   Charged         the visit's payments add up above zero (money: Paid)
 *   Charge failed   the visit's newest payment did not go through, or it is
 *                   done and the customer's card failed (money: Failed)
 *   Cancelled, Skipped
 *
 * "Not closed" is a flag on a job that has a day that has passed and is not
 * marked done. It is shown as a badge beside the state, never as a state.
 *
 * The screens show two pills instead of that one state (owner, 14 Nov: "it needs to be very obvious that money
 * was collected"): WORK (Unscheduled, Scheduled, Done, Not done with its reason, Cancelled) and MONEY (nothing
 * until the visit is done, then Paid with how, Owed, Bill sent, Failed). A Scheduled visit whose day has passed stays Scheduled with a "day passed"
 * note; Routed is a start time in the Time column, not a state. `statesOf` derives both from the same row.
 */
import type { TaxRule } from "@/lib/jobs/tax"
import { isPaid, jobMoney as jobMoneyWords, METHOD_WORDS, paidTotal, visitMoney, type MoneyInvoice, type MoneyPayment } from "@/lib/money/words"
import { addDays, dayOf } from "./calendar"
import { TIME_ZONE } from "./format"
import type { AdminData, AdminInvoice, AdminPayment, JobLine, Pass, PassVisit, SoldJob, Visit, VisitStatus } from "./types"

export type JobState = "needs-a-day" | "scheduled" | "routed" | "done" | "charged" | "charge-failed" | "cancelled" | "skipped"

export const JOB_WORDS: Record<JobState, string> = {
  "needs-a-day": "Unscheduled",
  scheduled: "Scheduled",
  routed: "Routed",
  done: "Done",
  charged: "Charged",
  "charge-failed": "Charge failed",
  cancelled: "Cancelled",
  skipped: "Skipped",
}

export const NOT_CLOSED_WORD = "Not closed"

export type WorkState = "needs-a-day" | "scheduled" | "done" | "not-done" | "cancelled"
export type MoneyState = "not-yet" | "paid" | "owed" | "bill-sent" | "failed"

export const WORK_WORDS: Record<WorkState, string> = { "needs-a-day": "Unscheduled", scheduled: "Scheduled", done: "Done", "not-done": "Not done", cancelled: "Cancelled" }
export const MONEY_WORDS: Record<MoneyState, string> = { "not-yet": "", paid: "Paid", owed: "Owed", "bill-sent": "Bill sent", failed: "Failed" }
export { METHOD_WORDS }
export const REASON_WORDS: Record<string, string> = { "could-not-get-in": "could not get in", "no-water": "no water on", "customer-asked-to-wait": "customer asked to wait", other: "something else" }

/** What the two pills and the small note say about one visit. */
export interface VisitStates {
  work: WorkState
  money: MoneyState
  /** "Paid, check" for a paid visit, else the money word */
  moneyLabel: string
  /** "Not done, no water on" for a not-done visit, else the work word */
  workLabel: string
  /** the visit is Scheduled and its day has passed: a note under the pill, never a state */
  dayPassed: boolean
  reason?: string
}

/** How far back "not closed" looks: older days are a cleanup, not a morning prompt. */
export const NOT_CLOSED_LOOKBACK_DAYS = 14

/** The row facts a job's state is read from. Dates are Mountain calendar days (YYYY-MM-DD). */
export interface JobRow {
  status: VisitStatus | "skipped" | "not-closed"
  scheduledOn?: string | null
  startTime?: string | null
  completedOn?: string | null
  /** the visit this row is, for matching its payment rows; the payments given are the visit's own */
  visitId?: string | null
  /** what the visit costs, whole dollars (its live lines); the money reads Paid only once the payments reach it. Absent for an unpriced visit. */
  price?: number
  /** the visit's payment rows (`charge`), refunds as negatives: the money words are read from these */
  payments?: MoneyPayment[]
  /** the visit's newest payment row did not succeed */
  chargeFailed?: boolean
  /** the pass's card failed and has not been retried since */
  cardFailedAt?: string | null
  /** why the last attempt did not happen, until the visit has a day again */
  notDoneReason?: string | null
  /** the open bill this visit's lines are on (sent or overdue): the money reads Bill sent */
  invoice?: AdminInvoice
  /** @deprecated alias for the fixtures: a bill was sent and is not yet paid; live data reads `invoice` */
  billSent?: boolean
}

export interface Job extends VisitStates {
  state: JobState
  /** the day has passed and nobody marked the job done */
  notClosed: boolean
  /** the day the job has, when it has one */
  day?: string
}

type PaymentSource = { id?: string | null; payments?: AdminPayment[]; price?: number; amount?: number }

/** The payment rows a visit's words are read from: its own rows, none when it has none. */
export function paymentsOf(v: PaymentSource): MoneyPayment[] {
  return v.payments ?? []
}

/** The visit's price as the screens hold it: a calendar visit's `price`, a pass visit's `amount`; absent for an unpriced one. */
const priceOf = (v: PaymentSource): number | undefined => v.price ?? v.amount

/** The visit's money is settled: its payments add up to its price (`isPaid` in `src/lib/money/words.ts`); a part-paid visit is not paid. */
export const visitPaid = (v: PaymentSource): boolean => isPaid(paymentsOf(v), priceOf(v))

/** What the visit has been paid, whole dollars: its succeeded rows added up, refunds counting against. */
export const visitPaidTotal = (v: PaymentSource): number => paidTotal(paymentsOf(v))

/** The day the visit's money last arrived: its newest succeeded payment's `paid_on` (a day). Nothing once a refund has left nothing paid. */
export function visitPaidOn(v: PaymentSource): string | undefined {
  if (!v.payments || paidTotal(v.payments) <= 0) return undefined
  return [...v.payments].reverse().find((p) => p.status === "succeeded" && p.amount > 0 && p.paidOn)?.paidOn ?? undefined
}

/** The money word of one row, read from its payment rows by `src/lib/money/words.ts`: nothing until it is done, then Paid with how, Failed, Bill sent or Owed. */
export function moneyOf(row: JobRow): { state: MoneyState; label: string } {
  const done = row.status === "completed" || Boolean(row.completedOn)
  const gone = row.status === "cancelled" || row.status === "skipped"
  const id = row.visitId ?? ""
  const payments = row.payments ?? []
  const invoice: MoneyInvoice | undefined = row.invoice || row.billSent ? {} : undefined
  const money = visitMoney({ id, done: done || paidTotal(payments) > 0, cancelled: gone, cardFailed: Boolean(row.cardFailedAt), price: row.price }, payments, invoice)
  // A failed attempt the caller already knows of (the newest row failed) wins over everything but Paid, even before the visit is done.
  return money.state !== "paid" && !gone && row.chargeFailed ? { state: "failed", label: MONEY_WORDS.failed } : money
}

/** The two pills' states for one row. `today` is the Mountain calendar day (YYYY-MM-DD). */
export function statesOf(row: JobRow, today: string): VisitStates {
  const done = row.status === "completed" || Boolean(row.completedOn)
  const gone = row.status === "cancelled" || row.status === "skipped"
  const reason = !done && !row.scheduledOn && row.notDoneReason ? row.notDoneReason : undefined
  const work: WorkState = gone ? "cancelled" : done ? "done" : row.scheduledOn || row.status === "scheduled" || row.status === "not-closed" ? "scheduled" : reason ? "not-done" : "needs-a-day"
  const money = moneyOf(row)
  return {
    work,
    money: money.state,
    moneyLabel: money.label,
    workLabel: reason ? `Not done, ${REASON_WORDS[reason] ?? reason}` : WORK_WORDS[work],
    dayPassed: work === "scheduled" && Boolean(row.scheduledOn) && row.scheduledOn! < today,
    ...(reason ? { reason } : {}),
  }
}

/**
 * The money summary a job carries across its visits, from its lines and payment rows (`jobMoney` in `src/lib/money/words.ts`):
 * "Paid", "$115 owed" or "1 of 2 paid, $115 owed", empty for a job nothing has priced. Without the job's own lines or payments
 * (the fixtures) the visits' prices and their payments stand in; a cancelled visit is not counted.
 */
export function jobMoney(job: Pick<SoldJob, "lines" | "payments" | "invoice"> | undefined, visits: Pick<Visit, "id" | "status" | "price" | "payments">[], rule: TaxRule): string {
  const live = visits.filter((v) => v.status !== "cancelled")
  const lines = job?.lines
    ? job.lines.map((l: JobLine) => ({ quantity: l.quantity, unitPrice: l.unitPrice, taxable: l.taxable, cancelledAt: l.cancelledAt ? new Date(l.cancelledAt) : null }))
    // a visit's `price` already carries its tax, so a line made from one is not taxed again
    : live.map((v) => ({ quantity: 1, unitPrice: v.price ?? 0, taxable: false, cancelledAt: null }))
  const payments = job?.payments ?? visits.flatMap((v) => paymentsOf(v))
  const prices = visits.map((v) => ({ id: v.id, cancelled: v.status === "cancelled", price: v.price }))
  return jobMoneyWords(lines, payments, prices, rule, job?.invoice ? {} : undefined).words
}

/** The job's state and its not-closed flag. `today` is the Mountain calendar day (YYYY-MM-DD). */
export function jobOf(row: JobRow, today: string): Job {
  return { ...baseJob(row, today), ...statesOf(row, today) }
}

function baseJob(row: JobRow, today: string): Omit<Job, keyof VisitStates> {
  const done = row.status === "completed" || Boolean(row.completedOn)
  const day = row.scheduledOn ?? undefined
  const open = (state: JobState): Omit<Job, keyof VisitStates> => ({ state, notClosed: false, ...(day ? { day } : {}) })
  if (row.status === "skipped") return open("skipped")
  if (row.status === "cancelled") return open("cancelled")
  const money = moneyOf(row).state
  if (money === "paid") return open("charged")
  if (money === "failed") return open("charge-failed")
  if (done) return open("done")
  if (row.scheduledOn) return { state: row.startTime ? "routed" : "scheduled", notClosed: row.scheduledOn < today, day: row.scheduledOn }
  // The old status word for the same thing, before a day was read off the row.
  if (row.status === "not-closed") return { state: "scheduled", notClosed: true }
  return open(row.status === "scheduled" ? "scheduled" : "needs-a-day")
}

/** A calendar visit's job; the day is read off `startAt` (the screens move a visit by moving it), else off `scheduledOn`. */
export function visitJob(visit: Visit, today: string, timeZone: string, cardFailedAt?: string): Job {
  return jobOf(
    {
      status: visit.skipped ? "skipped" : visit.status,
      scheduledOn: visit.startAt ? dayOf(visit.startAt, timeZone) : visit.scheduledOn,
      startTime: visit.startTime,
      completedOn: visit.completedOn,
      visitId: visit.id,
      price: visit.price,
      ...(visit.payments ? { payments: visit.payments } : {}),
      chargeFailed: visit.chargeFailed,
      cardFailedAt,
      notDoneReason: visit.notDoneReason,
      invoice: visit.invoice,
      billSent: visit.billSent,
    },
    today,
  )
}

/** A pass visit's job; the day and window come off the visit, the failed card off the pass. */
export function passVisitJob(pass: Pick<Pass, "cardFailedAt">, visit: PassVisit, today: string, timeZone: string): Job {
  return jobOf(
    {
      status: visit.completedAt ? "completed" : visit.scheduledOn || visit.scheduledAt ? "scheduled" : "unscheduled",
      scheduledOn: visit.scheduledOn ?? (visit.scheduledAt ? dayOf(visit.scheduledAt, timeZone) : undefined),
      startTime: visit.startTime,
      completedOn: visit.completedAt ? dayOf(visit.completedAt, timeZone) : undefined,
      visitId: visit.id,
      price: visit.amount,
      ...(visit.payments ? { payments: visit.payments } : {}),
      chargeFailed: visit.chargeFailed,
      cardFailedAt: pass.cardFailedAt,
      notDoneReason: visit.notDoneReason,
      invoice: visit.invoice,
      billSent: visit.billSent,
    },
    today,
  )
}

/** "8 to 10 am", "11 am to 1 pm": the window a start time opens, `minutes` long (two hours when the row says nothing). */
export function windowLabel(startTime: string, minutes = 120): string {
  const start = Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3, 5))
  const end = start + minutes
  const part = (m: number) => {
    const h = Math.floor(m / 60) % 24
    const mm = m % 60
    return { h12: h % 12 === 0 ? 12 : h % 12, mm, am: h < 12 }
  }
  const a = part(start)
  const b = part(end)
  const clock = (p: ReturnType<typeof part>) => (p.mm ? `${p.h12}:${String(p.mm).padStart(2, "0")}` : String(p.h12))
  const meridiem = (p: ReturnType<typeof part>) => (p.am ? "am" : "pm")
  return a.am === b.am ? `${clock(a)} to ${clock(b)} ${meridiem(b)}` : `${clock(a)} ${meridiem(a)} to ${clock(b)} ${meridiem(b)}`
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** The day a pass visit has, "Apr 26", with its window when a start time is set: "Apr 26, 8 to 10 am". Empty before a day is set; never a preference. */
export function dayWords(visit: PassVisit | undefined): string {
  const day = visit?.scheduledOn ?? (visit?.scheduledAt ? dayOf(visit.scheduledAt, TIME_ZONE) : undefined)
  if (!visit || !day) return ""
  const short = `${SHORT_MONTHS[Number(day.slice(5, 7)) - 1]} ${Number(day.slice(8, 10))}`
  return visit.startTime ? `${short}, ${windowLabel(visit.startTime, visit.windowMinutes)}` : short
}

export interface JobCounts {
  /** jobs of active passes with no day */
  needsDay: number
  /** done jobs whose charge did not go through */
  chargeFailed: number
  /** jobs with a day that has passed, not marked done */
  notClosed: number
  /** pending passes: unpaid attempts that expire after an hour */
  pendingPasses: number
}

/**
 * The counts Home shows, read from the same derivations as every screen:
 * pass jobs by `passVisitJob` (active passes only), calendar visits by
 * `visitJob`. A pass's own visits appear on both lists in live data, so the
 * calendar list is read only for visits that are not a pass's (`!isPass`).
 */
export function jobCounts(data: Pick<AdminData, "passes" | "visits">, today: string, timeZone: string): JobCounts {
  const counts: JobCounts = { needsDay: 0, chargeFailed: 0, notClosed: 0, pendingPasses: 0 }
  const earliest = addDays(today, -NOT_CLOSED_LOOKBACK_DAYS)
  const recent = (job: Job) => job.notClosed && job.day !== undefined && job.day >= earliest
  for (const pass of data.passes) {
    if (pass.status === "pending") counts.pendingPasses += 1
    if (pass.status !== "active") continue
    for (const visit of pass.visits) {
      const job = passVisitJob(pass, visit, today, timeZone)
      if (job.state === "needs-a-day") counts.needsDay += 1
      if (job.state === "charge-failed") counts.chargeFailed += 1
      if (recent(job)) counts.notClosed += 1
    }
  }
  for (const visit of data.visits) {
    if (visit.isPass) continue
    const job = visitJob(visit, today, timeZone)
    if (job.state === "charge-failed") counts.chargeFailed += 1
    if (recent(job)) counts.notClosed += 1
  }
  return counts
}
