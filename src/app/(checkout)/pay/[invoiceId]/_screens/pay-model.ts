import { monthDay } from "@/emails/format"

/** What the pay page shows of one bill: the shape `invoices.payView` returns, nothing more (no contact details, no other record's id). */
export interface PayBill {
  number: string
  firstName: string
  lines: { name: string; description: string | null; quantity: number; unitPrice: number }[]
  tax: number
  total: number
  /** Mountain calendar days, YYYY-MM-DD */
  dueOn: string
  paidOn: string | null
  status: "sent" | "paid" | "overdue" | "cancelled"
  receiptUrl: string | null
}

/** "$1,234"; a credit (the line that takes off money already paid) reads "-$45". */
export const money = (n: number) => (n < 0 ? `-$${(-n).toLocaleString("en-US")}` : `$${n.toLocaleString("en-US")}`)

/** A line's total: quantity times price. */
export const lineTotal = (l: PayBill["lines"][number]) => l.quantity * l.unitPrice

/** The line under the total: "Due Dec 1", or "Was due Dec 1" once the day has passed. */
export const dueWords = (bill: Pick<PayBill, "dueOn" | "status">) => `${bill.status === "overdue" ? "Was due" : "Due"} ${monthDay(bill.dueOn)}`

/** "Paid Nov 20, thank you". */
export const paidWords = (bill: Pick<PayBill, "paidOn">) => (bill.paidOn ? `Paid ${monthDay(bill.paidOn)}, thank you` : "Paid, thank you")

/** The button: "Pay $145 by card". */
export const payLabel = (bill: Pick<PayBill, "total">) => `Pay ${money(bill.total)} by card`
