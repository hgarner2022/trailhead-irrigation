import { monthDay } from "@/emails/format"

/** What the pay page shows of one invoice: the shape `invoices.payView` returns, nothing more (no contact details, no other record's id). */
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
  /** what the invoice is for, as a phrase after "your" ("repair", "spring turn-on"), and the street address; absent when the invoice covers no visit */
  serviceName?: string | null
  address?: string | null
  /** the card on file, "Visa ending 4242", for a customer who has one: the page then offers to pay with it in one tap */
  savedCard?: string | null
  /** the visit report, present when the invoice's `include_report` is on (the checklist and photos already belong to the visit) */
  report?: import("@/emails/visit-report").VisitReportData
}

/** "$1,234"; a credit (the line that takes off money already paid) reads "-$45". */
export const money = (n: number) => (n < 0 ? `-$${(-n).toLocaleString("en-US")}` : `$${n.toLocaleString("en-US")}`)

/** A line's total: quantity times price. */
export const lineTotal = (l: PayBill["lines"][number]) => l.quantity * l.unitPrice

/** The line under the total: "Due Dec 1", or "Past due since Dec 1" once the day has passed. */
export const dueWords = (bill: Pick<PayBill, "dueOn" | "status">) => `${bill.status === "overdue" ? "Past due since" : "Due"} ${monthDay(bill.dueOn)}`

/** "Paid Nov 20, thank you". */
export const paidWords = (bill: Pick<PayBill, "paidOn">) => (bill.paidOn ? `Paid ${monthDay(bill.paidOn)}, thank you` : "Paid, thank you")

/** The button: "Pay $145 by card". */
export const payLabel = (bill: Pick<PayBill, "total">) => `Pay ${money(bill.total)} by card`

/** The line under "Your invoice": "Hi Andrea, here is invoice INV-2026-0001 for your repair at 480 Briggs St." (the service and the address when the invoice has them). */
export const introWords = (bill: Pick<PayBill, "firstName" | "number" | "serviceName" | "address">) =>
  `Hi ${bill.firstName}, here is invoice ${bill.number}${bill.serviceName ? ` for your ${bill.serviceName}` : ""}${bill.address ? ` at ${bill.address}` : ""}.`

/** The one-tap button for a customer with a card on file: "Pay $115 with Visa ending 4242". */
export const payWithLabel = (bill: Pick<PayBill, "total">, card: string) => `Pay ${money(bill.total)} with ${card}`
