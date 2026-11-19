import "server-only"
import { timingSafeEqual } from "node:crypto"
import { db } from "@/db"
import { readCronSecret } from "@/lib/env"
import { expirePendingPasses } from "@/lib/pass/server/create"
import { syncTextsPausedAlert } from "@/lib/messaging/paused"
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
  // Home's row about paused texts follows the switch: raised while it is on, removed when it is off. Never stops the drain.
  try {
    await syncTextsPausedAlert(database, new Date())
  } catch {
    console.error("cron: texts-paused row failed")
  }
  const result = await drain(database, handlers)
  return Response.json({ expired, ...result })
}
