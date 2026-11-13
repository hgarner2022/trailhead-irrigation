import "server-only"
import { createHmac } from "node:crypto"
import { and, eq, sql } from "drizzle-orm"
import type { Database } from "@/db/types"
import * as s from "@/db/schema"

export const EVENTS = [
  "pass.bought",
  "visit.scheduled",
  "visit.moved",
  "visit.done",
  "charge.succeeded",
  "charge.failed",
  "booking.created",
  "request.received",
  "webhook.test",
] as const
export type EventName = (typeof EVENTS)[number]

/** Base64 HMAC-SHA256 of the body with the endpoint's secret, the scheme Jobber uses. */
export const signBody = (body: string, secret: string) => createHmac("sha256", secret).update(body).digest("base64")

/** One `outbound_event` per active endpoint subscribed to the event, each queued for delivery. Returns how many. */
export async function emitEvent(db: Database, organizationId: string, event: EventName, payload: Record<string, unknown>): Promise<number> {
  const endpoints = await db
    .select({ id: s.webhookEndpoint.id })
    .from(s.webhookEndpoint)
    .where(
      and(
        eq(s.webhookEndpoint.organizationId, organizationId),
        eq(s.webhookEndpoint.active, true),
        sql`${s.webhookEndpoint.events} @> ${JSON.stringify([event])}::jsonb`,
      ),
    )
  for (const endpoint of endpoints) {
    const [row] = await db
      .insert(s.outboundEvent)
      .values({ organizationId, endpointId: endpoint.id, event, payload })
      .returning({ id: s.outboundEvent.id })
    await db
      .insert(s.queueItem)
      .values({ organizationId, kind: "outbound-webhook", key: row!.id, payload: { eventId: row!.id } })
      .onConflictDoNothing()
  }
  return endpoints.length
}

export interface DeliveryResult {
  delivered: boolean
  status?: number
  error?: string
}

/**
 * Posts one stored event to its endpoint and records the attempt. A delivered
 * event is never posted again; a failure is recorded and returned so the
 * queue's backoff can try again.
 */
export async function deliverEvent(db: Database, eventId: string, fetchFn: typeof fetch = fetch): Promise<DeliveryResult> {
  const [row] = await db
    .select({ event: s.outboundEvent, endpoint: s.webhookEndpoint })
    .from(s.outboundEvent)
    .innerJoin(s.webhookEndpoint, eq(s.webhookEndpoint.id, s.outboundEvent.endpointId))
    .where(eq(s.outboundEvent.id, eventId))
  if (!row) return { delivered: false, error: "event not found" }
  if (row.event.deliveredAt) return { delivered: true }
  const body = JSON.stringify({ id: row.event.id, event: row.event.event, created: row.event.createdAt.toISOString(), data: row.event.payload })
  let result: DeliveryResult
  try {
    const res = await fetchFn(row.endpoint.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-trailhead-event": row.event.event,
        "x-trailhead-delivery": row.event.id,
        "x-trailhead-signature": signBody(body, row.endpoint.secret),
      },
      body,
      signal: AbortSignal.timeout(10_000),
    })
    result = res.ok ? { delivered: true, status: res.status } : { delivered: false, status: res.status, error: `endpoint answered ${res.status}` }
  } catch (error) {
    result = { delivered: false, error: error instanceof Error ? error.message : "request failed" }
  }
  await db
    .update(s.outboundEvent)
    .set({ attempts: row.event.attempts + 1, deliveredAt: result.delivered ? new Date() : null, error: result.error ?? null })
    .where(eq(s.outboundEvent.id, eventId))
  return result
}

/** The `outbound-webhook` queue handler: throws on a failed delivery so the queue retries with its backoff. */
export async function handleOutboundWebhook(db: Database, payload: { eventId: string }, fetchFn: typeof fetch = fetch): Promise<void> {
  const result = await deliverEvent(db, payload.eventId, fetchFn)
  if (!result.delivered) throw new Error(result.error ?? "delivery failed")
}
