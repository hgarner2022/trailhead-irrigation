import type { GridJob, GridStatus, BillingState } from "../JobsGridDesign"
import { type JobPageData, type JobState, jobPageOf } from "../job-fixtures"
import { money } from "../invoice-fixtures"
import { passPageOf, type MultiTripData } from "../trip-fixtures"
import type { PageCustomer } from "../JobPageTrips"
import { quoteGridRow } from "../quotes/quote-grid"
import { walkQuotes } from "../quotes/quote-store"
import { clearWorldCustomers, worldCustomer } from "./world-customers"

// The walkthrough's jobs (see data.ts for the world): the Jobs grid's rows and the page each one opens.

// Andrea, Marcus and Dale are the three with full histories; Priya, Hal, Ivy and Gus are the four of the customer-status design (New, Active by a job
// 20 months ago with a past-due invoice, Past customer marked Do not service, Archived), so the Customers list shows every status.
export const REAL_CUSTOMERS = ["andrea", "marcus", "dale", "priya", "hal", "ivy", "gus"] as const
export type RealCustomer = (typeof REAL_CUSTOMERS)[number]
const slug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")
const REAL_NAMES: Record<string, RealCustomer> = { "Andrea Dalton": "andrea", "Marcus Bell": "marcus", "Dale Whitaker": "dale", "Priya Nair": "priya", "Hal Reed": "hal", "Ivy Lund": "ivy", "Gus Pratt": "gus" }
export const customerIdOf = (name: string) => REAL_NAMES[name] ?? `other-${slug(name)}`
export const isRealCustomer = (id: string): id is RealCustomer => (REAL_CUSTOMERS as readonly string[]).includes(id)

// ---------------------------------------------------------------------------------------------------------------- jobs

const RYAN = "Ryan Garner"
const HANNAH = "Hannah Garner"
const NOONE = "No one yet"
const g = (id: string, name: string, service: string, title: string, property: string, stage: GridStatus, visits: string, total: number, billingState: BillingState | null, billing: string, next: string, who: string, season = ""): GridJob => ({ id, name, service, title, property, stage, visits, total, billingState, billing, next, who, season })

