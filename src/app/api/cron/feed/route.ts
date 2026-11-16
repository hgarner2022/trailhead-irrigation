import "server-only"
import { timingSafeEqual } from "node:crypto"
import { db } from "@/db"
import { readCronSecret } from "@/lib/env"
import { peopleWithFeed } from "@/lib/jobber-feed"
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
 * Queue a `jobber-feed-sync` for each person with a calendar URL (one per person per five-minute slot) and drain.
 * Vercel's Hobby plan allows two cron jobs, once a day each, so `vercel.json` schedules only `/api/cron/daily`, which
 * runs this first (early morning in
 * Colorado); on a Pro plan set it to every five minutes. The route can also be hit by hand with the secret.
 */
export async function GET(request: Request) {
  if (!authorised(request)) return Response.json({ error: "unauthorized" }, { status: 401 })
  const database = db()
  const slot = Math.floor(Date.now() / 300_000)
  const people = await peopleWithFeed(database)
  for (const p of people) await enqueue(database, p.organizationId, "jobber-feed-sync", `${p.id}:${slot}`, { personId: p.id })
  const result = await drain(database, handlers)
  return Response.json({ people: people.length, ...result })
}
