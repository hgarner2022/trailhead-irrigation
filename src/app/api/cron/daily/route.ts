import "server-only"
import { timingSafeEqual } from "node:crypto"
import { db } from "@/db"
import { readAppUrl, readCronSecret } from "@/lib/env"
import { queueCardExpiryMessages } from "@/lib/pass/server/card-expiry"
import { createCardUpdateSession } from "@/lib/stripe/card-update"
import { getStripe } from "@/lib/stripe/client"
import { peopleWithFeed } from "@/lib/jobber-feed"
import { expirePendingPasses } from "@/lib/pass/server/create"
import { drain, enqueue } from "@/lib/queue"
import { handlers } from "@/lib/queue/handlers"
import { daily } from "@/lib/scheduling/server/daily"

export const dynamic = "force-dynamic"

function authorised(request: Request): boolean {
  let secret: string
  try { secret = readCronSecret() } catch { return false }
  const given = Buffer.from(request.headers.get("authorization") ?? "")
  const want = Buffer.from(`Bearer ${secret}`)
  return given.length === want.length && timingSafeEqual(given, want)
}

/**
 * The one scheduled job. Vercel's Hobby plan allows two cron jobs, each once a day, so this route does in order what
 * `/api/cron/feed`, `/api/cron/schedule` and `/api/cron/drain` do on their own: read every person's Jobber calendar feed,
 * run the daily scheduling pass (unclosed visits, day-before texts, due Schedule runs, the crew note), expire unpaid
 * checkouts, queue the card-expiring emails (sixty days ahead), then drain the queue so all of it happens now. Nothing here
 * touches invoices: an overdue invoice sits on Home until someone presses Remind (`invoices.remind`), so no reminder goes out on its own. The three routes stay for running one part by hand with the
 * secret. `vercel.json` runs this at 11:00 UTC, 5 am in Colorado.
 */
export async function GET(request: Request) {
  if (!authorised(request)) return Response.json({ error: "unauthorized" }, { status: 401 })
  const database = db()
  const slot = Math.floor(Date.now() / 300_000)
  const people = await peopleWithFeed(database)
  for (const p of people) await enqueue(database, p.organizationId, "jobber-feed-sync", `${p.id}:${slot}`, { personId: p.id })
  const feed = await drain(database, handlers)
  const schedule = await daily(database)
  // A purge error must never stop the queue work after it (a constant line only: no customer data in the log).
  let expired = 0
  try {
    expired = await expirePendingPasses(database, new Date())
  } catch {
    console.error("cron: purge of unpaid checkouts failed")
  }
  const origin = readAppUrl()
  const cardExpiring = await queueCardExpiryMessages(database, async ({ passId, stripeCustomerId }) => (await createCardUpdateSession(getStripe(), { passId, customerId: stripeCustomerId, origin })).url, origin)
  const drained = await drain(database, handlers)
  return Response.json({ feedPeople: people.length, feed, ...schedule, expired, cardExpiring, ...drained })
}
