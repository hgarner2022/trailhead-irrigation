import "server-only"
import { after } from "next/server"
import { db } from "@/db"
import { readStripeWebhookSecret } from "@/lib/env"
import { drain } from "@/lib/queue"
import { handlers } from "@/lib/queue/handlers"
import { getStripe } from "@/lib/stripe/client"
import { receiveStripeEvent, WEBHOOK_NOT_CONFIGURED } from "@/lib/stripe/webhook"

export const dynamic = "force-dynamic"

/**
 * Stripe's webhook endpoint. Verifies the signature on the raw body, queues the event on its id (a replay queues
 * nothing), answers 200 inside the request and drains the queue after the response; the cron drains it again if that fails.
 */
export async function POST(request: Request) {
  // No secret yet (a deploy before the endpoint exists in Stripe): answer 503 so Stripe retries, before touching Stripe or the database.
  if (!readStripeWebhookSecret()) return Response.json({ error: WEBHOOK_NOT_CONFIGURED }, { status: 503 })
  const database = db()
  const result = await receiveStripeEvent(database, getStripe(), readStripeWebhookSecret(), await request.text(), request.headers.get("stripe-signature"))
  if (result.status !== 200) return Response.json({ error: result.error }, { status: result.status })
  if (result.queued) after(() => drain(database, handlers))
  return Response.json({ received: true })
}
