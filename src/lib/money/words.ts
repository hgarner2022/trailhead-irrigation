// The money words, read from the payment rows: pure, no database. A job is Paid when its succeeded payments equal its
// total and Owed with the number otherwise; a refund is a negative row. The screens (task 4.2) read these, never a flag.
import { jobTotal, type Line } from "@/lib/jobs/lines"

export { jobTotal }

/** The words for how a payment came, as the pill's suffix and the receipt say them. */
export const METHOD_WORDS: Record<string, string> = { card_on_file: "card", card_now: "card", check: "check", venmo: "Venmo", cash: "cash", bill: "bill" }

/** The payment-row facts the words are read from. `amount` is whole dollars, negative for a refund. */
export interface MoneyPayment {
  id: string
  visitId?: string | null
  amount: number
  method: string
  status: string
  refundsPaymentId?: string | null
}

type PricedLine = Pick<Line, "quantity" | "unitPrice" | "cancelledAt">

/** What has arrived: the succeeded rows added up, refunds counting against. */
export function paidTotal(payments: readonly Pick<MoneyPayment, "amount" | "status">[]): number {
  return payments.filter((p) => p.status === "succeeded").reduce((sum, p) => sum + p.amount, 0)
}

/**
 * Whether a visit's money is settled: its rows net above zero and, for a priced visit, at least the price. A visit nothing has
 * priced yet is paid by any positive payment (the payment is its price). The one rule every screen and the API read.
 */
export function isPaid(payments: readonly Pick<MoneyPayment, "amount" | "status">[], price?: number | null): boolean {
  const net = paidTotal(payments)
  return net > 0 && net >= (price ?? 0)
}

/** A visit as the allocator needs it: whether it is done, what it costs (its live lines) and the day it was done, for the oldest-first order. */
export interface AllocVisit {
  id: string
  done: boolean
  cancelled?: boolean
  /** whole dollars */
  price: number
  doneOn?: string | null
}

/**
 * Where a job's payments on the job as a whole (`visitId` null: a bill paid on the pay page is one) go among its visits, the one
 * rule every visit-level word reads. Each such payment's net (refunds that name it, or the newest unlinked refund, taken off) covers
 * the job's done visits, each up to its price less what its own rows already paid: first the visits the paid bills name
 * (`preferred`, in order), then the oldest done visit first. A cancelled visit or one not yet done takes nothing. Returns, per
 * visit, the slices of those payments it was credited: copies of the payment with the visit's id and the slice's amount, and an
 * id of `<paymentId>@<visitId>` so a slice is never taken for a row of its own. The slices are for words and visit-level sums
 * only; the job's money (`jobMoney`, `paidTotal` over the job's rows) counts the original rows, so nothing is counted twice.
 * `payments` are the job's rows oldest first.
 */
export function allocateJobPayments<P extends MoneyPayment>(payments: readonly P[], visits: readonly AllocVisit[], preferred: readonly string[] = []): Map<string, P[]> {
  const out = new Map<string, P[]>()
  const level = payments.filter((p) => p.status === "succeeded" && !p.visitId)
  const left = new Map(level.filter((p) => p.amount > 0 && !p.refundsPaymentId).map((p) => [p.id, p.amount]))
  for (const refund of level.filter((p) => p.amount < 0)) {
    let take = -refund.amount
    const targets = refund.refundsPaymentId && left.has(refund.refundsPaymentId) ? [refund.refundsPaymentId] : [...left.keys()].reverse()
    for (const id of targets) {
      const cut = Math.min(left.get(id) ?? 0, take)
      left.set(id, (left.get(id) ?? 0) - cut)
      take -= cut
      if (take <= 0) break
    }
  }
  const need = new Map<string, number>()
  const eligible = visits.filter((v) => v.done && !v.cancelled && v.price > 0)
  for (const v of eligible) need.set(v.id, Math.max(0, v.price - paidTotal(payments.filter((p) => p.visitId === v.id))))
  const named = preferred.map((id) => eligible.find((v) => v.id === id)).filter((v): v is AllocVisit => Boolean(v))
  const order = [...new Set([...named, ...[...eligible].sort((a, b) => (a.doneOn ?? "").localeCompare(b.doneOn ?? "") || a.id.localeCompare(b.id))])]
  for (const p of level) {
    let rest = left.get(p.id) ?? 0
    for (const v of order) {
      if (rest <= 0) break
      const give = Math.min(rest, need.get(v.id) ?? 0)
      if (give <= 0) continue
      need.set(v.id, (need.get(v.id) ?? 0) - give)
      rest -= give
      out.set(v.id, [...(out.get(v.id) ?? []), { ...p, id: `${p.id}@${v.id}`, visitId: v.id, amount: give }])
    }
  }
  return out
}

