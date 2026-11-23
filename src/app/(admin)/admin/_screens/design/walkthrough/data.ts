import type { SearchHit } from "@/lib/admin/search-hit"
import { CUSTOMER_STATUS_WORDS } from "@/lib/customers/status"
import { type CustomerPageData, customerPageOf, withStatus } from "../customer-fixtures"
import { INVOICE_ROWS, dayWords, invoicePageOf, money, type InvoiceFixture, type InvoiceListRow, type InvoicePageData } from "../invoice-fixtures"
import { allRows, GRID_ROWS, contactOf, customerIdOf, customerOfJob, isActiveAgain, isRealCustomer, rowOf } from "./jobs-data"
import type { Route } from "./routes"
import { readChoice } from "@/app/_flows/walkthrough/marketing-choice"
import { fullName, serviceWords, stateOf } from "../requests/request-model"
import { requestStore } from "../requests/request-store"
import { quoteRowsOf } from "../quotes/quote-list-model"
import { QUOTES_NOW, QUOTE_PILL, money as quoteMoney } from "../quotes/quote-model"
import { recordHref } from "@/components/blocks/record-preview-model"
import { walkQuotes } from "../quotes/quote-store"
import { buildWorldCustomer, quoteRowsFor } from "./customer-build"
import { worldCustomerIds } from "./world-customers"

export * from "./jobs-data"

// One consistent world for the walkthrough (docs/plans/2026-11-19-prototype-walkthrough-spec.md, section 2), built from the design fixtures and
// re-keyed so every chip resolves. Andrea Dalton (480 Briggs St, Erie) has the repair the job flow walks, a 2026 Season Pass and a 2027 one
// (renewed from it), and invoices INV-2026-0042 (sent) and INV-2026-0031 (paid). Marcus Bell has the past-due invoice INV-2026-0035. Dale Whitaker
// has the renewed pass. Where two fixtures disagree about one record, this file is the truth and the fixture is shaped to it here, never edited.
// A fixture's own ids (j1, p2027, i1, c-1 ...) are aliased to this world's ids by the person whose page the link is on (`resolveRoute`).

const RYAN = "Ryan Garner"

// -------------------------------------------------------------------------------------------------------------- customers

const swapContact = (d: CustomerPageData, over: Partial<CustomerPageData>): CustomerPageData => ({ ...d, ...over })

/** The jobs made in the prototype for this customer, as rows of their Jobs table: open, with no day yet. */
const madeHere = (id: string): CustomerPageData["jobs"] =>
  allRows()
    .filter((r) => r.id.startsWith("new-") && customerIdOf(r.name) === id)
    .map((r) => ({ id: r.id, name: r.title, open: true, sortDay: "2026-11-19", status: r.stage === "scheduled" ? ("scheduled" as const) : ("needs-a-day" as const), statusLabel: r.stage === "scheduled" ? "Scheduled" : "Unscheduled", money: null }))

/** Andrea's Consent card follows what she chose in the customer walkthrough (the booking's box, Details' switches), when she chose anything. */
function withChoice(page: CustomerPageData): CustomerPageData {
  if (page.id !== "andrea") return page
  const c = typeof window === "undefined" ? {} : readChoice()
  const line = (on: boolean | undefined, was: { on: boolean; note?: string }) => (on === undefined ? was : { on, note: `${on ? "Opted in" : "Opted out"} today by the customer on the website` })
  return { ...page, consent: { ...page.consent, email: line(c.email, page.consent.email), text: line(c.text, page.consent.text) } }
}

