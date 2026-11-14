/**
 * Visits are jobs (scheduling design, 14 Nov 2026). One status set for a
 * visit as the admin shows it, derived in one place from the row, so the
 * Passes panel, the Schedule, the pass page and Home never word a state two
 * ways. Nothing here is stored: the words map onto the existing rows
 * (`visit.status`, `scheduled_on`, `start_time`, `charged_at`, a failed
 * `charge` row, `season_pass.card_failed_at`).
 *
 *   Needs a day     unscheduled
 *   Scheduled       a day, no start time yet
 *   Routed          a start time is set
 *   Done            marked done, not charged
 *   Charged         `charged_at` is set
 *   Charge failed   the visit's newest charge did not go through, or it is
 *                   done and the pass's card failed
 *   Cancelled, Skipped
 *
 * "Not closed" is a flag on a job that has a day that has passed and is not
 * marked done. It is shown as a badge beside the state, never as a state.
 *
 * The screens show two pills instead of that one state (owner, 14 Nov: "it needs to be very obvious that money
 * was collected"): WORK (Needs a day, Scheduled, Done, Not done with its reason, Cancelled) and MONEY (Not yet,
 * Paid with how, Bill sent, Failed). A Scheduled visit whose day has passed stays Scheduled with a "day passed"
 * note; Routed is a start time in the Time column, not a state. `statesOf` derives both from the same row.
 */
import { addDays, dayOf } from "./calendar"
import { TIME_ZONE } from "./format"
import type { AdminData, Pass, PassVisit, Visit, VisitStatus } from "./types"

export type JobState = "needs-a-day" | "scheduled" | "routed" | "done" | "charged" | "charge-failed" | "cancelled" | "skipped"

export const JOB_WORDS: Record<JobState, string> = {
  "needs-a-day": "Needs a day",
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
export type MoneyState = "not-yet" | "paid" | "bill-sent" | "failed"

export const WORK_WORDS: Record<WorkState, string> = { "needs-a-day": "Needs a day", scheduled: "Scheduled", done: "Done", "not-done": "Not done", cancelled: "Cancelled" }
export const MONEY_WORDS: Record<MoneyState, string> = { "not-yet": "Not yet", paid: "Paid", "bill-sent": "Bill sent", failed: "Failed" }
/** The words for how a payment came, as the pill's suffix and the receipt say them. */
export const METHOD_WORDS: Record<string, string> = { card_on_file: "card", card_now: "card", check: "check", venmo: "Venmo", cash: "cash", bill: "bill" }
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
  chargedAt?: string | null
  /** the visit's newest charge row did not succeed */
  chargeFailed?: boolean
  /** the pass's card failed and has not been retried since */
  cardFailedAt?: string | null
  /** why the last attempt did not happen, until the visit has a day again */
  notDoneReason?: string | null
  /** how it was paid (`charge.method`), once it is */
  paidMethod?: string | null
  /** a bill was sent and is not yet paid */
  billSent?: boolean
}

export interface Job extends VisitStates {
  state: JobState
  /** the day has passed and nobody marked the job done */
  notClosed: boolean
  /** the day the job has, when it has one */
  day?: string
}

/** The two pills' states for one row. `today` is the Mountain calendar day (YYYY-MM-DD). */
export function statesOf(row: JobRow, today: string): VisitStates {
  const done = row.status === "completed" || Boolean(row.completedOn)
  const gone = row.status === "cancelled" || row.status === "skipped"
  const paid = Boolean(row.chargedAt)
  const reason = !done && !row.scheduledOn && row.notDoneReason ? row.notDoneReason : undefined
  const work: WorkState = gone ? "cancelled" : done ? "done" : row.scheduledOn || row.status === "scheduled" || row.status === "not-closed" ? "scheduled" : reason ? "not-done" : "needs-a-day"
  const money: MoneyState = paid ? "paid" : row.chargeFailed || (done && row.cardFailedAt) ? "failed" : row.billSent ? "bill-sent" : "not-yet"
  const how = row.paidMethod ? METHOD_WORDS[row.paidMethod] : undefined
  return {
    work,
    money,
    moneyLabel: money === "paid" && how ? `Paid, ${how}` : MONEY_WORDS[money],
    workLabel: reason ? `Not done, ${REASON_WORDS[reason] ?? reason}` : WORK_WORDS[work],
    dayPassed: work === "scheduled" && Boolean(row.scheduledOn) && row.scheduledOn! < today,
    ...(reason ? { reason } : {}),
  }
}

/** "1 of 2 paid": the money summary a job (a pass or booked work) carries across its visits; cancelled visits are not counted. */
export function jobMoney(states: Pick<VisitStates, "work" | "money">[]): string {
  const live = states.filter((s) => s.work !== "cancelled")
  return `${live.filter((s) => s.money === "paid").length} of ${live.length} paid`
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
  if (row.chargedAt) return open("charged")
  if (row.chargeFailed || (done && row.cardFailedAt)) return open("charge-failed")
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
      chargedAt: visit.chargedAt,
      chargeFailed: visit.chargeFailed,
      cardFailedAt,
      notDoneReason: visit.notDoneReason,
      paidMethod: visit.paidMethod,
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
      chargedAt: visit.chargedAt,
      chargeFailed: visit.chargeFailed,
      cardFailedAt: pass.cardFailedAt,
      notDoneReason: visit.notDoneReason,
      paidMethod: visit.paidMethod,
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
