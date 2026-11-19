import "server-only"
import { resolveMx } from "node:dns/promises"
import { and, desc, eq, gt, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm"
import { atomically } from "@/db/atomic"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { passRecordOf } from "./record"
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

/** A pass job nobody has finished buying: it has a season, no sold day and no cancellation. */
const unsold = and(isNotNull(s.job.season), isNull(s.job.soldOn), isNull(s.job.cancelledAt))

/** Pending passes this customer started in the last hour. */
export async function pendingPassesLastHour(db: Database, organizationId: string, customerId: string, now: Date): Promise<number> {
  const since = new Date(now.getTime() - 3_600_000)
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.job)
    .where(and(eq(s.job.organizationId, organizationId), eq(s.job.customerId, customerId), unsold, gt(s.job.createdAt, since)))
  return row?.n ?? 0
}

/** The customer's newest pending pass from the last hour, if any: the one a reload or a return visit resumes. */
export async function newestPendingPass(db: Database, organizationId: string, customerId: string, now: Date) {
  const since = new Date(now.getTime() - 60 * 60 * 1000)
  const rows = await db
    .select({ job: s.job, zones: s.property.zones })
    .from(s.job)
    .innerJoin(s.property, eq(s.property.id, s.job.propertyId))
    .where(and(eq(s.job.organizationId, organizationId), eq(s.job.customerId, customerId), unsold, gt(s.job.createdAt, since)))
    .orderBy(desc(s.job.createdAt))
    .limit(1)
  return rows.map((r) => passRecordOf(r.job, r.zones))
}

/**
 * Removes the pass jobs nobody paid for within the hour (a season, no sold day, not canceled) with their lines, visits, events and
 * alerts. A sold pass has a sold day, a `job.sold` event or a succeeded payment and is never touched here. Returns how many. Customers and properties stay.
 */
export async function expirePendingPasses(db: Database, now: Date, minutes = PENDING_PASS_MINUTES): Promise<number> {
  const cutoff = new Date(now.getTime() - minutes * 60_000)
  const stale = await db
    .select({ id: s.job.id, organizationId: s.job.organizationId })
    .from(s.job)
    .where(
      and(
        unsold,
        lt(s.job.createdAt, cutoff),
        // A pass whose sold day was lost (a crash after payment, an old-code write) is still sold: a `job.sold` event or a succeeded payment keeps it.
        sql`not exists (select 1 from ${s.event} where ${s.event.jobId} = ${s.job.id} and ${s.event.kind} = 'job.sold')`,
        sql`not exists (select 1 from ${s.charge} where ${s.charge.jobId} = ${s.job.id} and ${s.charge.status} = 'succeeded')`,
        // Money is a record: a job with any payment attempt or invoice row (a failed charge, say) is never deleted here; its foreign key would stop the whole purge.
        sql`not exists (select 1 from ${s.charge} where ${s.charge.jobId} = ${s.job.id})`,
        sql`not exists (select 1 from ${s.invoice} where ${s.invoice.jobId} = ${s.job.id})`,
      ),
    )
  if (stale.length === 0) return 0
  const jobIds = stale.map((r) => r.id)
  const orgs = [...new Set(stale.map((r) => r.organizationId))]
  // Foreign-key order: events, lines, visits, alerts, then the job.
  // The events of a checkout that never finished are not history: they go with the pass (the one place anything leaves `event`).
  // One unit: a failure at any step leaves every row where it was, never a job with its visits and lines already gone.
  await atomically(db, (d) => [
    d.delete(s.event).where(and(inArray(s.event.organizationId, orgs), inArray(s.event.jobId, jobIds))),
    d.delete(s.lineItem).where(inArray(s.lineItem.jobId, jobIds)),
    d.delete(s.visit).where(inArray(s.visit.jobId, jobIds)),
    d.delete(s.adminAlert).where(and(inArray(s.adminAlert.organizationId, orgs), inArray(s.adminAlert.jobId, jobIds))),
    d.delete(s.job).where(inArray(s.job.id, jobIds)),
  ])
  return jobIds.length
}