/** The page of any customer in the world: the seven shaped by hand below, and everyone else built from their jobs, invoices and quotes (`customer-build.ts`). A quote is not a job: it is in the customer's Quotes card and does not change their status. */
export function customerPage(id: string): CustomerPageData | null {
  const page = customerPageBase(id)
  const world = walkQuotes.getSnapshot()
  // the status is read from the jobs by `customerStatusOf`, never typed here
  if (!page) {
    const rows = allRows().filter((r) => customerIdOf(r.name) === id)
    return isRealCustomer(id) ? null : buildWorldCustomer(id, { rows, invoices: INVOICES, quotes: Object.values(world.quotes), jobs: Object.values(world.jobs) })
  }
  // an archived customer for whom a job was made here is back: no archive date, so the function reads Active from the new open job
  const statusFacts = isActiveAgain(id) ? { ...page.statusFacts, archivedAt: null } : page.statusFacts
  return withChoice(withStatus({ ...page, statusFacts, jobs: [...madeHere(id), ...page.jobs], quotes: quoteRowsFor(Object.values(world.quotes).filter((q) => q.customerId === id)) }))
}

function customerPageBase(id: string): CustomerPageData | null {
  if (id === "andrea") {
    const d = customerPageOf("pass-holder")
    return swapContact(d, {
      id: "andrea",
      band: { ...d.band, next: { value: "Mon, May 3", sub: "Any time, Ryan", jobId: "p2027" } },
      jobs: d.jobs
        .filter((j) => j.id !== "j2" && j.id !== "j0" && j.id !== "j3")
        .map((j) => (j.id === "j1" ? { ...j, status: "needs-a-day" as const, statusLabel: "Unscheduled", day: undefined, who: undefined, sortDay: "2026-11-18" } : j))
        .concat([{ id: "j2", name: "Season Pass 2026", open: false, sortDay: "2026-10-12", day: { iso: "2026-10-12", label: "Oct 12, 2026", time: "Any time", stops: 4 }, who: RYAN, status: "done", statusLabel: "Done", money: { word: "Paid, card" } }]),
      area: d.area.kind === "pass" ? { ...d.area, renewedFrom: { season: 2026, number: "TH-2026-0021", jobId: "j2" }, earlier: [{ season: 2026, number: "TH-2026-0021", jobId: "j2", state: "Done", renewedAs: { season: 2027, number: "TH-2027-0008", jobId: "p2027" } }] } : d.area,
    })
  }
  if (id === "marcus") {
    const d = customerPageOf("one-off")
    return swapContact(d, {
      id: "marcus",
      name: "Marcus Bell",
      firstName: "Marcus",
      contact: { channel: "text", phone: { text: "(970) 555-0188", href: "tel:+19705550188" }, email: "marcus.bell@example.com" },
      address: ["91 Main St", "Longmont, CO"],
      subtitle: "Customer since Jun 2026 · 91 Main St, Longmont",
      pills: [{ status: "overdue", label: "Past due $145" }],
      band: { next: d.band.next, unpaid: { value: "$145", sub: "Past due since Nov 12", alert: true, invoiceId: "i1" }, pass: d.band.pass, card: { value: "No card", sub: "Add one when you collect" } },
      unpaid: "$145",
      openInvoice: { id: "i1", number: "INV-2026-0035", amount: "$145", jobName: "Sprinkler repair", due: "Nov 12" },
      jobs: d.jobs.map((j) => ({ ...j, day: j.day ? { ...j.day, iso: "2026-10-29", label: "Oct 29, 2026" } : j.day, sortDay: "2026-10-29", money: { word: "Past due since Nov 12", tone: "past-due" as const, note: "$145 unpaid" } })),
      billing: { line: "Past due since Nov 12", tone: "past-due", total: "$145", paid: "$0", unpaid: "$145", invoices: [{ id: "i1", number: "INV-2026-0035", jobId: "j1", jobName: "Sprinkler repair", amount: "$145", sent: "Oct 29", due: "Nov 12", status: "overdue", statusLabel: "Past due", sortDay: "2026-10-29" }], payments: [] },
      messages: [{ ...d.messages[0]!, kind: "invoice", body: "Invoice INV-2026-0035: $145 for your repair at 91 Main St", at: "2026-10-29T17:00:00Z" }],
      notes: [{ ...d.notes[0]!, what: "Sent invoice INV-2026-0035, $145, due Nov 12", at: "2026-10-29T17:00:00Z" }],
    })
  }
  if (id === "dale") {
    const d = customerPageOf("two-seasons")
    // the number his pass page, the New job sheet and a request's match all use
    return swapContact(d, { id: "dale", contact: { ...d.contact, phone: { text: "(970) 555-0140", href: "tel:+19705550140" } } })
  }
  // the four of the customer-status design, as built in `customerPageOf`: their status is read from their jobs, never typed here
  if (id === "priya") return swapContact(customerPageOf("nothing-yet"), { id })
  if (id === "hal") return swapContact(customerPageOf("active-recent"), { id })
  if (id === "ivy") return swapContact(customerPageOf("past-customer"), { id })
  if (id === "gus") return swapContact(customerPageOf("archived"), { id })
  return null
}

