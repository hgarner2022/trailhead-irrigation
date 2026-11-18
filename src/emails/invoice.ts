import { SIGN_OFF, dollars, longDay } from "./format"
import { button, emailLayout, facts, heading, paragraph, plainText } from "./layout"
import type { InvoiceData, RenderedEmail } from "./types"

// The invoice and its reminder: the frozen lines as a facts table, the sales tax line only when there is tax, the total, the due
// day, the invoice number as one quiet row, and one button that opens the pay page. The reminder is the same invoice under a
// "A reminder" heading.

function render(d: InvoiceData, subject: string, title: string, intro: string): RenderedEmail {
  const rows: [string, string][] = d.lines.map((l) => [l.name, dollars(l.amount)])
  if (d.tax > 0) rows.push(["Tax", dollars(d.tax)])
  rows.push(["Total", dollars(d.total)], ["Due", longDay(d.dueOn)], ["Invoice", d.invoiceNumber])
  const body = paragraph(intro) + facts(rows) + button(d.payUrl, `Pay ${dollars(d.total)}`)
  const text = plainText([intro, "", ...rows.map(([k, v]) => `${k}: ${v}`), "", `Pay here: ${d.payUrl}`], SIGN_OFF)
  return { subject, text, html: emailLayout({ origin: d.origin, preheader: intro, body: heading(title) + body, reason: `You are getting this about invoice ${d.invoiceNumber} for your ${d.visitName}.`, signOff: SIGN_OFF }) }
}

const where = (d: InvoiceData) => (d.address ? ` at ${d.address}` : "")

export function invoiceEmail(d: InvoiceData): RenderedEmail {
  return render(d, `Your Trailhead invoice for the ${d.visitName}${where(d)}: ${dollars(d.total)}`, "Your invoice is ready", `Hi ${d.firstName}, here is your invoice for the ${d.visitName}${where(d)}: ${dollars(d.total)}, due ${longDay(d.dueOn)}.`)
}

export function invoiceReminderEmail(d: InvoiceData): RenderedEmail {
  return render(d, `Your Trailhead invoice, ${dollars(d.total)}, is still unpaid`, "A reminder about your invoice", `Hi ${d.firstName}, a reminder that ${dollars(d.total)} for the ${d.visitName} is still unpaid, due ${longDay(d.dueOn)}.`)
}
