import { dollars, longDay } from "./format"
import { button, emailLayout, facts, heading, paragraph, plainText } from "./layout"
import type { InvoiceData, RenderedEmail } from "./types"

// The bill and its reminder: the frozen lines as a facts table, the tax line only when there is tax, the total, the due day and
// one button that opens the pay page. The reminder is the same bill under a "A reminder" heading.

function render(d: InvoiceData, subject: string, title: string, intro: string): RenderedEmail {
  const rows: [string, string][] = d.lines.map((l) => [l.name, dollars(l.amount)])
  if (d.tax > 0) rows.push(["Sales tax", dollars(d.tax)])
  rows.push(["Total", dollars(d.total)], ["Due", longDay(d.dueOn)], ["Bill", d.invoiceNumber])
  const body = paragraph(intro) + facts(rows) + button(d.payUrl, `Pay ${dollars(d.total)}`)
  const text = plainText([intro, "", ...d.lines.map((l) => `${l.name}: ${dollars(l.amount)}`), ...(d.tax > 0 ? [`Sales tax: ${dollars(d.tax)}`] : []), `Total: ${dollars(d.total)}`, `Due: ${longDay(d.dueOn)}`, `Bill: ${d.invoiceNumber}`, "", `Pay here: ${d.payUrl}`])
  return { subject, text, html: emailLayout({ origin: d.origin, preheader: intro, body: heading(title) + body, reason: `You are getting this about bill ${d.invoiceNumber} for your ${d.visitName}.` }) }
}

export function invoiceEmail(d: InvoiceData): RenderedEmail {
  return render(d, `Your bill from Trailhead: ${dollars(d.total)}`, "Your bill", `Hi ${d.firstName}, here is your bill for the ${d.visitName}: ${dollars(d.total)}, due ${longDay(d.dueOn)}.`)
}

export function invoiceReminderEmail(d: InvoiceData): RenderedEmail {
  return render(d, `A reminder: your bill from Trailhead, ${dollars(d.total)}`, "A reminder", `Hi ${d.firstName}, a reminder that your bill for the ${d.visitName}, ${dollars(d.total)}, is due ${longDay(d.dueOn)}.`)
}
