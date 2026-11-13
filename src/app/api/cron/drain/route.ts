import "server-only"
import { timingSafeEqual } from "node:crypto"
import { db } from "@/db"
import { readCronSecret } from "@/lib/env"
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
  const expired = await expirePendingPasses(database, new Date())
  const result = await drain(database, handlers)
  return Response.json({ expired, ...result })
}