export interface CustomerListRow {
  id: string
  name: string
  street: string
  next: string
  unpaid: number
  pass: string
}
/** The seven customers shaped by hand; `customerRows` adds everyone else in the world. */
export const CUSTOMER_ROWS: CustomerListRow[] = [
  { id: "andrea", name: "Andrea Dalton", street: "480 Briggs St, Erie", next: "Mon, May 3", unpaid: 145, pass: "Season Pass 2027" },
  { id: "marcus", name: "Marcus Bell", street: "91 Main St, Longmont", next: "None", unpaid: 145, pass: "" },
  { id: "dale", name: "Dale Whitaker", street: "212 Main St, Lafayette", next: "Mon, May 3", unpaid: 0, pass: "Season Pass 2027" },
  { id: "priya", name: "Priya Nair", street: "77 Aspen Way, Firestone", next: "None", unpaid: 0, pass: "" },
  { id: "hal", name: "Hal Reed", street: "41 Cottonwood Dr, Erie", next: "None", unpaid: 145, pass: "" },
  { id: "ivy", name: "Ivy Lund", street: "9 Meadow Ln, Louisville", next: "None", unpaid: 0, pass: "" },
  { id: "gus", name: "Gus Pratt", street: "70 Ridge Rd, Lafayette", next: "None", unpaid: 0, pass: "" },
]

/** Every customer of the world for the Customers list: the seven, then each other person with jobs, invoices or quotes, then anyone made in the prototype. */
export function customerRows(): CustomerListRow[] {
  const seen = new Set(CUSTOMER_ROWS.map((r) => r.id))
  const ids = [...worldCustomerIds(), ...allRows().map((r) => customerIdOf(r.name)), ...INVOICES.map((i) => i.customerId)].filter((id) => !seen.has(id) && seen.add(id))
  const others = ids.flatMap((id): CustomerListRow[] => {
    const p = customerPage(id)
    if (!p) return []
    const open = p.jobs.find((j) => j.open)
    return [{ id, name: p.name, street: p.address.join(", ").replace(", CO", ""), next: open ? (open.day ? (open.day.iso === "2026-11-20" ? "Today" : dayWords(open.day.iso)) : "Unscheduled") : "None", unpaid: Number((p.unpaid ?? "$0").replace(/\D/g, "")), pass: "" }]
  })
  return [...CUSTOMER_ROWS, ...others]
}

// -------------------------------------------------------------------------------------------------------------------- invoices

const OTHER_JOB: Record<string, string> = { i38: "g-reese", i35: "g-joe", i41: "g-lena", i44: "g-greg", i40: "g-priya", i33: "g-dana", i29: "g-sam", i21: "g-tom" }
const row = (id: string, n: string, customer: string, street: string, jobName: string, amount: number, sentOn: string, dueOn: string, status: InvoiceListRow["status"], who: string, over: Partial<InvoiceListRow> = {}): InvoiceListRow => ({ id, number: `INV-2026-${n}`, customerId: customerIdOf(customer), customer, street, jobId: "", jobName, amount, balance: status === "sent" || status === "past-due" ? amount : 0, sentOn, dueOn, status, who, ...over })

