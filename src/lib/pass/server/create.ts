import "server-only"
import { resolveMx } from "node:dns/promises"
import { and, desc, eq, gt, inArray, lt, sql } from "drizzle-orm"
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
  customer: { firstName: string; email: string; phone?: string }
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
    email: a.customer.email,
    phone: a.customer.phone ?? "",
    // The terms box is the browser's; the server records the consent itself (`passes.consent`), so only the answers are held to the rule here.
    termsAccepted: true,
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
    .from(s.seasonPass)
    .where(and(eq(s.seasonPass.organizationId, organizationId), eq(s.seasonPass.customerId, customerId), eq(s.seasonPass.status, "pending"), gt(s.seasonPass.createdAt, since)))
  return row?.n ?? 0
}

/** The customer's newest pending pass from the last hour, if any: the one a reload or a return visit resumes. */
export async function newestPendingPass(db: Database, organizationId: string, customerId: string, now: Date) {
  const since = new Date(now.getTime() - 60 * 60 * 1000)
  return db
    .select()
    .from(s.seasonPass)
    .where(and(eq(s.seasonPass.organizationId, organizationId), eq(s.seasonPass.customerId, customerId), eq(s.seasonPass.status, "pending"), gt(s.seasonPass.createdAt, since)))
    .orderBy(desc(s.seasonPass.createdAt))
    .limit(1)
}

/** Removes the pending passes (and their visits) nobody paid for within the hour. Returns how many. Customers and properties stay. */
export async function expirePendingPasses(db: Database, now: Date, minutes = PENDING_PASS_MINUTES): Promise<number> {
  const cutoff = new Date(now.getTime() - minutes * 60_000)
  const stale = await db
    .select({ id: s.seasonPass.id })
    .from(s.seasonPass)
    .where(and(eq(s.seasonPass.status, "pending"), lt(s.seasonPass.createdAt, cutoff)))
  if (stale.length === 0) return 0
  const ids = stale.map((r) => r.id)
  await db.delete(s.visit).where(inArray(s.visit.passId, ids))
  await db.delete(s.passChange).where(inArray(s.passChange.passId, ids))
  await db.delete(s.adminAlert).where(inArray(s.adminAlert.passId, ids))
  await db.delete(s.seasonPass).where(inArray(s.seasonPass.id, ids))
  return ids.length
}