/** What is still owed on a job: its live lines less what arrived, never below zero. */
export function jobOwed(lines: readonly PricedLine[], payments: readonly Pick<MoneyPayment, "amount" | "status">[]): number {
  return Math.max(0, jobTotal(lines) - paidTotal(payments))
}

export interface JobMoney {
  paid: number
  total: number
  owed: number
  /** "Paid", "Bill sent", "$115 owed", "2 of 3 paid, $115 owed", or "" for a job with no price and no money */
  words: string
  /** the job owes money and an open bill (sent or overdue, not paid, not cancelled) was sent for it; the words read "Bill sent" */
  billSent: boolean
}

/**
 * The money summary of a job across its visits; a cancelled visit is not counted. A visit counts as paid by `isPaid`, its own
 * rows against its price (`price`, from its lines; a part-paid visit is not paid), as every screen reads it. A job that owes
 * money and has an open `invoice` reads "Bill sent": the customer has the bill, and an overdue one still reads so (Home
 * carries the overdue row).
 */
export function jobMoney(
  lines: readonly PricedLine[],
  payments: readonly MoneyPayment[],
  visits: readonly { id: string; cancelled?: boolean; price?: number | null; done?: boolean; doneOn?: string | null }[],
  invoice?: MoneyInvoice,
  paidBillVisitIds: readonly string[] = [],
): JobMoney {
  const total = jobTotal(lines)
  const paid = paidTotal(payments)
  const owed = Math.max(0, total - paid)
  if (total === 0 && paid === 0) return { paid, total, owed, words: "", billSent: false }
  if (owed === 0) return { paid, total, owed, words: "Paid", billSent: false }
  if (invoice && !invoice.paidOn && !invoice.cancelledAt) return { paid, total, owed, words: "Bill sent", billSent: true }
  const live = visits.filter((v) => !v.cancelled)
  // A visit is paid by its own rows and by its share of the payments made on the job as a whole (`allocateJobPayments`).
  const credit = allocateJobPayments(payments, live.map((v) => ({ id: v.id, done: Boolean(v.done), price: v.price ?? 0, doneOn: v.doneOn })), paidBillVisitIds)
  const paidVisits = live.filter((v) => isPaid([...payments.filter((p) => p.visitId === v.id), ...(credit.get(v.id) ?? [])], v.price)).length
  return { paid, total, owed, words: live.length > 1 && paidVisits > 0 ? `${paidVisits} of ${live.length} paid, $${owed} owed` : `$${owed} owed`, billSent: false }
}

export type VisitMoneyState = "not-yet" | "paid" | "failed" | "bill-sent" | "owed"

/** An invoice as the visit's words need it: open while it is neither paid nor cancelled. */
export interface MoneyInvoice {
  paidOn?: string | null
  cancelledAt?: Date | string | null
}

/**
 * The money pill of one visit: nothing until it is done, then Paid with how, Failed, Bill sent or Owed. Paid takes the whole
 * price (`price`; a part-paid visit is Owed) and still shows once the visit is cancelled or skipped, since the money is held;
 * a cancelled visit with nothing paid says nothing. `invoice` is the open bill the visit's lines are on, if any.
 */
export function visitMoney(
  visit: { id: string; done: boolean; cancelled?: boolean; cardFailed?: boolean; price?: number | null },
  payments: readonly MoneyPayment[],
  invoice: MoneyInvoice | undefined,
): { state: VisitMoneyState; label: string } {
  const own = payments.filter((p) => p.visitId === visit.id)
  const succeeded = own.filter((p) => p.status === "succeeded")
  if (paidTotal(own) <= 0 && (visit.cancelled || !visit.done)) return { state: "not-yet", label: "" }
  if (isPaid(own, visit.price)) {
    const how = [...succeeded].reverse().find((p) => p.amount > 0)?.method
    const word = how ? METHOD_WORDS[how] : undefined
    return { state: "paid", label: word ? `Paid, ${word}` : "Paid" }
  }
  const last = own[own.length - 1]
  if (last?.status === "failed" || (visit.cardFailed && succeeded.length === 0)) return { state: "failed", label: "Failed" }
  if (invoice && !invoice.paidOn && !invoice.cancelledAt) return { state: "bill-sent", label: "Bill sent" }
  return { state: "owed", label: "Owed" }
}