export const INVOICES: InvoiceListRow[] = [
  row("inv-42", "0042", "Andrea Dalton", "480 Briggs St", "Sprinkler repair", 145, "2026-11-12", "2026-12-02", "sent", RYAN, { jobId: "andrea-repair" }),
  row("inv-31", "0031", "Andrea Dalton", "480 Briggs St", "Spring turn-on", 145, "2026-04-14", "2026-04-28", "paid", RYAN, { jobId: "pass-2026", paidOn: "2026-04-20" }),
  row("inv-35", "0035", "Marcus Bell", "91 Main St", "Sprinkler repair", 145, "2026-10-29", "2026-11-12", "past-due", RYAN, { jobId: "marcus-repair" }),
  ...INVOICE_ROWS.filter((r) => !["i42", "i35"].includes(r.id)).map((r) => ({ ...r, id: `inv-${r.number.slice(-2)}`, customerId: customerIdOf(r.customer), jobId: OTHER_JOB[r.id] ?? "" })),
  row("inv-hal", "0003", "Hal Reed", "41 Cottonwood Dr", "Spring turn-on", 145, "2025-03-20", "2025-04-03", "past-due", RYAN, { jobId: "hal-turn-on" }),
  { ...INVOICE_ROWS.find((r) => r.id === "i35")!, id: "inv-35-joe", number: "INV-2026-0036", customerId: "other-joe-alvarez", jobId: "g-joe", dueOn: "2026-11-12", sentOn: "2026-10-29" },
]

const swapAll = (text: string, pairs: readonly (readonly [string, string])[]) => pairs.reduce((s, [a, b]) => (a && s.includes(a) ? s.replaceAll(a, b) : s), text)
const FIXTURE_OF: Record<InvoiceListRow["status"], InvoiceFixture> = { sent: "sent", "past-due": "past-due", paid: "paid-card", refunded: "refunded", canceled: "canceled" }
function rowOfStreet(street: string) {
  const hit = GRID_ROWS.find((r) => r.property.startsWith(street))
  return hit ? hit.property.split(", ")[1]! : "Erie"
}

export function invoicePage(id: string): InvoicePageData | null {
  const r = INVOICES.find((x) => x.id === id)
  if (!r) return null
  const base = invoicePageOf(FIXTURE_OF[r.status])
  const c = contactOf(r.customer)
  const first = r.customer.split(" ")[0]!
  const amountWords = money(r.amount)
  const pairs: (readonly [string, string])[] = [
    [base.number, r.number],
    [base.amount, amountWords],
    [base.customer.name, r.customer],
    [base.customer.contact.first, first],
    [base.customer.contact.email, c.email],
    [base.customer.contact.phone, c.text],
    [base.customer.street, r.street],
    [base.job.name.toLowerCase(), r.jobName.toLowerCase()],
  ]
  const lines = [{ ...base.lines[0]!, name: r.jobName, amount: amountWords }]
  const owed = [["Subtotal", amountWords], ["Tax", "$0"], ["Total", amountWords, "strong"], ["Paid", "$0"], ["Unpaid", amountWords, "alert"]] as InvoicePageData["totals"]
  const paid = [["Subtotal", amountWords], ["Tax", "$0"], ["Total", amountWords, "strong"], ["Paid", amountWords], ["Unpaid", "$0"]] as InvoicePageData["totals"]
  const none = [["Subtotal", amountWords], ["Tax", "$0"], ["Total", amountWords, "strong"], ["Paid", "$0"], ["Unpaid", "$0"]] as InvoicePageData["totals"]
  const jobStatus = r.status === "canceled" ? ({ status: "cancelled", statusLabel: "Canceled" } as const) : ({ status: "done", statusLabel: "Done" } as const)
  return {
    ...base,
    id: r.id,
    number: r.number,
    status: r.status,
    customer: { id: r.customerId, name: r.customer, contact: { first, channel: "text", phone: c.text, email: c.email }, phone: { text: c.text, href: c.href }, street: r.street, town: `${rowOfStreet(r.street)}, CO` },
    job: { id: r.jobId, name: r.jobName, ...jobStatus, next: "None ahead", total: amountWords },
    amount: amountWords,
    unpaid: r.balance ? amountWords : "$0",
    sent: dayWords(r.sentOn),
    due: dayWords(r.dueOn),
    paidOn: r.paidOn ? { label: `${dayWords(r.paidOn)}, card`, paymentId: `p-${r.id}` } : undefined,
    lines,
    totals: r.status === "paid" ? paid : r.status === "canceled" ? none : owed,
    payments: r.paidOn ? base.payments.map((p) => ({ ...p, id: `p-${r.id}`, date: dayWords(r.paidOn!), jobId: r.jobId, jobName: r.jobName, amount: amountWords })) : [],
    reminders: base.reminders.map((m) => ({ ...m, to: swapAll(m.to, pairs) })),
    messages: base.messages.map((m) => ({ ...m, body: swapAll(m.body, pairs) })),
    notes: base.notes.map((n) => ({ ...n, what: swapAll(n.what, pairs) })),
    remindedToday: r.remindedToday,
  }
}

