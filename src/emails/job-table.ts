// The one table every money email carries (receipt, invoice, purchase confirmation), modelled on Jobber's invoice email and
// Housecall Pro's receipt: the facts above it (where, who and when, the number), each job line by its name with quantity and
// unit price when the quantity is not 1, then Subtotal, Sales tax only when a line was taxed, Total, and under it what was paid
// or what is due. Sentence case throughout; built once here so the three emails read alike. HTML and plain text come from the
// same rows.
import { dollars, whoWithDay } from "./format"
import { BODY, EMAIL_COLORS, esc, facts } from "./layout"
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

const C = EMAIL_COLORS
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
  const cell = (extra: string) => `font-family:${BODY};font-size:16px;line-height:24px;color:${C.text};${extra}`
  const lineRows = t.lines
    .map((l) => {
      const detail = quantityWords(l)
      return `<tr><td style="padding:10px 12px 10px 0;border-top:1px solid ${C.border};${cell("vertical-align:top")}">${esc(sentence(l.name))}${detail ? `<br><span style="font-size:14px;color:${C.muted}">${esc(detail)}</span>` : ""}</td><td align="right" style="padding:10px 0;border-top:1px solid ${C.border};${cell("vertical-align:top;white-space:nowrap")}">${esc(dollars(l.amount))}</td></tr>`
    })
    .join("")
  const totalRows = totals
    .map(([k, v, strong]) => `<tr><td style="padding:8px 12px 8px 0;border-top:1px solid ${strong ? C.navy : C.border};${cell(strong ? "font-weight:700" : `color:${C.muted}`)}">${esc(k)}</td><td align="right" style="padding:8px 0;border-top:1px solid ${strong ? C.navy : C.border};${cell(strong ? "font-weight:700" : "")}">${esc(v)}</td></tr>`)
    .join("")
  const html = (t.facts.length ? facts(t.facts) : "") + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">${lineRows}${totalRows}</table>` + (t.after?.length ? facts(t.after) : "")
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

