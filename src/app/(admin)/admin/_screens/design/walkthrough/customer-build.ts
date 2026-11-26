import type { Message } from "@/lib/admin/types"
import type { TimelineLine } from "@/lib/events/timeline"
import type { RecordFact } from "@/components/blocks/RecordPanel"
import { INVOICE_PILL, type InvoiceListRow } from "../invoice-fixtures"
import { GRID_TONE, GRID_WORDS, type GridJob } from "../JobsGridDesign"
import type { CustomerBillingData, CustomerInvoiceRow, CustomerJobRow, CustomerPageData, CustomerPaymentRow, CustomerQuoteRow, MoneyWord } from "../customer-types"
import { withStatus } from "../customer-status-fixtures"
import { liveOf } from "./jobs-data"
import { WEEK_TODAY } from "./week-visits"
import { money as quoteMoney, quoteTotal, QUOTE_PILL, type ApprovedJob, type QuoteRecord } from "../quotes/quote-model"
import { worldCustomer, type WorldCustomer } from "./world-customers"
import { shortDate, money } from "@/lib/admin/format"

// The customer page of every person in the walkthrough's world who has no hand-shaped one (docs/plans/2026-11-20-handoff.md, gap 2), worked out from
// their jobs (the Jobs grid's rows), their invoices, their quotes and the small fixture that says who they are (`world-customers.ts`). Nothing here is
// typed per customer: the jobs, the money words, the Billing card, the payments, the messages, the history and the status all come from those rows;
// the status is `customerStatusOf` through `withStatus`. A section with nothing to show shows its own empty state because its list is empty.
// Pure: the caller hands in the rows, the invoices and the quote jobs.

const DAY_LONG = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
const dayLong = (iso: string) => DAY_LONG.format(new Date(`${iso}T12:00:00Z`))
const MONTH_YEAR = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" })
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const plus = (digits: string) => `tel:+1${digits.replace(/\D/g, "")}`
const NO_YARD: RecordFact[] = [["Zones", "Not set"], ["Controller", "Not set"], ["Gate code", "None"], ["Must be home", "Not set"]]
const OPEN: GridJob["stage"][] = ["unscheduled", "scheduled", "today", "late", "active"]

/** The day a row's Next words name ("Mon, Nov 16", "Today"), as an ISO day; none when it has no day. */
function nextDay(next: string): string | null {
  if (next === "Today") return WEEK_TODAY
  const m = next.match(/([A-Z][a-z]{2}) (\d{1,2})$/)
  const at = m ? MONTHS.indexOf(m[1]!) : -1
  if (!m || at < 0) return null
  return `${at >= 6 ? 2026 : 2027}-${String(at + 1).padStart(2, "0")}-${m[2]!.padStart(2, "0")}`
}

function moneyOf(row: GridJob, invoice: InvoiceListRow | undefined): MoneyWord | null {
  if (!row.billingState) return null
  if (row.billingState === "paid") return { word: row.billing }
  if (row.billingState === "overdue") return { word: row.billing, tone: "past-due", note: `${money(invoice?.amount ?? row.total)} unpaid` }
  if (row.billingState === "bill-sent") return { word: "Invoice sent", note: row.billing.replace(/^Invoice sent, /, "") }
  return { word: row.billing }
}

function jobRowOf(row: GridJob, invoices: readonly InvoiceListRow[], jobs: readonly ApprovedJob[]): CustomerJobRow {
  const invoice = invoices.find((i) => i.jobId === row.id)
  const made = jobs.find((j) => j.jobId === row.id)
  const when = row.stage === "done" ? (invoice?.sentOn ?? null) : nextDay(row.next)
  const decided = made?.soldOn.slice(0, 10)
  const last = made?.history.length ? made.history[made.history.length - 1]!.at.slice(0, 10) : undefined
  const open = OPEN.includes(row.stage)
  return {
    id: row.id,
    name: row.title,
    open,
    sortDay: when ?? decided ?? invoice?.sentOn ?? last ?? "2026-11-13",
    ...(when && row.stage !== "cancelled" ? { day: { iso: when, label: dayLong(when), time: liveTime(row.id), stops: 1 } } : {}),
    ...(row.who && !/^No one/.test(row.who) ? { who: row.who } : {}),
    status: GRID_TONE[row.stage],
    statusLabel: GRID_WORDS[row.stage],
    money: moneyOf(row, invoice),
  }
}

const receiptOf = (number: string) => `R-${1000 + Number(number.slice(-4))}`