export const GRID_ROWS: GridJob[] = [
  g("andrea-repair", "Andrea Dalton", "Sprinkler repair", "Sprinkler repair", "480 Briggs St, Erie", "unscheduled", "0 of 1 done", 145, null, "", "Unscheduled", NOONE),
  g("pass-2027", "Andrea Dalton", "Season Pass", "Season Pass TH-2027-0008", "480 Briggs St, Erie", "scheduled", "0 of 2 done", 260, null, "", "Mon, May 3", RYAN, "2027"),
  g("pass-2026", "Andrea Dalton", "Season Pass", "Season Pass TH-2026-0021", "480 Briggs St, Erie", "done", "2 of 2 done", 260, "paid", "Paid, card", "None", RYAN, "2026"),
  g("marcus-repair", "Marcus Bell", "Sprinkler repair", "Sprinkler repair", "91 Main St, Longmont", "done", "1 of 1 done", 145, "overdue", "Past due since Nov 12", "None", RYAN, "2026"),
  g("dale-pass-2027", "Dale Whitaker", "Season Pass", "Season Pass TH-2027-0011", "212 Main St, Lafayette", "scheduled", "0 of 2 done", 210, null, "", "Mon, May 3", RYAN, "2027"),
  g("dale-pass-2026", "Dale Whitaker", "Season Pass", "Season Pass TH-2026-0003", "212 Main St, Lafayette", "done", "2 of 2 done", 210, "paid", "Paid, card", "None", RYAN, "2026"),
  g("g-reese", "Reese Holloway", "Fall blowout", "Fall blowout", "51 Shadow Ln, Firestone", "done", "1 of 1 done", 124, "overdue", "Past due since Nov 17", "None", RYAN, "2026"),
  g("g-joe", "Joe Alvarez", "Sprinkler repair", "Sprinkler repair", "22 Pine St, Louisville", "done", "1 of 1 done", 145, "overdue", "Past due since Nov 12", "None", HANNAH),
  g("g-lena", "Lena Park", "Sprinkler repair", "Valve replacement", "7 Oak Ct, Lafayette", "done", "1 of 1 done", 230, "bill-sent", "Invoice sent, due Nov 25", "None", RYAN),
  g("g-greg", "Greg Olsen", "Fall blowout", "Fall blowout", "5 Birch Ln, Erie", "done", "1 of 1 done", 115, "bill-sent", "Invoice sent, due Nov 30", "None", HANNAH),
  g("g-sam", "Sam Ortiz", "Sprinkler repair", "Sprinkler repair", "14 Aspen Dr, Firestone", "today", "0 of 1 done", 145, null, "", "Today", RYAN),
  g("g-dana", "Dana Cho", "Fall blowout", "Fall blowout", "18 Cedar Way, Erie", "done", "1 of 1 done", 115, "paid", "Paid, card", "None", RYAN, "2026"),
  g("g-priya", "Priya Shah", "Sprinkler repair", "Sprinkler repair", "330 Elm Dr, Lafayette", "done", "1 of 1 done", 145, "paid", "Paid, check", "None", HANNAH),
  g("g-tom", "Tom Becker", "Sprinkler repair", "Sprinkler repair", "600 Hill Rd, Broomfield", "cancelled", "0 of 1 done", 145, null, "", "None", NOONE),
  g("g-tom-install", "Tom Becker", "New sprinkler system installation", "New sprinkler system installation", "600 Hill Rd, Broomfield", "unscheduled", "0 of 1 done", 0, null, "", "Unscheduled", NOONE),
  g("g-lena-lights", "Lena Park", "Christmas lights", "Christmas lights", "7 Oak Ct, Lafayette", "unscheduled", "0 of 1 done", 600, null, "", "Unscheduled", NOONE),
  g("hal-turn-on", "Hal Reed", "Spring turn-on", "Spring turn-on", "41 Cottonwood Dr, Erie", "done", "1 of 1 done", 145, "overdue", "Past due since Apr 3, 2025", "None", RYAN, "2025"),
  g("ivy-repair", "Ivy Lund", "Sprinkler repair", "Sprinkler repair", "9 Meadow Ln, Louisville", "done", "1 of 1 done", 145, "paid", "Paid, check", "None", RYAN, "2024"),
  g("gus-blowout", "Gus Pratt", "Fall blowout", "Fall blowout", "70 Ridge Rd, Lafayette", "done", "1 of 1 done", 95, "paid", "Paid, card", "None", RYAN, "2023"),
  // jobs that have a quote (Requests and quotes, Nov 20 2026): their stage is read from the quotes, so these rows are re-read by `allRows`
  g("q-dana", "Dana Cho", "Larger sprinkler repair", "Larger sprinkler repair", "18 Cedar Way, Erie", "needs-a-quote", "0 of 1 done", 0, null, "", "Unscheduled", NOONE),
  g("q-beth", "Beth Orr", "Christmas lights", "Christmas lights", "33 Aspen Ct, Lafayette", "quote-sent", "0 of 1 done", 1200, null, "", "Unscheduled", NOONE),
  g("q-greg", "Greg Olsen", "Larger sprinkler repair", "Larger sprinkler repair", "5 Birch Ln, Erie", "quote-sent", "0 of 1 done", 860, null, "", "Unscheduled", NOONE),
  g("q-nora", "Nora Quinn", "Christmas lights", "Christmas lights", "12 Elk Ct, Louisville", "unscheduled", "0 of 1 done", 750, null, "", "Unscheduled", NOONE),
  g("q-owen", "Owen Pratt", "Larger sprinkler repair", "Larger sprinkler repair", "40 Hill St, Erie", "cancelled", "0 of 1 done", 1150, null, "", "None", NOONE),
  g("q-ravi", "Ravi Shah", "Larger sprinkler repair", "Larger sprinkler repair", "8 Willow Dr, Firestone", "needs-a-quote", "0 of 1 done", 0, null, "", "Unscheduled", NOONE),
  g("g-ana", "Ana Ruiz", "Sprinkler repair", "Sprinkler repair", "9 Laurel St, Louisville", "late", "0 of 1 done", 145, null, "", "Mon, Nov 16", RYAN),
]

