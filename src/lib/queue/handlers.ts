import "server-only"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import { readAppUrl } from "@/lib/env"
import { cancelPassTask } from "@/lib/pass/server/cancel"
import { onboardPass } from "@/lib/pass/server/onboard"
import { chargeVisit } from "@/lib/pass/server/charge-visit"
import { sendMessageRow, sendStaffMessage, MAX_ATTEMPTS } from "@/lib/messaging/send"
import { getStripe } from "@/lib/stripe/client"
import { handleStripeEvent } from "@/lib/stripe/webhook"
import { geocodeProperty } from "@/lib/geocode"
import { runSchedule, type RunWindow } from "@/lib/scheduling/server/run"
import { mountainDay } from "@/api/v1/shared"
import { syncTruckFeed } from "@/lib/jobber-feed"
import type Stripe from "stripe"
import type { QueueHandler, QueueKind } from "./index"

/** `jobber-feed-sync`: payload `{ truckId }`; reads that truck's calendar feed into busy blocks. */
export const jobberFeedSync: QueueHandler = async (db, item) => {
  const { truckId } = item.payload as { truckId: string }
  const [truck] = await db.select().from(s.truck).where(eq(s.truck.id, truckId))
  if (truck && truck.organizationId === item.organizationId) await syncTruckFeed(db, truck)
}

/** `geocode`: payload `{ propertyId }`; one Nominatim lookup, cached on the property. */
export const geocode: QueueHandler = async (db, item) => {
  const { propertyId } = item.payload as { propertyId: string }
  await geocodeProperty(db, propertyId)
}

/** `pass-charge`: payload `{ visitId, afterCardUpdate? }`; charges the saved card for one completed pass visit. */
export const passCharge: QueueHandler = async (db, item) => {
  const { visitId, afterCardUpdate } = item.payload as { visitId: string; afterCardUpdate?: boolean }
  await chargeVisit(db, getStripe(), visitId, { origin: readAppUrl(), afterCardUpdate })
}

/** `pass-onboard`: key is the pass id, payload `{ passId }`; raises the Home alert for a new pass (no Jobber call; see `onboardPass`). */
export const passOnboard: QueueHandler = async (db, item) => {
  const { passId } = item.payload as { passId: string }
  await onboardPass(db, passId)
}

/** `pass-cancel`: key is the pass id, payload `{ passId }`; raises the Home alert for a cancelled pass. No Jobber call: the routine removes the Jobber jobs (see `cancelPassTask`). */
export const passCancel: QueueHandler = async (db, item) => {
  const { passId } = item.payload as { passId: string }
  await cancelPassTask(db, passId)
}

/** `stripe-webhook`: key is the Stripe event id, payload `{ event }`, the verified event the route stored. */
export const stripeWebhook: QueueHandler = async (db, item) => {
  const { event } = item.payload as { event: Stripe.Event }
  await handleStripeEvent(db, getStripe(), item.organizationId, event, readAppUrl())
}

/** `schedule-run`: payload `{ window, season?, by? }`; the same run the Schedule button makes (`runSchedule`), for the daily cron. */
export const scheduleRun: QueueHandler = async (db, item) => {
  const { window, season, by } = item.payload as { window: RunWindow; season?: number; by?: string }
  await runSchedule(db, { organizationId: item.organizationId, window, season, today: mountainDay(new Date()), by })
}

/**
 * `message`: payload `{ messageId }` sends that queued `message_log` row through Resend or Twilio (see `sendMessageRow`);
 * payload `{ staff: true, kind, to, data }` sends a note to the office (see `queueStaffMessage`).
 */
export const message: QueueHandler = async (db, item) => {
  const payload = item.payload as { messageId?: string; staff?: boolean; kind?: string; to?: string; data?: Record<string, unknown> }
  if (payload.staff) return sendStaffMessage({ kind: payload.kind!, to: payload.to!, data: payload.data ?? {} })
  await sendMessageRow(db, payload.messageId!, { final: item.attempts >= MAX_ATTEMPTS })
}

export const handlers: Partial<Record<QueueKind, QueueHandler>> = { "jobber-feed-sync": jobberFeedSync, geocode, "pass-charge": passCharge, "pass-onboard": passOnboard, "pass-cancel": passCancel, "stripe-webhook": stripeWebhook, "schedule-run": scheduleRun, message }