// ------------------------------------------------------------------------------------------------------------ resolving links

const COMMON_JOB: Record<string, string> = { "TH-2027-0008": "pass-2027", "TH-2026-0021": "pass-2026", "TH-2027-0011": "dale-pass-2027", "TH-2026-0003": "dale-pass-2026", "job-pv1": "pass-2026", "job-pv2": "pass-2026", "job-pv3": "andrea-repair", "job-1": "andrea-repair" }
const OWNER_JOB: Record<string, Record<string, string>> = {
  andrea: { p2027: "pass-2027", j1: "andrea-repair", j3: "andrea-repair", j2: "pass-2026", j0: "pass-2026" },
  dale: { p2027: "dale-pass-2027", p2026: "dale-pass-2026" },
  marcus: { j1: "marcus-repair" },
  hal: { j1: "hal-turn-on" },
  ivy: { j1: "ivy-repair" },
  gus: { j1: "gus-blowout" },
}
const OWNER_INVOICE: Record<string, Record<string, string>> = { andrea: { i0: "inv-31", i1: "inv-42" } }

/** The first invoice a customer has that is still out, else any they have, else Andrea's: where a fixture's generic "inv-1" lands. */
function invoiceOf(owner: string | undefined): string {
  const mine = INVOICES.filter((i) => i.customerId === owner)
  return (mine.find((i) => i.balance > 0) ?? mine[0] ?? INVOICES[0]!).id
}

/** A route out of `parseHref` with the fixture's ids replaced by this world's, given the customer whose page the link was clicked on. */
export function resolveRoute(route: Route, owner?: string): Route {
  const id = route.id
  if (!id) return route
  if (route.screen === "customer") {
    if (id === "c-1" || id === "c1") return { screen: "customer", id: owner ?? "andrea" }
    return { screen: "customer", id: ({ c2: "dale", c3: "marcus" } as Record<string, string>)[id] ?? id }
  }
  if (route.screen === "job") return { ...route, id: OWNER_JOB[owner ?? ""]?.[id] ?? COMMON_JOB[id] ?? id }
  if (route.screen === "invoice") return { screen: "invoice", id: OWNER_INVOICE[owner ?? ""]?.[id] ?? (id === "i1" ? invoiceOf(owner) : id === "i0" ? "inv-31" : id) }
  return route
}

export function knownRoute(route: Route): boolean {
  if (route.screen === "job") return Boolean(rowOf(route.id ?? ""))
  if (route.screen === "quote") return Boolean(walkQuotes.getSnapshot().quotes[route.id ?? ""])
  if (route.screen === "invoice") return INVOICES.some((i) => i.id === route.id)
  if (route.screen === "customer") return Boolean(route.id && customerPage(route.id))
  return true
}

/** The customer a page belongs to: the one a bare "Customer" link on it should open. */
export function ownerOf(route: Route): string | undefined {
  if (route.screen === "customer") return route.id
  if (route.screen === "job") return customerOfJob(route.id ?? "")
  if (route.screen === "invoice") return INVOICES.find((i) => i.id === route.id)?.customerId
  if (route.screen === "quote") return walkQuotes.getSnapshot().quotes[route.id ?? ""]?.customerId
  return undefined
}

