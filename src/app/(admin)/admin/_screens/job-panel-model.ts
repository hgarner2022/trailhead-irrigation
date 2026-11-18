/**
 * The pure derivations behind the job panel: one job's row, its customer, pass, visits in day order, the yard it is at, its
 * lines, its payments newest first, its open bill, and what the manager may do (change lines, take a payment, send a bill, add
 * a visit). Everything is read from `AdminData`; the same words as the grid (`jobs-model.ts`).
 */
import type { AdminData, AdminPayment, Client, JobLine, Pass, SoldJob, Visit, Yard } from "@/lib/admin/types"
import { METHOD_WORDS } from "@/lib/money/words"
import { billState, type BillState } from "./bill-model"
import { jobHeading, jobRows, type JobRow } from "./jobs-model"
import { propertiesOf } from "./customers-model"
import { dayOfVisit } from "./visit-panel-model"

export interface JobFacts {
  job: SoldJob
  row: JobRow
  client?: Client
  pass?: Pass
  /** the job's visits in day order, the ones with no day first */
  visits: Visit[]
  yard?: Yard
  lines: JobLine[]
  /** newest first, refunds included */
  payments: AdminPayment[]
  bill: BillState
  /** "Season Pass TH-2027-0007 · 2027" or "Repair · sold Nov 3" */
  heading: string
  /** a manager may add, change and cancel lines: an open one-off job with something still owed or nothing paid yet */
  canEditLines: boolean
  /** money can be recorded: something is owed and the job is not cancelled; on a Season Pass, once its money is due */
  canRecord: boolean
  /** a visit can be added: a one-off job that is not cancelled */
  canAddVisit: boolean
}

/** Everything the panel shows about one job; undefined when the job is not in `data`. */
export function jobFacts(data: AdminData, jobId: string, today: string): JobFacts | undefined {
  const job = data.jobs?.find((j) => j.id === jobId)
  if (!job) return undefined
  const row = jobRows(data, today).find((r) => r.id === jobId)
  if (!row) return undefined
  const client = data.clients.find((c) => c.id === job.customerId)
  const pass = job.passId ? data.passes.find((p) => p.id === job.passId) : undefined
  const visits = data.visits.filter((v) => v.jobId === job.id || job.visitIds.includes(v.id)).sort((a, b) => (dayOfVisit(a) ?? "0").localeCompare(dayOfVisit(b) ?? "0"))
  const yard = visits.find((v) => v.property)?.property ?? (client ? (propertiesOf(client, data.passes)[0] as Yard | undefined) : undefined)
  const payments = [...(job.payments ?? visits.flatMap((v) => v.payments ?? []))].reverse()
  const failed = visits.some((v) => v.chargeFailed) || Boolean(pass?.cardFailedAt)
  const cancelled = row.stage === "cancelled"
  const isPass = job.kind === "pass"
  return {
    job, row, client, pass, visits, yard,
    lines: job.lines ?? [],
    payments,
    // a job charged to the card on its pass is left to the card, unless that card failed
    bill: billState(job, visits, Boolean(pass?.cardLast4) && !failed),
    heading: jobHeading(job, row.season),
    canEditLines: !isPass && !cancelled && (row.owed > 0 || row.total === 0),
    // money can be taken on any priced one-off job that still owes (a deposit before the work is done); a pass is charged to its card, so only once its money is due
    canRecord: !cancelled && row.owed > 0 && (!isPass || ["owed", "bill-sent", "overdue", "failed"].includes(row.money)),
    canAddVisit: !isPass && !cancelled,
  }
}

/** "Check 1042, Nov 10": how a payment came and its reference. A refund says so. */
export function paymentWords(p: Pick<AdminPayment, "method" | "reference" | "amount">): string {
  const how = METHOD_WORDS[p.method] ?? p.method
  const label = how.charAt(0).toUpperCase() + how.slice(1)
  return `${p.amount < 0 ? "Refund, " : ""}${label}${p.reference ? ` ${p.reference}` : ""}`
}
