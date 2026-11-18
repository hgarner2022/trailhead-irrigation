/**
 * The pure derivations behind the job panel: one job's row, its customer, pass, visits in day order, the yard it is at, its
 * lines, its payments newest first, its open invoice, and what the manager may do (change lines, take a payment, send an invoice, add
 * a visit). Everything is read from `AdminData`; the same words as the grid (`jobs-model.ts`).
 */
import type { AdminData, AdminPayment, Client, JobLine, Pass, SoldJob, Visit, Yard } from "@/lib/admin/types"
import { jobTax } from "@/lib/jobs/tax"
import { METHOD_WORDS } from "@/lib/money/words"
import { collectPlan, type CollectPlan } from "@/lib/money/collect"
import { billState, type BillState } from "./bill-model"
import { jobHeading, jobRows, type JobRow } from "./jobs-model"
import { propertiesOf } from "./customers-model"
import { dayOfVisit, ruleOfData } from "./visit-panel-model"

export interface JobFacts {
  job: SoldJob
  row: JobRow
  client?: Client
  pass?: Pass
  /** the job's visits in day order, the ones with no day first */
  visits: Visit[]
  yard?: Yard
  lines: JobLine[]
  /** the sales tax on the live lines, whole dollars (0 while nothing is collected): the panel shows a Tax line only above zero; `row.total` already includes it */
  tax: number
  /** newest first, refunds included */
  payments: AdminPayment[]
  bill: BillState
  /** "Season Pass TH-2027-0007 · 2027" or "Repair · sold Nov 3" */
  heading: string
  /** a manager may add, change and cancel lines: an open one-off job with something still unpaid or nothing paid yet */
  canEditLines: boolean
  /** money can be recorded: something is unpaid and the job is not canceled; on a Season Pass, once its money is due */
  canRecord: boolean
  /** a visit can be added: a one-off job that is not canceled */
  canAddVisit: boolean
  /** a one-off job still being worked (needs a quote, quote sent, open) can be canceled; a Season Pass has Cancel pass, and a Done job is Done */
  canCancel: boolean
  /** whole dollars the job holds: its succeeded payments with refunds taken off. Above zero the cancel says to refund first. */
  held: number
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
    tax: jobTax(job.lines ?? [], ruleOfData(data)),
    payments,
    // a job charged to the card on its pass is left to the card, unless that card failed
    bill: billState(job, visits, Boolean(pass?.cardLast4) && !failed),
    heading: jobHeading(job, row.season),
    canEditLines: !isPass && !cancelled && (row.owed > 0 || row.total === 0),
    // money can be taken on any priced one-off job that still owes (a deposit before the work is done); a pass is charged to its card, so only once its money is due
    canRecord: !cancelled && row.owed > 0 && (!isPass || ["owed", "bill-sent", "overdue", "failed"].includes(row.money)),
    canAddVisit: !isPass && !cancelled,
    canCancel: !isPass && ["needs-a-quote", "quoted", "open"].includes(row.stage),
    held: payments.filter((p) => p.status === "succeeded").reduce((sum, p) => sum + p.amount, 0),
  }
}

/** "Check 1042, Nov 10": how a payment came and its reference. A refund says so. */
export function paymentWords(p: Pick<AdminPayment, "method" | "reference" | "amount">): string {
  const how = METHOD_WORDS[p.method] ?? p.method
  const label = how.charAt(0).toUpperCase() + how.slice(1)
  return `${p.amount < 0 ? "Refund, " : ""}${label}${p.reference ? ` ${p.reference}` : ""}`
}

/**
 * What How is this paid? offers for a job (the same choices as a visit's, `collectPlan`). A card on file is offered only when exactly one done
 * visit is unpaid: that visit is the one charged (`visitId`); with several, each is charged from its own panel and neither the card nor Pay
 * later is offered here.
 */
export function jobCollect(facts: JobFacts, data: Pick<AdminData, "clients" | "settings">): { plan: CollectPlan; visitId?: string } {
  const { row, pass, bill, visits } = facts
  const client = data.clients.find((c) => c.id === row.customerId)
  const card = client?.card ?? (pass?.cardLast4 ? { last4: pass.cardLast4 } : undefined)
  const unpaid = visits.filter((v) => v.status === "completed" && !(v.payments ?? []).some((p) => p.status === "succeeded" && p.amount > 0 && !p.refundsPaymentId && p.amount >= (v.price ?? 0)))
  const single = unpaid.length === 1 ? unpaid[0] : undefined
  const plan = collectPlan({
    amount: row.owed,
    ...(card ? { card: { brand: "brand" in card ? card.brand : undefined, last4: card.last4 } } : {}),
    cardChargeable: Boolean(single),
    isPass: Boolean(pass),
    invoiceOpen: Boolean(bill.invoice),
    canInvoice: bill.canSend,
    invoiceAhead: !bill.canSend && !bill.invoice && visits.some((v) => v.status === "scheduled" || v.status === "unscheduled"),
    declined: row.money === "failed",
    charging: facts.payments.some((p) => p.status === "pending"),
    dueDays: data.settings.billing?.dueDays,
  })
  return { plan, visitId: single?.id }
}
