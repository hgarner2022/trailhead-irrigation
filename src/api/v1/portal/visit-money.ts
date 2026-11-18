import "server-only"
import { allocateJobPayments, isPaid, paidTotal, type MoneyPayment } from "@/lib/money/words"
import { moneyWord, type MoneyTone } from "@/lib/portal/words"

/** What a customer reads on a visit's row about its money, from the payment rows and the open invoice (the words are `moneyWord`'s). */
export interface VisitMoneyWords {
  tone: MoneyTone
  label: string
  /** the payments that paid this visit: its own rows and its share of a payment made on the job as a whole (a paid invoice); each an id the receipt page opens */
  paymentIds: string[]
}

interface InvoiceFacts {
  dueOn: string
  status: "sent" | "overdue"
  /** the visits its frozen lines are on */
  visitIds: string[]
}

/**
 * The money of every visit of one job, in the customer's words: "Paid" once its rows (and its share of a job-level payment, by the one
 * allocation rule `allocateJobPayments`) cover its price; on a done visit "$115 unpaid", "Invoice sent, due Dec 1" or "Past due since Dec 1";
 * nothing for a visit not done and unpaid. A payment that failed is not carried to the customer, so it is not read here.
 */
export function portalVisitMoney(
  visits: readonly { id: string; status: string; completedOn: string | null; price: number }[],
  payments: readonly MoneyPayment[],
  invoice: InvoiceFacts | undefined,
  paidInvoiceVisitIds: readonly string[],
): Map<string, VisitMoneyWords> {
  const live = visits.filter((v) => v.status !== "cancelled" && v.status !== "skipped")
  const credit = allocateJobPayments(payments, live.map((v) => ({ id: v.id, done: v.status === "completed", price: v.price, doneOn: v.completedOn })), paidInvoiceVisitIds)
  const out = new Map<string, VisitMoneyWords>()
  for (const v of visits) {
    const own = [...payments.filter((p) => p.visitId === v.id && p.status === "succeeded"), ...(credit.get(v.id) ?? [])]
    const paymentIds = [...new Set(own.filter((p) => p.amount > 0).map((p) => p.id.split("@")[0]!))]
    const paid = paidTotal(own)
    if (paid > 0 && isPaid(own, v.price)) {
      out.set(v.id, { tone: "paid", label: "Paid", paymentIds })
    } else if (v.status === "completed" && v.price > 0) {
      const owed = Math.max(0, v.price - paid)
      const covers = invoice?.visitIds.includes(v.id)
      out.set(v.id, { ...moneyWord({ owed, words: `$${owed} unpaid`, invoice: covers && invoice ? { dueOn: invoice.dueOn, status: invoice.status } : null }), paymentIds })
    } else {
      out.set(v.id, { tone: "none", label: "", paymentIds })
    }
  }
  return out
}