function invoiceRowOf(i: InvoiceListRow): CustomerInvoiceRow {
  return { id: i.id, number: i.number, jobId: i.jobId, jobName: i.jobName, amount: money(i.amount), sent: shortDate(i.sentOn), due: shortDate(i.dueOn), status: INVOICE_PILL[i.status].pill, statusLabel: INVOICE_PILL[i.status].label, sortDay: i.sentOn }
}

const howOf = (rows: readonly GridJob[], jobId: string) => {
  const word = rows.find((r) => r.id === jobId)?.billing.match(/^Paid, (\w+)/)?.[1]
  return word ? word[0]!.toUpperCase() + word.slice(1) : "Card"
}

/** The payments: each paid invoice's, a paid job that has no invoice, and a deposit paid at a quote's approval. */
function paymentsOf(mine: readonly GridJob[], invoices: readonly InvoiceListRow[], made: readonly ApprovedJob[]): CustomerPaymentRow[] {
  const fromInvoices = invoices
    .filter((i) => i.status === "paid" && i.paidOn)
    .map((i): CustomerPaymentRow => {
      const how = howOf(mine, i.jobId)
      return { id: `p-${i.id}`, receipt: receiptOf(i.number), date: shortDate(i.paidOn!), sortDay: i.paidOn!, jobId: i.jobId, jobName: i.jobName, how, amount: money(i.amount), invoiceId: i.id, ...(how === "Card" ? { stripeUrl: "https://dashboard.stripe.com/payments/pi_demo" } : {}) }
    })
  const bare = mine
    .filter((r) => r.billingState === "paid" && !invoices.some((i) => i.jobId === r.id))
    .map((r): CustomerPaymentRow => ({ id: `p-${r.id}`, receipt: `R-${1000 + r.id.length}`, date: "Nov 13", sortDay: "2026-11-13", jobId: r.id, jobName: r.title, how: howOf(mine, r.id), amount: money(r.total) }))
  const deposits = made.flatMap((j): CustomerPaymentRow[] => {
    const d = j.deposit
    if (!d?.paid) return []
    const on = d.paid.on.slice(0, 10)
    return [{ id: `dep-${j.quoteId}`, receipt: receiptOf(j.quoteId), date: shortDate(on), sortDay: on, jobId: j.jobId, jobName: j.service, how: d.paid.how === "card" ? "Card" : d.paid.how, amount: money(d.amount), note: "Deposit", ...(d.paid.how === "card" ? { stripeUrl: "https://dashboard.stripe.com/payments/pi_demo" } : {}) }]
  })
  return [...fromInvoices, ...bare, ...deposits]
}

function billingOf(invoices: readonly InvoiceListRow[], payments: readonly CustomerPaymentRow[], card: WorldCustomer["card"]): CustomerBillingData {
  const live = invoices.filter((i) => i.status !== "canceled")
  const unpaid = live.reduce((n, i) => n + i.balance, 0)
  const num = (p: CustomerPaymentRow) => Number(p.amount.replace(/\D/g, ""))
  const paid = payments.reduce((n, p) => n + num(p), 0)
  const bareTotal = payments.filter((p) => !p.invoiceId).reduce((n, p) => n + num(p), 0)
  const total = live.reduce((n, i) => n + i.amount, 0) + bareTotal
  const pastDue = live.filter((i) => i.status === "past-due").sort((a, b) => a.dueOn.localeCompare(b.dueOn))[0]
  const settled = unpaid === 0 && paid > 0
  const onlyDeposit = payments.length > 0 && payments.every((p) => p.note === "Deposit")
  const line = pastDue ? `Past due since ${shortDate(pastDue.dueOn)}` : unpaid > 0 ? `${money(unpaid)} unpaid` : onlyDeposit ? `${money(paid)} deposit paid` : settled ? "Paid in full" : "Nothing billed yet"
  return {
    line,
    ...(settled ? { settled: "paid" as const } : {}),
    tone: pastDue ? "past-due" : "plain",
    total: money(total),
    paid: money(paid),
    unpaid: money(unpaid),
    ...(card ? { card: { ...card, stripeUrl: "https://dashboard.stripe.com/customers/cus_demo" } } : {}),
    payments: [...payments],
    invoices: invoices.map(invoiceRowOf),
  }
}

