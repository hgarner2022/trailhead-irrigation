// The one table every money email carries (receipt, invoice, purchase confirmation), modelled on Jobber's invoice email and
// Housecall Pro's receipt: the facts above it (where, who and when, the number), each job line by its name with quantity and
// unit price when the quantity is not 1, then Subtotal, Sales tax only when a line was taxed, Total, and under it what was paid
// or what is due. Sentence case throughout; built once here so the three emails read alike. HTML and plain text come from the
// same rows.
import { dollars, whoWithDay } from "./format"
import { facts, moneyTable, type MoneyRow } from "./layout"
import type { EmailLine } from "./types"

export interface JobTableInput {
  /** the rows above the table: Where, Done, the receipt or invoice number */
  facts: [string, string][]
  lines: EmailLine[]
  /** left out when undefined (the purchase confirmation shows only its total) */
  subtotal?: number
  /** the sales tax; its row shows only above zero */
  tax?: number
  total: number
  totalLabel?: string
  /** rows under the total: Paid and Paid on, or Amount due and Due */
  after?: [string, string][]
}

export const sentence = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

/** "2 × $10" when a line is not a single one, else nothing. */
const quantityWords = (l: EmailLine) => (l.quantity && l.quantity !== 1 && l.unitPrice !== undefined ? `${l.quantity} × ${dollars(l.unitPrice)}` : "")

/** "Friday, November 20, with Ryan" or just the day. */
export const doneWords = (day: string | null | undefined, who: string | null | undefined) => (day ? whoWithDay(day, who) : "")

/** The method in words and sentence case: "$145, Check". */
export const paidWords = (amount: number, how: string | null | undefined) => `${dollars(amount)}${how ? `, ${sentence(how)}` : ""}`

export function jobTable(t: JobTableInput): { html: string; text: string[] } {
  const totals: [string, string, boolean][] = [
    ...(t.subtotal !== undefined ? ([["Subtotal", dollars(t.subtotal), false]] as [string, string, boolean][]) : []),
    ...((t.tax ?? 0) > 0 ? ([["Sales tax", dollars(t.tax!), false]] as [string, string, boolean][]) : []),
    [t.totalLabel ?? "Total", dollars(t.total), true],
  ]
  const rows: MoneyRow[] = [
    ...t.lines.map((l) => ({ label: sentence(l.name), value: dollars(l.amount), detail: quantityWords(l) || undefined })),
    ...totals.slice(0, -1).map(([label, value]) => ({ label, value, quiet: true })),
  ]
  const html = (t.facts.length ? facts(t.facts) : "") + moneyTable(rows, [totals.at(-1)![0], totals.at(-1)![1]]) + (t.after?.length ? facts(t.after) : "")
  const text = [
    ...t.facts.map(([k, v]) => `${k}: ${v}`),
    ...(t.facts.length ? [""] : []),
    ...t.lines.map((l) => `${sentence(l.name)}${quantityWords(l) ? ` (${quantityWords(l)})` : ""}: ${dollars(l.amount)}`),
    ...totals.map(([k, v]) => `${k}: ${v}`),
    ...(t.after?.length ? ["", ...t.after.map(([k, v]) => `${k}: ${v}`)] : []),
  ]
  return { html, text }
}

/** The lines of a message, or one line for a row queued before lines were carried: the service and what was paid. */
export function linesOf(d: { lines?: EmailLine[]; serviceName?: string; amount?: number }): EmailLine[] {
  return d.lines?.length ? d.lines : [{ name: d.serviceName ?? "Visit", amount: d.amount ?? 0 }]
}

