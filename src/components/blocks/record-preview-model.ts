import type { PillStatus } from "./StatusPill"

// One set of data for one record in every place it shows (docs/plans/2026-11-19-record-links-research.md, rule 6): the chip's link, the
// hover card, a Cmd+K summary and the page read the same `RecordPreviewData`, so a fact cannot differ between them. Pure, no React.

export type RecordKind = "customer" | "property" | "job" | "visit" | "invoice" | "payment" | "person" | "day" | "request" | "quote"

export const KIND_WORD: Record<RecordKind, string> = {
  customer: "Customer",
  property: "Property",
  job: "Job",
  visit: "Visit",
  invoice: "Invoice",
  payment: "Payment",
  person: "Person",
  day: "Day",
  request: "Request",
  quote: "Quote",
}

export interface RecordPreviewData {
  kind: RecordKind
  /** what the chip says: "Andrea Reyes", "Tue, Nov 24 at 9:00 am", "Invoice 1042" */
  name: string
  /** the record's own page */
  href: string
  /** one muted line under the name in the card */
  subtitle?: string
  pill?: { status: PillStatus; label?: string }
  /** at most four label and value pairs */
  facts: readonly (readonly [label: string, value: string])[]
  openLabel: string
}

const q = (s: string) => encodeURIComponent(s)

/** Where each record opens: the address the record host already understands. */
export const recordHref = {
  customer: (id: string) => `/admin/customers?customer=${q(id)}`,
  job: (id: string) => `/admin/jobs?job=${q(id)}`,
  visit: (id: string) => `/admin/schedule?view=list&visit=${q(id)}`,
  invoice: (id: string) => `/admin/invoices?invoice=${q(id)}`,
  person: () => `/admin/settings?tab=people`,
  /** a scheduled day opens the Schedule's Day view */
  day: (isoDay: string) => `/admin/schedule?day=${q(isoDay)}`,
  /** a request opens in the Requests list's own page (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.2) */
  request: (id: string) => `/admin/requests?request=${q(id)}`,
  /** a quote is its own record with its own page (Hannah, Nov 22 2026): the chip opens it by its number */
  quote: (number: string) => `/admin/quotes?quote=${q(number)}`,
}

const cap = (facts: RecordPreviewData["facts"]) => facts.slice(0, 4)

export function customerPreview(c: { id: string; name: string; phone?: string; address?: string; openJobs: number; unpaid?: string }): RecordPreviewData {
  return {
    kind: "customer",
    name: c.name,
    href: recordHref.customer(c.id),
    subtitle: c.address,
    facts: cap([
      ...(c.phone ? ([["Phone", c.phone]] as const) : []),
      ["Open jobs", String(c.openJobs)],
      ["Unpaid", c.unpaid ?? "$0"],
    ]),
    openLabel: "Open customer",
  }
}

export function jobPreview(j: { id: string; name: string; customer: string; status: PillStatus; next?: string; total: string }): RecordPreviewData {
  return {
    kind: "job",
    name: j.name,
    href: recordHref.job(j.id),
    subtitle: j.customer,
    pill: { status: j.status },
    facts: cap([["Next visit", j.next ?? "No day yet"], ["Total", j.total]]),
    openLabel: "Open job",
  }
}

export function visitPreview(v: { id: string; name: string; customer: string; status: PillStatus; when: string; who: string; money?: string }): RecordPreviewData {
  return {
    kind: "visit",
    name: v.name,
    href: recordHref.visit(v.id),
    subtitle: v.customer,
    pill: { status: v.status },
    facts: cap([["When", v.when], ["Who", v.who], ...(v.money ? ([["Money", v.money]] as const) : [])]),
    openLabel: "Open visit",
  }
}

export function invoicePreview(i: { id: string; number: string; customer: string; status: PillStatus; statusLabel: string; total: string; balance: string; due: string }): RecordPreviewData {
  return {
    kind: "invoice",
    name: `Invoice ${i.number}`,
    href: recordHref.invoice(i.id),
    subtitle: i.customer,
    pill: { status: i.status, label: i.statusLabel },
    facts: cap([["Total", i.total], ["Balance", i.balance], ["Due", i.due]]),
    openLabel: "Open invoice",
  }
}

export function personPreview(p: { name: string; role: string; truck?: string; stopsToday: number }): RecordPreviewData {
  return {
    kind: "person",
    name: p.name,
    href: recordHref.person(),
    subtitle: p.role,
    facts: cap([...(p.truck ? ([["Truck", p.truck]] as const) : []), ["Stops today", String(p.stopsToday)]]),
    openLabel: "Open in Settings",
  }
}

/** A scheduled day: the stop count and who has it. A visit with no day has no such record, so nothing is built and the caller shows "No day yet". */
export function dayPreview(d: { isoDay: string; label: string; stops: number; who: string }): RecordPreviewData {
  return {
    kind: "day",
    name: d.label,
    href: recordHref.day(d.isoDay),
    facts: [["Stops", d.stops === 1 ? "1 stop" : `${d.stops} stops`], ["Who", d.who]],
    openLabel: "Open Schedule",
  }
}