const msg = (id: string, at: string, w: WorldCustomer, kind: Message["kind"], email: string, text: string): Message => ({ id, clientId: "c-1", channel: w.channel === "email" ? "email" : "sms", kind, body: w.channel === "email" ? email : text, at, status: "sent" })

function messagesOf(w: WorldCustomer, invoices: readonly InvoiceListRow[]): Message[] {
  return invoices.flatMap((i): Message[] => {
    const out = [msg(`m-${i.id}`, `${i.sentOn}T17:00:00Z`, w, "invoice", `Invoice ${i.number}: ${money(i.amount)} for your ${i.jobName.toLowerCase()} at ${i.street}`, `Trailhead: invoice ${i.number} for your ${i.jobName.toLowerCase()}, ${money(i.amount)}, due ${shortDate(i.dueOn)}.`)]
    if (i.status === "paid" && i.paidOn) out.unshift(msg(`m-${i.id}-r`, `${i.paidOn}T17:00:00Z`, w, "receipt", `Receipt: ${money(i.amount)} for your ${i.jobName.toLowerCase()} at ${i.street}`, `Trailhead: receipt for ${money(i.amount)}, your ${i.jobName.toLowerCase()} at ${i.street}.`))
    return out
  })
}

function notesOf(invoices: readonly InvoiceListRow[], payments: readonly CustomerPaymentRow[], quotes: readonly QuoteRecord[], made: readonly ApprovedJob[]): TimelineLine[] {
  const ev = (id: string, at: string, actor: string, what: string, note?: string): TimelineLine => ({ id, at, actor, what, kind: "event", ...(note ? { note } : {}) })
  const sent = invoices.map((i) => ev(`n-${i.id}`, `${i.sentOn}T17:00:00Z`, "Ryan", `Sent invoice ${i.number}, ${money(i.amount)}, due ${shortDate(i.dueOn)}`))
  const paid = payments.filter((p) => p.invoiceId).map((p) => ev(`n-${p.id}`, `${p.sortDay}T17:00:00Z`, "Ryan", `Recorded a ${p.amount} ${p.how.toLowerCase()} payment`))
  const fromQuotes = quotes.flatMap((q) => q.history.map((h, k) => ev(`n-${q.id}-${k}`, h.at, h.actor, h.what, h.note)))
  const fromJobs = made.flatMap((j) => j.history.map((h, k) => ev(`n-${j.jobId}-${k}`, h.at, h.actor, h.what, h.note)))
  return [...sent, ...paid, ...fromQuotes, ...fromJobs].sort((a, b) => b.at.localeCompare(a.at))
}

/** The identity of someone with no fixture: a person made in the prototype, or one a request became. Read from the job's quote when it has one. */
export function identityOf(id: string, rows: readonly GridJob[], quotes: readonly QuoteRecord[]): WorldCustomer | null {
  const known = worldCustomer(id)
  if (known) return known
  const row = rows[0]
  const q = quotes.find((x) => x.customerId === id)
  if (!row && !q) return null
  const name = row?.name ?? q!.customer
  const [street = "", town = ""] = row ? row.property.split(", ") : []
  return { name, phone: q?.phone ?? "(970) 555-0123", email: q?.email ?? `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`, channel: q?.contact === "email" ? "email" : "text", street: q?.street ?? street, town: q?.town ?? town, since: "2026-11-18" }
}

export interface WorldInput {
  /** this customer's rows of the Jobs grid */
  rows: readonly GridJob[]
  /** every invoice of the world; this customer's are picked out */
  invoices: readonly InvoiceListRow[]
  /** every quote of the world; this customer's are picked out */
  quotes: readonly QuoteRecord[]
  /** every job made from an approved quote; this customer's are picked out by their rows */
  jobs: readonly ApprovedJob[]
}

/** The rows of a customer's Quotes card, newest first. */
export const quoteRowsFor = (quotes: readonly QuoteRecord[]): CustomerQuoteRow[] =>
  quotes
    .map((q): CustomerQuoteRow => ({ id: q.id, service: q.service, amount: quoteMoney(quoteTotal(q)), status: QUOTE_PILL[q.state].status, statusLabel: QUOTE_PILL[q.state].label, sortDay: q.decidedOn ?? q.sentOn ?? q.createdOn }))
    .sort((a, b) => b.sortDay.localeCompare(a.sortDay))

