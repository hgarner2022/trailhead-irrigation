import "server-only"
import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { mountainDay, addDays } from "@/api/v1/shared"
import { linesOfVisit, visitPrice } from "@/lib/jobs/lines"
import { baseData } from "@/lib/messaging/data"
import { queueMessage } from "@/lib/messaging/queue"

export const EXPIRY_LEAD_DAYS = 60

/** The last day a card works: the end of its expiry month ("2027-07" is July 31). */
export function lastDayOf(cardExpires: string): string {
  const [y, m] = cardExpires.split("-").map(Number) as [number, number]
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
export const expiryWords = (cardExpires: string) => {
  const [y, m] = cardExpires.split("-").map(Number) as [number, number]
  return `${MONTHS[m - 1]} ${y}`
}

/**
 * Sixty days before a card on file expires, when the season's October (the blowout window's end) still lies beyond it, one
 * `card-expiring` message with the update link. Once per customer and card (`expiry-<customer>-<expires>`), so the daily run repeats
 * nothing and two passes on one customer send one email; a replaced card has a new expiry and can warn again. A customer with
 * every visit on their active passes done or cancelled is left alone.
 * `makeLink` makes the 24-hour Stripe update link (injected so tests never reach Stripe). Returns how many were queued.
 */
export async function queueCardExpiryMessages(db: Database, makeLink: (input: { passId: string; stripeCustomerId: string }) => Promise<string>, origin: string, now = new Date()): Promise<number> {
  const today = mountainDay(now)
  // Passes that are sold and not cancelled; the job's season and number are its own columns.
  const rows = await db
    .select({ job: s.job, customer: s.customer })
    .from(s.job)
    .innerJoin(s.customer, eq(s.customer.id, s.job.customerId))
    .where(and(isNotNull(s.job.season), isNotNull(s.job.soldOn), isNull(s.job.cancelledAt), isNotNull(s.customer.cardExpires)))
    .orderBy(asc(s.job.createdAt))
  // One customer, one card, one email: the customer's newest active pass speaks for them.
  const byCustomer = new Map<string, { job: typeof s.job.$inferSelect; customer: typeof s.customer.$inferSelect; season: number; jobIds: string[] }>()
  for (const { job, customer } of rows) {
    const held = byCustomer.get(customer.id)
    byCustomer.set(customer.id, { job, customer, season: job.season!, jobIds: [...(held?.jobIds ?? []), job.id] })
  }
  let queued = 0
  for (const { job, customer, season, jobIds } of byCustomer.values()) {
    const expires = customer.cardExpires!
    const lastDay = lastDayOf(expires)
    if (today < addDays(lastDay, -EXPIRY_LEAD_DAYS) || today > lastDay) continue
    if (lastDay >= `${season}-10-31`) continue
    const [visits, lines] = await Promise.all([
      db.select({ id: s.visit.id, status: s.visit.status }).from(s.visit).where(inArray(s.visit.jobId, jobIds)),
      db.select().from(s.lineItem).where(and(eq(s.lineItem.organizationId, job.organizationId), inArray(s.lineItem.jobId, jobIds))),
    ])
    const left = visits.filter((v) => !["completed", "cancelled", "skipped"].includes(v.status)).reduce((sum, v) => sum + visitPrice(linesOfVisit(lines, v.id)), 0)
    if (left === 0) continue
    const key = `expiry-${customer.id}-${expires}`
    const link = customer.stripeCustomerId ? await makeLink({ passId: job.id, stripeCustomerId: customer.stripeCustomerId }) : null
    if (await queueMessage(db, { organizationId: job.organizationId, customerId: customer.id, kind: "card-expiring", key, data: { ...baseData(origin, customer), passNumber: job.passNumber ?? "", cardState: `expires in ${expiryWords(expires)}`, left, updateUrl: link } })) queued++
  }
  return queued
}
