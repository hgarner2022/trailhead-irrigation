import "server-only"
import { timingSafeEqual } from "node:crypto"
import { db } from "@/db"
import { readCronSecret } from "@/lib/env"
import { trucksWithFeed } from "@/lib/jobber-feed"
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
 * `/api/cron/feed`, `/api/cron/schedule` and `/api/cron/drain` do on their own: read every truck's Jobber calendar feed,
 * run the daily scheduling pass (unclosed visits, day-before texts, due Schedule runs, the crew note), expire unpaid
 * checkouts, then drain the queue so all of it happens now. The three routes stay for running one part by hand with the
 * secret. `vercel.json` runs this at 11:00 UTC, 5 am in Colorado.
 */
export async function GET(request: Request) {
  if (!authorised(request)) return Response.json({ error: "unauthorized" }, { status: 401 })
  const database = db()
  const slot = Math.floor(Date.now() / 300_000)
  const trucks = await trucksWithFeed(database)
  for (const t of trucks) await enqueue(database, t.organizationId, "jobber-feed-sync", `${t.id}:${slot}`, { truckId: t.id })
  const feed = await drain(database, handlers)
  const schedule = await daily(database)
  const expired = await expirePendingPasses(database, new Date())
  const drained = await drain(database, handlers)
  return Response.json({ feedTrucks: trucks.length, feed, ...schedule, expired, ...drained })
}
