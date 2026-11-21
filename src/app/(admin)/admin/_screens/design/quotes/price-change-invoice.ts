import { dayWords, invoicePageOf, money as invoiceMoney, type InvoicePageData } from "../invoice-fixtures"
import { activeLines, currentTotal } from "./price-change"
import { lineTotal, liveQuote, type QuoteJob } from "./quote-model"

// The final invoice of an approved job whose price changed after approval (Hannah, Nov 20 2026): its lines are the job's lines that are not canceled, its
// total is the job's total now, and a deposit the customer already paid is credited as its own line, so what is unpaid is the new total less the deposit.
// Built from the sent-invoice fixture so the page around it is the invoice page every invoice has. Pure.

const threeBefore = (iso: string) => new Date(new Date(`${iso}T12:00:00Z`).getTime() - 3 * 86400000).toISOString().slice(0, 10)

/** The invoice Ryan sends on `sentOn` for this job, with its terms of `dueDays` days. */
export function finalInvoiceOf(job: QuoteJob, o: { number: string; sentOn: string; dueOn: string }): InvoicePageData {
  const base = invoicePageOf("sent")
  const q = liveQuote(job)
  const total = currentTotal(job)
  const dep = q?.deposit?.paid && !q.deposit.paid.refundedOn ? q.deposit : undefined
  const owed = total - (dep?.amount ?? 0)
  const lines = activeLines(job.lines).map((l) => ({ name: l.name, description: l.description, amount: invoiceMoney(lineTotal(l)) }))
  const paidOn = dep?.paid ? dep.paid.on.slice(0, 10) : undefined
  return {
    ...base,
    id: `inv-${job.jobId}`,
    number: o.number,
    status: "sent",
    customer: { id: job.customerId, name: job.customer, contact: { first: job.first, channel: job.contact === "email" ? "email" : "text", phone: job.phone, email: job.email }, phone: { text: job.phone, href: `tel:+1${job.phone.replace(/\D/g, "")}` }, street: job.street, town: `${job.town}, CO` },
    job: { id: job.jobId, name: job.service, status: "done", statusLabel: "Done", next: "None ahead", total: invoiceMoney(total) },
    amount: invoiceMoney(owed),
    unpaid: invoiceMoney(owed),
    sent: dayWords(o.sentOn),
    due: dayWords(o.dueOn),
    lines,
    totals: [["Subtotal", invoiceMoney(total)], ["Tax", "$0"], ["Total", invoiceMoney(total), "strong"], ...(dep && paidOn ? ([[`Deposit paid ${dayWords(paidOn)}`, `-${invoiceMoney(dep.amount)}`]] as const) : []), ["Paid", "$0"], ["Unpaid", invoiceMoney(owed), "alert"]],
    payments: dep?.paid && paidOn ? [{ id: "p-dep", receipt: "R-1058", date: dayWords(paidOn), sortDay: paidOn, jobId: job.jobId, jobName: job.service, how: dep.paid.how === "card" ? "Card" : dep.paid.how, amount: invoiceMoney(dep.amount), note: "Deposit, applied" }] : [],
    messages: [],
    notes: [{ id: "n1", at: `${o.sentOn}T17:00:00Z`, actor: "Ryan", what: `Sent invoice ${o.number}, ${invoiceMoney(owed)}, due ${dayWords(o.dueOn)}`, kind: "event" }],
    schedule: { next: `${dayWords(threeBefore(o.dueOn))}, 3 days before due` },
    reminders: [],
  }
}
