import "server-only"
import { resolveMx } from "node:dns/promises"
import { and, desc, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { canContinue, initialState, STEPS, type CheckoutState } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"

/** An unpaid checkout lives 60 minutes (the Stripe session itself expires at 30). */
export const PENDING_PASS_MINUTES = 60
/** Three new pending passes per email per hour; going back and forth in one checkout reuses the same pass and counts once. */
export const MAX_PENDING_PER_HOUR = 3

export interface CheckoutAnswers {
  property: { address: string; town: string; state?: string; zip?: string }
  zones: number
  needsCustomerHome: boolean
  customer: { firstName: string; lastName?: string; email: string; phone?: string }
  today: string
}

/**
 * The first checkout step before the card whose rule the answers fail, or null. It runs the reducer's own
 * `canContinue` over a state built from the answers, so the browser and the server hold one rule.
 */
export function failedCheckoutStep(a: CheckoutAnswers): (typeof STEPS)[number]["key"] | null {
  const base = initialState({
    today: a.today,
    address: a.property.address,
    place: { id: "", label: a.property.address, line1: a.property.address, town: a.property.town, state: a.property.state ?? "CO", zip: a.property.zip ?? "" },
    access: a.needsCustomerHome ? "no" : "yes",
    zones: a.zones,
    firstName: a.customer.firstName,
    lastName: a.customer.lastName ?? "",
    email: a.customer.email,
    phone: a.customer.phone ?? "",
    // The terms box is the browser's; the server records the consent itself (`passes.consent`), so only the answers are held to the rule here.
    termsAccepted: true,
    // The days are the server's to hold, not a rule for the answers: a loaded, possibly empty, set of offers lets the step pass.
    offers: {},
  })
  for (let step = 1; step <= STEPS.findIndex((x) => x.key === "card"); step++) {
    const state: CheckoutState = { ...base, step }
    if (!canContinue(state)) return STEPS[step - 1]!.key
  }
  return null
}

type MxLookup = (domain: string) => Promise<unknown[]>

const withTimeout = <T>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), ms))])

/**
 * Whether the email's domain has a mail server. Only a definite miss (no such domain, no records) is false; a timeout or
 * any other DNS trouble lets the customer through, because a slow resolver must not stop a purchase.
 */
export async function emailDomainReachable(email: string, lookup: MxLookup = (d) => resolveMx(d), timeoutMs = 2000): Promise<boolean> {
  const domain = email.split("@")[1]?.trim().toLowerCase()
  if (!domain) return false
  try {
    const records = await withTimeout(lookup(domain), timeoutMs)
    return records.length > 0
  } catch (error) {
    const code = (error as { code?: string }).code
    return !(code === "ENOTFOUND" || code === "ENODATA")
  }
}

/** Pending passes this customer started in the last hour. */
export async function pendingPassesLastHour(db: Database, organizationId: string, customerId: string, now: Date): Promise<number> {
  const since = new Date(now.getTime() - 3_600_000)
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.job)
    .where(and(eq(s.job.organizationId, organizationId), eq(s.job.customerId, customerId), eq(s.job.kind, "pass"), eq(s.job.status, "pending"), isNull(s.job.cancelledAt), gt(s.job.createdAt, since)))
  return row?.n ?? 0
}

/** The customer's newest pending pass from the last hour, if any: the one a reload or a return visit resumes. */
export async function newestPendingPass(db: Database, organizationId: string, customerId: string, now: Date) {
  const since = new Date(now.getTime() - 60 * 60 * 1000)
  const rows = await db
    .select({ pass: s.seasonPass })
    .from(s.job)
    .innerJoin(s.seasonPass, eq(s.seasonPass.jobId, s.job.id))
    .where(and(eq(s.job.organizationId, organizationId), eq(s.job.customerId, customerId), eq(s.job.kind, "pass"), eq(s.job.status, "pending"), isNull(s.job.cancelledAt), gt(s.job.createdAt, since)))
    .orderBy(desc(s.job.createdAt))
    .limit(1)
  return rows.map((r) => r.pass)
}

/** Removes the pending pass jobs (their lines, visits and the pass alias row) nobody paid for within the hour. Returns how many. Customers and properties stay. */
export async function expirePendingPasses(db: Database, now: Date, minutes = PENDING_PASS_MINUTES): Promise<number> {
  const cutoff = new Date(now.getTime() - minutes * 60_000)
  const stale = await db
    .select({ id: s.job.id })
    .from(s.job)
    .where(and(eq(s.job.kind, "pass"), eq(s.job.status, "pending"), isNull(s.job.cancelledAt), lt(s.job.createdAt, cutoff)))
  if (stale.length === 0) return 0
  const jobIds = stale.map((r) => r.id)
  const passes = await db.select({ id: s.seasonPass.id }).from(s.seasonPass).where(inArray(s.seasonPass.jobId, jobIds))
  const passIds = passes.map((r) => r.id)
  // Foreign-key order: line_item, visit, pass_change, admin_alert, season_pass, then job.
  await db.delete(s.lineItem).where(inArray(s.lineItem.jobId, jobIds))
  await db.delete(s.visit).where(inArray(s.visit.jobId, jobIds))
  if (passIds.length > 0) {
    await db.delete(s.passChange).where(inArray(s.passChange.passId, passIds))
    await db.delete(s.adminAlert).where(inArray(s.adminAlert.passId, passIds))
    await db.delete(s.seasonPass).where(inArray(s.seasonPass.id, passIds))
  }
  await db.delete(s.job).where(inArray(s.job.id, jobIds))
  return jobIds.length
}
