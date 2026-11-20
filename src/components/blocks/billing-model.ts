import { TIME_ZONE, shortDate } from "@/lib/admin/format"
import type { PillStatus } from "./StatusPill"

// What a Billing card says and shows, as pure functions (Hannah, Nov 20 2026: "this could be cleaned up"). The card says each fact once: the
// status line is the headline; the Total, Paid and Unpaid figures appear only when they add something the line does not say; Card on file
// only while there is something to collect; and a paid invoice and the payment that settled it are ONE row (`splitBilling`). No React here.

export type PaymentMethod = "card" | "check" | "venmo" | "cash"

export interface PaymentRowData {
  id: string
  /** ISO time the money was recorded */
  at: string
  method: PaymentMethod
  /** "Check #1042", "Visa ending 4242", "Venmo @andrea-d" */
  methodLabel: string
  /** "$145", or "-$145" for a refund */
  amount: string
  /** who recorded it: "Ryan", or "Andrea, online" */
  by: string
  /** the check number or the Venmo handle, as the quiet line under the method in place of `by` ("@andrea-d", "#2210") */
  reference?: string
  /** a customer's page names the job each payment was for: its chip, on a quiet line under the method */
  job?: React.ReactNode
  /** a refund row: negative, grey, status Refunded; it has no buttons but View receipt */
  refund?: boolean
  /** the payment this refund reverses: the refund sits right under it */
  refundOf?: string
  /** the invoice this payment settled: the two are one row of "Invoices and payments" */
  invoiceId?: string
  failed?: boolean
  /** our receipt page for this payment */
  receiptHref: string
  /** the payment in Stripe's dashboard, a card payment only */
  stripeHref?: string
  /** Refund is offered under More while the payment has not been refunded */
  canRefund?: boolean
}

export interface InvoiceRowData {
  id: string
  /** "INV-2026-0001" */
  number: string
  amount: string
  /** "Nov 18" */
  sent: string
  /** "Dec 2" */
  due: string
  status: PillStatus
  statusLabel?: string
  /** the invoice's own page: `/admin/invoices?invoice=<id>` */
  href?: string
  /** a quiet line under the number: "Includes the visit report", "Credits the $50 deposit", or on a customer's page the job's chip */
  note?: React.ReactNode
  /** Remind is offered while the invoice is out and unpaid */
  canRemind?: boolean
  /** the payment that settled it, filled in by `splitBilling` */
  paidBy?: PaymentRowData
  /** refunds of that payment, filled in by `splitBilling` */
  refunds?: PaymentRowData[]
}

/** A row of the Invoices and payments list: an invoice (with its payment in it) or a refund of that payment under it. */
export type InvoiceListRow = { id: string; kind: "invoice"; invoice: InvoiceRowData } | { id: string; kind: "refund"; payment: PaymentRowData }

/** Whole dollars from "$145", "-$50" or "$1,200"; 0 when there is none. */
export const dollars = (text: string | undefined): number => {
  const n = Number((text ?? "").replace(/[^0-9.-]/g, ""))
  return Number.isFinite(n) ? n : 0
}

/** Each payment followed by its refunds; a refund with no payment to sit under keeps its place. */
export function groupRefunds(payments: readonly PaymentRowData[]): PaymentRowData[] {
  const ids = new Set(payments.map((p) => p.id))
  const out: PaymentRowData[] = []
  for (const p of payments) {
    if (p.refund && p.refundOf && ids.has(p.refundOf)) continue
    out.push(p)
    if (!p.refund) out.push(...payments.filter((r) => r.refund && r.refundOf === p.id))
  }
  return out
}

/** A paid invoice takes the payment that settled it (and that payment's refunds) into its own row; what is left is the payments with no invoice, and the refunds of those. */
export function splitBilling(invoices: readonly InvoiceRowData[] = [], payments: readonly PaymentRowData[] = []): { invoices: InvoiceRowData[]; payments: PaymentRowData[] } {
  const taken = new Map<string, PaymentRowData>()
  for (const p of payments) if (!p.refund && p.invoiceId && !taken.has(p.invoiceId) && invoices.some((i) => i.id === p.invoiceId)) taken.set(p.invoiceId, p)
  const refundsOf = (id: string) => payments.filter((r) => r.refund && r.refundOf === id)
  const used = new Set<string>()
  const merged = invoices.map((i) => {
    const p = taken.get(i.id)
    if (!p) return i
    const refunds = refundsOf(p.id)
    used.add(p.id)
    refunds.forEach((r) => used.add(r.id))
    return { ...i, paidBy: p, refunds }
  })
  return { invoices: merged, payments: groupRefunds(payments.filter((p) => !used.has(p.id))) }
}

/** The list's rows: each invoice, then the refunds of its payment. */
export const invoiceListRows = (invoices: readonly InvoiceRowData[]): InvoiceListRow[] =>
  invoices.flatMap((i): InvoiceListRow[] => [{ id: i.id, kind: "invoice", invoice: i }, ...(i.refunds ?? []).map((p): InvoiceListRow => ({ id: p.id, kind: "refund", payment: p }))])

/** The quiet line under an invoice's number: how it was paid and by whom once it was, else when it went out. */
export function invoiceDetail(i: InvoiceRowData): string {
  if (i.paidBy) return `Paid by ${i.paidBy.methodLabel} on ${shortDate(i.paidBy.at, TIME_ZONE)} · ${i.paidBy.by}`
  return `Sent ${i.sent}, due ${i.due}`
}

/** The quiet line under a refund: where the money went, when, and who. */
export const refundDetail = (p: PaymentRowData): string => `Refunded to ${p.methodLabel} on ${shortDate(p.at, TIME_ZONE)} · ${p.by}`

export interface BillingFigures {
  /** Total, Paid and Unpaid (or Refunded), only when they add something the line does not say */
  figures: [string, string][] | null
  /** "Visa ending 4242", only while something is unpaid */
  card: string | null
}

/**
 * Which facts the card shows under its status line. `facts` are the card's Total, Paid, Unpaid or Refunded and Card on file pairs.
 * The three figures are hidden when nothing has been paid (the line says what is unpaid, or that it was all refunded) and when the job is
 * paid in full by one payment with no refund (the line and the row say it). They show for a part payment, a deposit and a final payment,
 * and a part refund. Card on file is a fact only while something is unpaid.
 */
export function billingFigures(facts: readonly (readonly [string, string])[], paymentCount: number): BillingFigures {
  // a Season Pass names them "Season total" and "Paid so far" and has no Unpaid fact: what is left of the season is total less paid
  const get = (...keys: string[]) => facts.find(([label]) => keys.includes(label))?.[1]
  const total = get("Total", "Season total")
  const paidText = get("Paid", "Paid so far")
  const paid = dollars(paidText)
  const refundedText = get("Refunded")
  const refunded = dollars(refundedText)
  const unpaidText = get("Unpaid") ?? (total !== undefined && refunded === 0 ? `$${Math.max(0, dollars(total) - paid)}` : "$0")
  const unpaid = dollars(unpaidText)
  const card = unpaid > 0 ? (get("Card on file", "Card") ?? null) : null
  const adds = total !== undefined && paid > 0 && !(unpaid === 0 && refunded === 0 && paymentCount <= 1)
  return { figures: adds ? [["Total", total], ["Paid", paidText ?? "$0"], refunded > 0 ? ["Refunded", refundedText ?? "$0"] : ["Unpaid", unpaidText]] : null, card }
}
