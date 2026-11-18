import "server-only"
import { and, asc, desc, eq, gte, isNull } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { recordEvent } from "@/lib/events/record"
import { linesOfVisit, visitPrice } from "@/lib/jobs/lines"
import { loadTaxRule } from "@/lib/money/tax-rule"
import { enqueue } from "@/lib/queue"
import { baseData, loadVisitFacts } from "@/lib/messaging/data"
import { queueMessage, queueStaffMessage } from "@/lib/messaging/queue"
import { passImageUrl } from "@/lib/messaging/tokens"
import { filledLine } from "@/emails/format"
import { kindName } from "./messages"
import { loadPassRecord } from "./record"

export interface PurchaseConsent {
  marketingOptIn: boolean
  marketingChannels: ("email" | "sms")[]
  /** who recorded it: the checkout's card step, or the office reading the terms to the customer (`passes.sell`) */
  source?: "checkout" | "admin"
}

export interface PurchaseExtras {
  /** the fresh card link an office sale paid by card carries in its confirmation, so the customer adds the card from the email */
  cardUpdateUrl?: string | null
  /** who the purchase's consent event is written as: the person or the customer behind the call; `system` when nothing says (a queue task) */
  who?: string
  /** the organization of the caller, when it is known: the pass is looked up inside it */
  organizationId?: string
}

/**
 * Everything that follows a pass turning active (the checkout's card step, a renewal, an office sale), each step safe to repeat
 * (so a retry after a failure part-way repeats nothing): the consent row (terms as accepted now, marketing only for the ticked
 * channels, `sms` only with a phone), the `pass-onboard` task and the queued purchase confirmation. Sending is the messaging
 * layer's job (Phase 12); the email only records what must go.
 */
export async function recordPurchase(db: Database, passId: string, consent: PurchaseConsent | undefined, origin: string, now: Date, extras: PurchaseExtras = {}): Promise<void> {
  const pass = await loadPassRecord(db, passId, extras.organizationId)
  if (!pass) throw new Error(`Pass ${passId} not found`)
  const [row] = await db
    .select({ customer: s.customer, town: s.property.town })
    .from(s.customer)
    .innerJoin(s.property, eq(s.property.id, pass.propertyId))
    .where(eq(s.customer.id, pass.customerId))
  if (!row) throw new Error(`Pass ${passId} not found`)
  const { customer } = row
  const org = pass.organizationId

  if (consent) {
    const channels = consent.marketingChannels.filter((c) => c === "email" || (c === "sms" && Boolean(customer.phone)))
    const [terms] = await db.select({ v: s.organization.termsVersion }).from(s.organization).where(eq(s.organization.id, org))
    const source = consent.source ?? "checkout"
    // Safe to repeat: one purchase consent per pass, found by being recorded after the pass was made.
    const [already] = await db
      .select({ id: s.consent.id })
      .from(s.consent)
      .where(and(eq(s.consent.customerId, customer.id), eq(s.consent.source, source), gte(s.consent.recordedAt, pass.createdAt)))
      .limit(1)
    if (!already) {
      const marketingOptIn = consent.marketingOptIn && channels.length > 0
      const marketingChannels = consent.marketingOptIn ? channels : []
      await db.insert(s.consent).values({ organizationId: org, customerId: customer.id, termsVersion: terms?.v, termsAcceptedAt: now, marketingOptIn, marketingChannels, source, recordedAt: now })
      // Written with the row, inside the same once-per-pass branch, so a repeat adds neither.
      await recordEvent(db, { organizationId: org, about: "job", aboutId: pass.jobId, customerId: customer.id, jobId: pass.jobId, kind: "consent", detail: { marketingOptIn, marketingChannels, source }, who: extras.who ?? "system", at: now })
    }
  }

  await enqueue(db, org, "pass-onboard", pass.jobId, { passId: pass.jobId }, now)

  await queuePurchaseConfirmation(db, pass.jobId, origin, pass.jobId, { ...extras, organizationId: org })
  await queueStaffMessage(db, org, "admin-alert", `new-pass:${pass.jobId}`, { origin, title: `New Season Pass ${pass.number}`, detail: `${customer.firstName} in ${row.town} bought Season Pass ${pass.number}.`, path: `/admin/visits?job=${encodeURIComponent(pass.jobId)}` })
}

/** The purchase confirmation for a pass, with whatever the pass holds today: each visit's day and calendar links, or its window wording, and how the money comes (the card on file, the link to add one, or at each visit). `key` makes it once per purchase; an admin's resend uses a new one. */
export async function queuePurchaseConfirmation(db: Database, passId: string, origin: string, key: string, extras: PurchaseExtras = {}): Promise<boolean> {
  const pass = await loadPassRecord(db, passId, extras.organizationId)
  if (!pass) throw new Error(`Pass ${passId} not found`)
  const [row] = await db
    .select({ customer: s.customer, town: s.property.town, address: s.property.address })
    .from(s.customer)
    .innerJoin(s.property, eq(s.property.id, pass.propertyId))
    .where(eq(s.customer.id, pass.customerId))
  if (!row) throw new Error(`Pass ${passId} not found`)
  const { customer } = row
  const org = pass.organizationId
  const visits = await db.select().from(s.visit).where(eq(s.visit.jobId, pass.jobId))
  const ordered = (["turn-on", "inspection", "blowout"] as const).flatMap((k) => visits.filter((v) => v.kind === k))
  // The days an office sale or a pick had to fill with the next open day: the `visit.day-filled` events of the pass's job, newest first.
  const filled = await db.select().from(s.event).where(and(eq(s.event.organizationId, org), eq(s.event.jobId, pass.jobId), eq(s.event.kind, "visit.day-filled"))).orderBy(desc(s.event.at), desc(s.event.id))
  // What was sold, from the pass job's lines (a pass bought before lines existed has none, and the email leaves the list out).
  const lineRows = await db.select().from(s.lineItem).where(and(eq(s.lineItem.jobId, pass.jobId), isNull(s.lineItem.cancelledAt))).orderBy(asc(s.lineItem.createdAt), asc(s.lineItem.id))
  // A pass's lines are always written untaxed (`insertLines` with `untaxed`), so each visit's amount is its line's price; the rule is still read so a line the office later edits to taxable would show what is charged.
  const rule = await loadTaxRule(db, org)
  const held = []
  for (const v of ordered) {
    const facts = v.scheduledOn ? await loadVisitFacts(db, v.id, origin) : null
    const moved = filled.find((c) => c.visitId === v.id)?.detail as { from?: string; to?: string } | undefined
    held.push({ kind: v.kind, name: kindName(v.kind), amount: visitPrice(linesOfVisit(lineRows, v.id), rule), visit: facts, fallback: "Ryan sets the day and we text it to you.", ...(moved?.from && v.scheduledOn ? { note: filledLine(moved.from, v.scheduledOn) } : {}) })
  }
  const lines = lineRows.map((l) => ({ name: l.name, amount: l.quantity * l.unitPrice }))
  return queueMessage(db, {
    organizationId: org, customerId: customer.id, kind: "purchase-confirmation", key,
    data: { ...baseData(origin, customer), passNumber: pass.number, season: pass.season, town: row.town, address: row.address, passImageUrl: passImageUrl(origin, pass.jobId), visits: held, ...(lines.length ? { lines } : {}), cardLast4: customer.cardLast4, cardUpdateUrl: extras.cardUpdateUrl ?? null },
  })
}
