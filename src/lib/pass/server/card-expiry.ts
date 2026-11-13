import "server-only"
import { and, eq, isNotNull } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { mountainDay, addDays } from "@/api/v1/shared"
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
 * `card-expiring` message with the update link. Once per pass and card (`expiry-<pass>-<expires>`), so the daily run repeats
 * nothing; a replaced card has a new expiry and can warn again. A pass with every visit done or cancelled is left alone.
 * `makeLink` makes the 24-hour Stripe update link (injected so tests never reach Stripe). Returns how many were queued.
 */
export async function queueCardExpiryMessages(db: Database, makeLink: (input: { passId: string; stripeCustomerId: string }) => Promise<string>, origin: string, now = new Date()): Promise<number> {
  const today = mountainDay(now)
  const rows = await db
    .select({ pass: s.seasonPass, customer: s.customer })
    .from(s.seasonPass)
    .innerJoin(s.customer, eq(s.customer.id, s.seasonPass.customerId))
    .where(and(eq(s.seasonPass.status, "active"), isNotNull(s.seasonPass.cardExpires)))
  let queued = 0
  for (const { pass, customer } of rows) {
    const lastDay = lastDayOf(pass.cardExpires!)
    if (today < addDays(lastDay, -EXPIRY_LEAD_DAYS) || today > lastDay) continue
    if (lastDay >= `${pass.season}-10-31`) continue
    const visits = await db.select({ amount: s.visit.amount, status: s.visit.status }).from(s.visit).where(eq(s.visit.passId, pass.id))
    const left = visits.filter((v) => !["completed", "cancelled", "skipped"].includes(v.status)).reduce((sum, v) => sum + v.amount, 0)
    if (left === 0) continue
    const key = `expiry-${pass.id}-${pass.cardExpires}`
    const link = customer.stripeCustomerId ? await makeLink({ passId: pass.id, stripeCustomerId: customer.stripeCustomerId }) : null
    if (await queueMessage(db, { organizationId: pass.organizationId, customerId: customer.id, kind: "card-expiring", key, data: { ...baseData(origin, customer), passNumber: pass.number, cardState: `expires in ${expiryWords(pass.cardExpires!)}`, left, updateUrl: link } })) queued++
  }
  return queued
}
