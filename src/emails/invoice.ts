import { SEE_JOB, SIGN_OFF, dollars, longDay } from "./format"
import { doneWords, jobTable } from "./job-table"
import { button, emailLayout, greetingText, links, plainText } from "./layout"
import { visitReport } from "./visit-report"
import type { InvoiceData, RenderedEmail } from "./types"

// The invoice and its reminder: where and when, the invoice number, the job's lines with Subtotal, Sales tax (only when a line is
// taxed) and Total, then Amount due and Due, one Pay button and one text link to the customer's account. The reminder is the
// same invoice under a "A reminder about your invoice" heading.

function render(d: InvoiceData, subject: string, title: string, intro: string): RenderedEmail {
  const table = jobTable({
    facts: [...(d.address ? ([["Where", d.address]] as [string, string][]) : []), ...(d.day ? ([["Done", doneWords(d.day, d.who)]] as [string, string][]) : []), ["Invoice", d.invoiceNumber]],
    lines: d.lines, subtotal: d.amount, tax: d.tax, total: d.total,
    after: [["Amount due", dollars(d.total)], ["Due", longDay(d.dueOn)]],
  })
  const report = d.report ? visitReport(d.report) : null
  const body = table.html + (report?.html ?? "") + button(d.payUrl, `Pay ${dollars(d.total)}`) + links([{ href: d.signInUrl, label: SEE_JOB }])
  const why = `You are getting this about invoice ${d.invoiceNumber} for your ${d.visitName}.`
  const text = plainText([...greetingText(d.firstName), intro, "", ...table.text, "", ...(report ? report.text : []), `Pay here: ${d.payUrl}`, `${SEE_JOB}: ${d.accountUrl}`], SIGN_OFF, why)
  return { subject, text, html: emailLayout({ origin: d.origin, preheader: `Due ${longDay(d.dueOn)}. Pay online, or see the job in your account.`, title, greet: { firstName: d.firstName }, lead: intro, body, why, signOff: SIGN_OFF }) }
}

const where = (d: InvoiceData) => (d.address ? ` at ${d.address}` : "")

export function invoiceEmail(d: InvoiceData): RenderedEmail {
  return render(d, `Your Trailhead invoice for the ${d.visitName}${where(d)}: ${dollars(d.total)}`, "Your invoice is ready", `Here is your invoice for the ${d.visitName}${where(d)}: ${dollars(d.total)}, due ${longDay(d.dueOn)}.`)
}

export function invoiceReminderEmail(d: InvoiceData): RenderedEmail {
  return render(d, `Your Trailhead invoice, ${dollars(d.total)}, is still unpaid`, "A reminder about your invoice", `A reminder that ${dollars(d.total)} for the ${d.visitName} is still unpaid, due ${longDay(d.dueOn)}.`)
}