/** The invoice a job's page names: the fixtures all say INV-2026-0001 at /admin/invoices?invoice=inv-1, so each page is rewritten to its own invoice. */
export const INVOICE_OF_JOB: Record<string, { id: string; number: string }> = {
  "andrea-repair": { id: "inv-42", number: "INV-2026-0042" },
  "marcus-repair": { id: "inv-35", number: "INV-2026-0035" },
  "g-reese": { id: "inv-38", number: "INV-2026-0038" },
  "g-joe": { id: "inv-35-joe", number: "INV-2026-0036" },
  "g-lena": { id: "inv-41", number: "INV-2026-0041" },
  "g-greg": { id: "inv-44", number: "INV-2026-0044" },
  "g-priya": { id: "inv-40", number: "INV-2026-0040" },
  "g-dana": { id: "inv-33", number: "INV-2026-0033" },
  "g-sam": { id: "inv-29", number: "INV-2026-0029" },
  "g-tom": { id: "inv-21", number: "INV-2026-0021" },
}
const OLD = "INV-2026-0001"
/** Jobs made in the prototype (New job, Sell pass): they join the grid until Start over. */
const EXTRA: GridJob[] = []
/** The rows of the grid; a job with a quote reads its stage and total from the quote store. */
export const allRows = (): GridJob[] =>
  [...GRID_ROWS, ...EXTRA].map((r) => {
    const job = r.id.startsWith("q-") ? walkQuotes.getSnapshot()[r.id] : undefined
    return job ? quoteGridRow(r, job) : r
  })
export const registerJob = (row: GridJob) => void EXTRA.push(row)
/** Customers brought back by new work in the prototype (Archived until a job is made for them); Start over clears it. */
const BROUGHT_BACK = new Set<string>()
export const markActiveAgain = (customerId: string) => void BROUGHT_BACK.add(customerId)
export const isActiveAgain = (customerId: string) => BROUGHT_BACK.has(customerId)
export const resetExtras = () => (EXTRA.length = 0, BROUGHT_BACK.clear(), clearWorldCustomers(), undefined)
export const rowOf = (id: string) => allRows().find((r) => r.id === id)
export const customerOfJob = (id: string) => customerIdOf(rowOf(id)?.name ?? "")

export type JobView = { kind: "flow" } | { kind: "quote" } | { kind: "page"; data: JobPageData } | { kind: "trips"; data: MultiTripData; customer?: PageCustomer } | { kind: "none" }

const STATE_OF = (r: GridJob): JobState => {
  if (r.stage === "done") return r.billingState === "paid" ? "done-paid" : r.billingState === "overdue" ? "past-due" : r.billingState === "bill-sent" ? "invoice-sent" : "done-unpaid"
  if (r.stage === "cancelled") return "canceled"
  if (r.stage === "active") return "active"
  return r.stage as JobState
}

