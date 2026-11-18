// The invoice, as pure rules: which lines a bill freezes, the tax on them, the status it reads as, and the next number.
// No database and no React; the handlers in `src/api/v1/invoices/` write the row and the screens read the words.

/** A line as a job holds it, with the fields a bill copies. */
export interface BillableLine {
  name: string
  description?: string | null
  quantity: number
  /** whole dollars */
  unitPrice: number
  taxable: boolean
  cancelledAt?: Date | string | null
  /** the visit the line is billed after, when it has one */
  visitId?: string | null
}

/** A line as the invoice freezes it: a copy, so a later price edit never rewrites a bill that was sent. */
export interface InvoiceLine {
  name: string
  description: string | null
  quantity: number
  unitPrice: number
  taxable: boolean
  /** the visit it was billed after: what lets a later bill leave out what an earlier one covered */
  visitId?: string | null
}

/** The live lines of a job, frozen: cancelled lines are left out and every field is copied. */
export function invoiceLines(lines: readonly BillableLine[]): InvoiceLine[] {
  return lines
    .filter((l) => !l.cancelledAt)
    .map((l) => ({ name: l.name, description: l.description ?? null, quantity: l.quantity, unitPrice: l.unitPrice, taxable: l.taxable, ...(l.visitId ? { visitId: l.visitId } : {}) }))
}

/** What the frozen lines come to before tax, whole dollars (`jobSubtotal`); the tax on them is `jobTax` from `src/lib/jobs/tax.ts`, the one rule the job's total reads too. */
export const invoiceAmount = (lines: readonly Pick<InvoiceLine, "quantity" | "unitPrice">[]): number => lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)

export type InvoiceStatus = "sent" | "paid" | "overdue" | "cancelled"

/** The invoice's facts a status is read from; days are Mountain calendar days (YYYY-MM-DD), so they compare as text. */
export interface InvoiceFacts {
  dueOn: string
  paidOn?: string | null
  cancelledAt?: Date | string | null
}

/** Cancelled, paid, overdue once the day after the due day has come, else sent. A bill is open while it is sent or overdue. */
export function invoiceStatus(invoice: InvoiceFacts, today: string): InvoiceStatus {
  if (invoice.cancelledAt) return "cancelled"
  if (invoice.paidOn) return "paid"
  return today > invoice.dueOn ? "overdue" : "sent"
}

/** Not paid and not cancelled: the bill the job's money reads as Bill sent. */
export const invoiceOpen = (invoice: Pick<InvoiceFacts, "paidOn" | "cancelledAt">): boolean => !invoice.paidOn && !invoice.cancelledAt

const NUMBER = /^INV-(\d{4})-(\d+)$/

/** "INV-2026-0001": the next number of the year, after `max` (the organization's highest number), or the first of the year when `max` is another year's or absent. */
export function nextInvoiceNumber(year: number, max: string | null | undefined): string {
  const m = max ? NUMBER.exec(max) : null
  const next = m && Number(m[1]) === year ? Number(m[2]) + 1 : 1
  return `INV-${year}-${String(next).padStart(4, "0")}`
}
