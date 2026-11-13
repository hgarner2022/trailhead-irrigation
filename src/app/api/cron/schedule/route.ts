import "server-only"
import { timingSafeEqual } from "node:crypto"
import { db } from "@/db"
import { readCronSecret } from "@/lib/env"
import { drain } from "@/lib/queue"
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
 * The daily scheduling run: flag unclosed visits, queue tomorrow's day-before texts, a Schedule run for any window now inside
 * its lead weeks, and the crew note; then drain the queue so the run happens now. Vercel Hobby allows two cron jobs, once a day
 * each, so `vercel.json` schedules only `/api/cron/daily`, which runs this at 11:00 UTC (5 am in Colorado); this route
 * can also be hit by hand with the secret.
 */
export async function GET(request: Request) {
  if (!authorised(request)) return Response.json({ error: "unauthorized" }, { status: 401 })
  const database = db()
  const result = await daily(database)
  const drained = await drain(database, handlers)
  return Response.json({ ...result, ...drained })
}