/** The page of one customer, or null when nothing in the world is theirs. */
export function buildWorldCustomer(id: string, input: WorldInput): CustomerPageData | null {
  const mine = input.rows
  const w = identityOf(id, mine, input.quotes)
  if (!w) return null
  const invoices = input.invoices.filter((i) => i.customerId === id)
  const quotes = input.quotes.filter((q) => q.customerId === id)
  const made = input.jobs.filter((j) => mine.some((r) => r.id === j.jobId))
  const jobs = mine.map((r) => jobRowOf(r, invoices, made))
  const payments = paymentsOf(mine, invoices, made)
  const billing = billingOf(invoices, payments, w.card)
  const out = invoices.filter((i) => i.balance > 0).sort((a, b) => (a.status === "past-due" ? 0 : 1) - (b.status === "past-due" ? 0 : 1) || a.dueOn.localeCompare(b.dueOn))[0]
  const unpaid = invoices.reduce((n, i) => n + i.balance, 0)
  const next = jobs.filter((j) => j.open).sort((a, b) => a.sortDay.localeCompare(b.sortDay))[0]
  const first = w.name.split(" ")[0]!
  const [zones, controller, gate] = w.yard ?? []
  const marketing = w.marketingEmail ? `Opted in ${shortDate(w.since)} by the customer on the website` : undefined
  const source = w.source ?? "Website"
  return withStatus({
    id,
    name: w.name,
    firstName: first,
    contact: { channel: w.channel, phone: { text: w.phone, href: plus(w.phone) }, email: w.email },
    address: [w.street, `${w.town}, CO`],
    subtitle: `Customer since ${MONTH_YEAR.format(new Date(`${w.since}T12:00:00Z`))} · ${w.street}, ${w.town}`,
    pills: [],
    ...(w.doNotService ? { doNotService: w.doNotService } : {}),
    statusFacts: { jobs: [], visitAhead: false, passInForce: false },
    band: {
      next: next ? { value: next.day ? (next.day.iso === WEEK_TODAY ? "Today" : shortDate(next.day.iso)) : "Unscheduled", sub: next.day ? `${next.day.time}${next.who ? `, ${next.who}` : ""}` : "Needs a day", jobId: next.id } : { value: "None", sub: "Nothing scheduled" },
      unpaid: unpaid > 0 && out ? { value: money(unpaid), sub: out.status === "past-due" ? `Past due since ${shortDate(out.dueOn)}` : `Invoice sent, due ${shortDate(out.dueOn)}`, ...(out.status === "past-due" ? { alert: true } : {}), invoiceId: out.id } : { value: "$0", sub: "Nothing unpaid" },
      pass: { value: "None", sub: "No Season Pass" },
      card: w.card ? { value: `${w.card.brand} ${w.card.last4}`, sub: `Expires ${w.card.expires}` } : { value: "No card", sub: "Add one when you collect" },
    },
    ...(unpaid > 0 && out ? { unpaid: money(unpaid), openInvoice: { id: out.id, number: out.number, amount: money(out.balance), jobName: out.jobName, due: shortDate(out.dueOn) } } : {}),
    jobs,
    quotes: quoteRowsFor(quotes),
    billing,
    messages: messagesOf(w, invoices).sort((a, b) => b.at.localeCompare(a.at)),
    photos: [],
    notes: notesOf(invoices, payments, quotes, made),
    property: zones ? [["Zones", zones], ["Controller", controller!], ["Gate code", gate!], ["Must be home", "No"]] : NO_YARD,
    consent: {
      agreed: `Agreed ${dayLong(w.since)} ${source === "Website" ? "on the website" : "by phone, with the office"}, terms v3`,
      email: marketing ? { on: true, note: marketing } : { on: false },
      text: { on: false },
      contactBy: w.channel,
      history: [...(marketing ? [{ id: "k1", on: dayLong(w.since), what: "Opted in to marketing email", source: "Website", who: "The customer" }] : []), { id: "k0", on: dayLong(w.since), what: "Agreed to texts and email about visits and billing", source, who: source === "Website" ? "The customer" : "Ryan" }],
    },
    area: { kind: "sell", label: "Get a Season Pass", line: "Reserve the spring turn-on and the fall blowout at today's per-zone prices, with the days picked now.", earlier: [] },
  })
}

/** "Any time" or "9:00 am": the time the calendar holds for the visit, else Any time. */
function liveTime(id: string): string {
  const v = liveOf(id)
  if (!v || v.start === null) return "Any time"
  return `${Math.floor(v.start / 60) % 12 || 12}:${String(v.start % 60).padStart(2, "0")} ${v.start < 720 ? "am" : "pm"}`
}
