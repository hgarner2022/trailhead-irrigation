import "server-only"
import { timingSafeEqual } from "node:crypto"
import { db } from "@/db"
import { readCronSecret } from "@/lib/env"
import { trucksWithFeed } from "@/lib/jobber-feed"
import { drain, enqueue } from "@/lib/queue"
import { handlers } from "@/lib/queue/handlers"

export const dynamic = "force-dynamic"

function authorised(request: Request): boolean {
  let secret: string
  try { secret = readCronSecret() } catch { return false }
  const given = Buffer.from(request.headers.get("authorization") ?? "")
  const want = Buffer.from(`Bearer ${secret}`)
  return given.length === want.length && timingSafeEqual(given, want)
}

/**
 * Queue a `jobber-feed-sync` for each truck with a calendar URL (one per truck per five-minute slot) and drain.
 * Vercel's Hobby plan runs a cron once a day at most, so `vercel.json` schedules this at 12:00 UTC (early morning in
 * Colorado); on a Pro plan set it to every five minutes. The route can also be hit by hand with the secret.
 */
export async function GET(request: Request) {
  if (!authorised(request)) return Response.json({ error: "unauthorized" }, { status: 401 })
  const database = db()
  const slot = Math.floor(Date.now() / 300_000)
  const trucks = await trucksWithFeed(database)
  for (const t of trucks) await enqueue(database, t.organizationId, "jobber-feed-sync", `${t.id}:${slot}`, { truckId: t.id })
  const result = await drain(database, handlers)
  return Response.json({ trucks: trucks.length, ...result })
}
