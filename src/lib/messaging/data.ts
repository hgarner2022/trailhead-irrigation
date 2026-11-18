import "server-only"
import { and, asc, eq, isNull } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import type { Base, VisitFacts } from "@/emails/types"
import type { EmailLine } from "@/emails/types"
import { jobSubtotal, jobTax, linesOfVisit } from "@/lib/jobs/lines"
import { loadTaxRule } from "@/lib/money/tax-rule"
import { customerFacingFirstName } from "@/lib/portal/words"
import { kindName } from "@/lib/pass/server/messages"
import { visitCalendarUrl } from "./tokens"

/** What every customer message carries: links built from the site origin, the account link and the sign-in link with the customer's email filled in. */
export function baseData(origin: string, customer: { firstName: string; email: string | null }): Base {
  return {
    origin,
    firstName: customer.firstName,
    accountUrl: `${origin}/account`,
    signInUrl: customer.email ? `${origin}/account/sign-in?email=${encodeURIComponent(customer.email)}` : `${origin}/account/sign-in`,
  }
}

/** The visit as the messages know it, on `day` when the caller already knows the new one; null while it has no day. */
export async function loadVisitFacts(db: Database, visitId: string, origin: string, day?: string): Promise<VisitFacts | null> {
  const [row] = await db
    // `who` is the person's first name as a customer reads it (`customerFacingFirstName`: none for a label such as "Second truck").
    // A person who has left keeps their visits until the office moves them (Settings › People, Remove), so they are not named.
    .select({ visit: s.visit, address: s.property.address, town: s.property.town, gateCode: s.property.gateCode, contactName: s.property.contactName, person: s.person.name, personActive: s.person.active })
    .from(s.visit)
    .innerJoin(s.property, eq(s.property.id, s.visit.propertyId))
    .leftJoin(s.person, eq(s.person.id, s.visit.personId))
    .where(eq(s.visit.id, visitId))
  const when = day ?? row?.visit.scheduledOn
  if (!row || !when) return null
  return {
    id: row.visit.id,
    name: kindName(row.visit.kind),
    day: when,
    startTime: row.visit.startTime,
    who: row.personActive ? customerFacingFirstName(row.person) : null,
    ...(row.gateCode ? { gateCode: row.gateCode } : {}),
    ...(row.contactName ? { contactName: row.contactName } : {}),
    address: row.address,
    location: `${row.address}, ${row.town}`,
    icsUrl: visitCalendarUrl(origin, row.visit.id),
  }
}

/** "Visa ending 4242" for the card on a customer, or null when there is no card or no brand. */
export function cardWords(customer: { cardBrand?: string | null; cardLast4?: string | null }): string | null {
  return customer.cardLast4 ? brandWords(customer.cardBrand, customer.cardLast4) : null
}

/** "Visa ending 4242" from a brand as Stripe names it ("visa") and the last four. */
export const brandWords = (brand: string | null | undefined, last4: string) => `${brand ? `${brand.charAt(0).toUpperCase()}${brand.slice(1)}` : "Card"} ending ${last4}`

/** The street address of a property ("412 Ash St"), or "" when the row is gone. */
export async function propertyAddress(db: Database, propertyId: string | null | undefined): Promise<string> {
  if (!propertyId) return ""
  const [row] = await db.select({ address: s.property.address }).from(s.property).where(eq(s.property.id, propertyId))
  return row?.address ?? ""
}

/** The street address of the property a job is at. */
export async function jobAddress(db: Database, jobId: string): Promise<string> {
  const [row] = await db.select({ address: s.property.address }).from(s.job).innerJoin(s.property, eq(s.property.id, s.job.propertyId)).where(eq(s.job.id, jobId))
  return row?.address ?? ""
}

/** The receipt's own number, the payment id's short form: "R-1A2B3C4D". */
export const receiptNumber = (paymentId: string) => `R-${paymentId.replace(/-/g, "").slice(0, 8).toUpperCase()}`

/** An invoice's or a receipt's line as an email shows it. */
export const emailLine = (l: { name: string; quantity: number; unitPrice: number }): EmailLine => ({ name: l.name, quantity: l.quantity, unitPrice: l.unitPrice, amount: l.quantity * l.unitPrice })

/**
 * The lines a receipt is for: a visit's own live lines, or the whole job's when no visit is given, with what they come to before
 * tax, the sales tax (the rule in Settings › Billing, per line) and the total.
 */
export async function receiptLines(db: Database, organizationId: string, jobId: string, visitId?: string | null) {
  const rows = await db.select().from(s.lineItem).where(and(eq(s.lineItem.organizationId, organizationId), eq(s.lineItem.jobId, jobId), isNull(s.lineItem.cancelledAt))).orderBy(asc(s.lineItem.createdAt), asc(s.lineItem.id))
  const picked = visitId ? linesOfVisit(rows, visitId) : rows
  const rule = await loadTaxRule(db, organizationId)
  const subtotal = jobSubtotal(picked)
  const tax = jobTax(picked, rule)
  return { lines: picked.map(emailLine), subtotal, tax, total: subtotal + tax }
}

/** Who was on a visit (first name, none once they have left) and the day it was done or is set for. */
export async function visitWhoDay(db: Database, visitId: string | null | undefined): Promise<{ who: string | null; day: string | null }> {
  if (!visitId) return { who: null, day: null }
  const [row] = await db.select({ visit: s.visit, person: s.person.name, active: s.person.active }).from(s.visit).leftJoin(s.person, eq(s.person.id, s.visit.personId)).where(eq(s.visit.id, visitId))
  if (!row) return { who: null, day: null }
  return { who: row.active ? customerFacingFirstName(row.person) : null, day: row.visit.completedOn ?? row.visit.scheduledOn ?? null }
}
