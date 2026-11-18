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

/** What is still owed on a job: its live lines less what arrived, never below zero. */
export function jobOwed(lines: readonly PricedLine[], payments: readonly Pick<MoneyPayment, "amount" | "status">[]): number {
  return Math.max(0, jobTotal(lines) - paidTotal(payments))
}

export interface JobMoney {
  paid: number
  total: number
  owed: number
  /** "Paid", "$115 owed", "2 of 3 paid, $115 owed", or "" for a job with no price and no money */
  words: string
}

/** The money summary of a job across its visits; a cancelled visit is not counted, a visit is paid while its own rows net above zero. */
export function jobMoney(lines: readonly PricedLine[], payments: readonly MoneyPayment[], visits: readonly { id: string; cancelled?: boolean }[]): JobMoney {
  const total = jobTotal(lines)
  const paid = paidTotal(payments)
  const owed = Math.max(0, total - paid)
  if (total === 0 && paid === 0) return { paid, total, owed, words: "" }
  if (owed === 0) return { paid, total, owed, words: "Paid" }
  const live = visits.filter((v) => !v.cancelled)
  const paidVisits = live.filter((v) => paidTotal(payments.filter((p) => p.visitId === v.id)) > 0).length
  return { paid, total, owed, words: live.length > 1 && paidVisits > 0 ? `${paidVisits} of ${live.length} paid, $${owed} owed` : `$${owed} owed` }
}

export type VisitMoneyState = "not-yet" | "paid" | "failed" | "bill-sent" | "owed"

/** An invoice as the visit's words need it: open while it is neither paid nor cancelled. */
export interface MoneyInvoice {
  paidOn?: string | null
  cancelledAt?: Date | string | null
}

/** The money pill of one visit: nothing until it is done, then Paid with how, Failed, Bill sent or Owed. `invoice` is absent until task 4.3. */
export function visitMoney(
  visit: { id: string; done: boolean; cancelled?: boolean; cardFailed?: boolean },
  payments: readonly MoneyPayment[],
  invoice: MoneyInvoice | undefined,
): { state: VisitMoneyState; label: string } {
  if (visit.cancelled || !visit.done) return { state: "not-yet", label: "" }
  const own = payments.filter((p) => p.visitId === visit.id)
  const succeeded = own.filter((p) => p.status === "succeeded")
  if (paidTotal(own) > 0) {
    const how = [...succeeded].reverse().find((p) => p.amount > 0)?.method
    const word = how ? METHOD_WORDS[how] : undefined
    return { state: "paid", label: word ? `Paid, ${word}` : "Paid" }
  }
  const last = own[own.length - 1]
  if (last?.status === "failed" || (visit.cardFailed && succeeded.length === 0)) return { state: "failed", label: "Failed" }
  if (invoice && !invoice.paidOn && !invoice.cancelledAt) return { state: "bill-sent", label: "Bill sent" }
  return { state: "owed", label: "Owed" }
}
