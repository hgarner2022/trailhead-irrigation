import "server-only"
import { timingSafeEqual } from "node:crypto"
import { db } from "@/db"
import { readCronSecret } from "@/lib/env"
import { enqueueMissingGeocodes } from "@/lib/geocode"
import { expirePendingPasses } from "@/lib/pass/server/create"
import { drain } from "@/lib/queue"
import { handlers } from "@/lib/queue/handlers"

export const dynamic = "force-dynamic"

function authorised(request: Request): boolean {
  let secret: string
  try { secret = readCronSecret() } catch { return false }
  const given = Buffer.from(request.headers.get("authorization") ?? "")
  const want = Buffer.from(`Bearer ${secret}`)
  return given.length === want.length && timingSafeEqual(given, want)
}

/** Drains the queue again (the `after()` drain after a webhook can fail) and first removes checkouts nobody paid for within the hour. */
export async function GET(request: Request) {
  if (!authorised(request)) return Response.json({ error: "unauthorized" }, { status: 401 })
  const database = db()
  // A purge error must never stop the drain (a constant line only: no customer data in the log).
  let expired = 0
  try {
    expired = await expirePendingPasses(database, new Date())
  } catch {
    console.error("cron: purge of unpaid checkouts failed")
  }
  // Properties with no point yet get a lookup queued (50 a pass); a failure here never stops the drain either.
  let geocoding = 0
  try {
    geocoding = await enqueueMissingGeocodes(database, new Date())
  } catch {
    console.error("cron: queuing property lookups failed")
  }
  const result = await drain(database, handlers)
  return Response.json({ expired, geocoding, ...result })
}