const CONTACTS: Record<string, { text: string; href: string; email: string }> = {
  andrea: { text: "(970) 555-0123", href: "tel:+19705550123", email: "andrea.dalton@example.com" },
  marcus: { text: "(970) 555-0188", href: "tel:+19705550188", email: "marcus.bell@example.com" },
  dale: { text: "(970) 555-0140", href: "tel:+19705550140", email: "dale.whitaker@example.com" },
  priya: { text: "(970) 555-0123", href: "tel:+19705550123", email: "priya.nair@example.com" },
  hal: { text: "(970) 555-0123", href: "tel:+19705550123", email: "hal.reed@example.com" },
  ivy: { text: "(970) 555-0123", href: "tel:+19705550123", email: "ivy.lund@example.com" },
  gus: { text: "(970) 555-0123", href: "tel:+19705550123", email: "gus.pratt@example.com" },
}
export const contactOf = (name: string) => {
  const id = customerIdOf(name)
  const w = worldCustomer(id)
  if (CONTACTS[id]) return CONTACTS[id]
  if (w) return { text: w.phone, href: `tel:+1${w.phone.replace(/\D/g, "")}`, email: w.email }
  return { text: "(970) 555-0123", href: "tel:+19705550123", email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com` }
}

const cheaper = (t: string) => t.replaceAll("$260", "$210").replaceAll("$145", "$95")
/** Dale Whitaker's Season Pass pages: the pass fixture with his number, address, six zones, card and prices ($95 and $115). */
function dalePass(next: boolean): MultiTripData {
  const d = next ? passPageOf("ahead", { kind: "from", number: "TH-2026-0003" }) : passPageOf("both-done", { kind: "as", number: "TH-2027-0011" })
  const number = next ? "TH-2027-0011" : "TH-2026-0003"
  const swap = (t: string) => t.replaceAll("TH-2027-0008", number).replaceAll("Andrea", "Dale")
  return {
    ...d,
    title: `Season Pass ${number}`,
    subtitle: next ? "Dale Whitaker · Renewed Nov 3, website" : "Dale Whitaker · Sold Mar 2, website",
    columns: d.columns.map((c) => ({
      ...c,
      rows: c.rows.map((r) => (r[0] === "Address" ? ["Address", "212 Main St, Lafayette"] : r[0] === "Zones" ? ["Zones", "6"] : r[0] === "Gate code" ? ["Gate code", "None"] : r[0] === "Card" ? ["Card", "Visa ending 1881"] : r)),
    })),
    lines: d.lines.map((l) => ({ ...l, amount: cheaper(l.amount) })),
    totals: d.totals.map(([k, v, e]) => [k, cheaper(v), e] as (typeof d.totals)[number]),
    billing: { ...d.billing, summary: d.billing.summary.map(([k, v]) => [k, cheaper(swap(v))] as [string, string]), rows: d.billing.rows.map((r) => ({ ...r, amount: cheaper(r.amount ?? ""), detail: r.detail && cheaper(r.detail) })) },
    notes: d.notes.map((n) => ({ ...n, what: swap(n.what) })),
    messages: d.messages.map((m) => ({ ...m, body: swap(m.body) })),
    pass: d.pass && { ...d.pass, number, firstName: "Dale", lastName: "Whitaker", zones: 6 },
  }
}

/** The page of one job: the flow for Andrea's repair, the trips page for her passes, the fixture state for the rest, re-skinned to the row. */
export function jobView(id: string): JobView {
  const row = rowOf(id)
  if (!row) return { kind: "none" }
  if (id === "andrea-repair") return { kind: "flow" }
  if (id.startsWith("q-")) return { kind: "quote" }
  if (id === "pass-2027") return { kind: "trips", data: passPageOf("ahead", { kind: "from", number: "TH-2026-0021" }) }
  if (id === "pass-2026") {
    const d = passPageOf("both-done", { kind: "as", number: "TH-2027-0008" })
    return { kind: "trips", data: { ...d, title: "Season Pass TH-2026-0021", subtitle: "Andrea Dalton · Sold Mar 2, website", notes: d.notes.map((n) => ({ ...n, what: n.what.replace("TH-2027-0008", "TH-2026-0021") })), messages: d.messages.map((m) => ({ ...m, body: m.body.replace("TH-2027-0008", "TH-2026-0021") })) } }
  }
  if (id.startsWith("dale-pass")) return { kind: "trips", data: dalePass(id === "dale-pass-2027"), customer: { name: "Dale Whitaker", phone: { text: "(970) 555-0140", href: "tel:+19705550140" } } }
  const c = contactOf(row.name)
  const data = jobPageOf(STATE_OF(row))
  const [street, town] = row.property.split(", ")
  const where: JobPageData["where"] = data.where.map((f) => (f[0] === "Address" ? ["Address", `${street}, ${town}`] : f))
  const isAndrea = row.name === "Andrea Dalton"
  const first = row.name.split(" ")[0]!
  const inv = INVOICE_OF_JOB[id]
  const swap = (s: string) => {
    const named = isAndrea ? s : s.replaceAll("Andrea", first).replace("480 Briggs St", street!)
    return inv ? named.replaceAll(OLD, inv.number) : named
  }
  const link = inv ? `/admin/invoices?invoice=${inv.id}` : ""
  const billing = inv
    ? {
        ...data.billing,
        paidLine: data.billing.paidLine && { ...data.billing.paidLine, invoice: data.billing.paidLine.invoice && { name: inv.number, href: link } },
        invoices: data.billing.invoices?.map((i) => ({ ...i, number: inv.number, href: link })),
      }
    : data.billing
  return {
    kind: "page",
    data: {
      ...data,
      customer: row.name,
      phone: { text: c.text, href: c.href },
      where,
      billing,
      subtitle: `${row.title} · Added Nov 12`,
      pastVisits: isAndrea ? data.pastVisits : [],
      pastTotal: isAndrea ? data.pastTotal : 0,
      contact: { channel: "text", email: c.email },
      notes: data.notes.map((n) => ({ ...n, what: swap(n.what) })),
      messages: data.messages.map((m) => ({ ...m, body: swap(m.body) })),
      lines: data.lines.map((l) => (row.service === "Fall blowout" ? { ...l, name: "Fall blowout", amount: money(row.total) } : l)),
    },
  }
}