/** The words a record is called in the breadcrumb strip. */
export function nameOfRoute(route: Route): string | undefined {
  if (route.screen === "request") {
    const r = requestStore.getSnapshot().find((x) => x.id === route.id)
    return r ? fullName(r) : undefined
  }
  if (route.screen === "customer") return customerPage(route.id ?? "")?.name
  if (route.screen === "job") {
    const r = rowOf(route.id ?? "")
    return r ? (r.service === "Season Pass" ? r.title : r.name) : undefined
  }
  if (route.screen === "invoice") return INVOICES.find((i) => i.id === route.id)?.number
  if (route.screen === "quote") return route.id
  return undefined
}

// ------------------------------------------------------------------------------------------------------------------ search

const digits = (s: string) => s.replace(/\D/g, "")
/** Cmd+K over the walkthrough data: customers, then jobs, by name, street, phone or pass number. */
/** A Cmd+K customer hit reads "street · Active" (and "· Do not service" when marked); an archived customer is still found. */
function statusDetail(id: string, street: string): string {
  const page = customerPage(id)
  if (!page) return street
  return [street, CUSTOMER_STATUS_WORDS[page.status], ...(page.doNotService ? ["Do not service"] : [])].join(" · ")
}

export function searchWorld(query: string): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const qd = digits(q)
  const names = new Map<string, { id: string; name: string; street: string; phone: string }>()
  // every customer of the list, whether or not they have a row in the Jobs grid (Priya has no job yet; Gus is archived and still found)
  for (const c of customerRows()) names.set(c.id, { id: c.id, name: c.name, street: c.street, phone: contactOf(c.name).text })
  const customers: SearchHit[] = [...names.values()]
    .filter((c) => `${c.name} ${c.street}`.toLowerCase().includes(q) || (qd.length >= 3 && digits(c.phone).includes(qd)))
    .map((c) => ({ kind: "customer", id: c.id, title: c.name, detail: statusDetail(c.id, c.street), href: `/admin/customers?customer=${c.id}`, contact: c.phone }))
  const jobs: SearchHit[] = allRows().filter((r) => `${r.name} ${r.property} ${r.title}`.toLowerCase().includes(q)).map((r) => ({ kind: "job", id: r.id, title: r.title === r.service && r.service !== "Season Pass" ? `${r.name}, ${r.title}` : `${r.name}, ${r.title}`, detail: r.property, href: `/admin/jobs?job=${r.id}` }))
  // a request that is New or Seen is found here and nowhere else; once a job is made of it its customer and job are
  const requests: SearchHit[] = requestStore
    .getSnapshot()
    .filter((r) => !r.becameJob && !r.becameQuote && ["new", "seen"].includes(stateOf(r)))
    .filter((r) => `${fullName(r)} ${r.street} ${r.email} ${r.service}`.toLowerCase().includes(q) || (qd.length >= 3 && digits(r.phone).includes(qd)))
    .map((r) => ({ kind: "request" as const, id: r.id, title: fullName(r), detail: [serviceWords(r), r.town].filter((x) => x !== "Not said" && x).join(" · "), href: `/admin/requests?request=${r.id}`, contact: r.phone }))
  // a quote is found by its number, its customer's name or the street, and opens its own page
  const quotes: SearchHit[] = quoteRowsOf(Object.values(walkQuotes.getSnapshot().quotes), QUOTES_NOW)
    .filter((r) => `${r.id} ${r.customer} ${r.street}`.toLowerCase().includes(q))
    .map((r) => ({ kind: "quote" as const, id: r.id, title: r.id, detail: `${r.customer}, ${r.service}, ${quoteMoney(r.amount)} · ${QUOTE_PILL[r.state].label}`, href: recordHref.quote(r.id) }))
  return [...requests, ...customers, ...jobs, ...quotes]
}
