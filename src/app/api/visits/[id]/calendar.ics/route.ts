import "server-only"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import * as s from "@/db/schema"
import { icsFile } from "@/emails/calendar"
import { readAppUrl } from "@/lib/env"
import { loadVisitFacts } from "@/lib/messaging/data"
import { verifyToken } from "@/lib/messaging/tokens"

export const dynamic = "force-dynamic"

/**
 * One visit as an .ics file, so Apple Calendar and Outlook can add it. The `token` is signed with `API_KEY_PEPPER` for this
 * visit and stays good when the visit moves: the file always carries its current day. A wrong token, a missing visit or a
 * visit with no day is a plain 404.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!verifyToken("visit-calendar", id, new URL(request.url).searchParams.get("token"))) return new Response("Not found", { status: 404 })
  const origin = readAppUrl()
  const database = db()
  const [row] = await database.select({ id: s.visit.id }).from(s.visit).where(eq(s.visit.id, id))
  const facts = row && (await loadVisitFacts(database, id, origin))
  if (!facts) return new Response("Not found", { status: 404 })
  return new Response(icsFile(facts, new Date(), `${origin}/account/pass`), {
    headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="trailhead-${facts.day}.ics"`, "cache-control": "private, no-store" },
  })
}
