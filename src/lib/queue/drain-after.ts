import "server-only"
import { after } from "next/server"
import { db } from "@/db"
import { drain } from "@/lib/queue"
import { handlers } from "@/lib/queue/handlers"

/**
 * Drains the queue once the response has gone out, so what an action queued (a text, a charge, a card link, a receipt)
 * happens now and not at the daily cron (owner, 16 Nov: "nothing is really happening"). The checkout and the Stripe
 * webhook already do this; every admin action, customer action, API route and MCP tool call goes through here too.
 * Outside a request (a test, a script) `after` throws, and the queue is left for the cron, which is what tests expect.
 */
export function drainAfter(): void {
  try {
    after(() => drain(db(), handlers).catch((error) => console.error("drain after response failed", error)))
  } catch {
    // not inside a request: nothing to schedule
  }
}
