import "server-only"
import { db } from "@/db"
import { readAppUrl } from "@/lib/env"
import { handleInboundText } from "@/lib/messaging/inbound"
import { readTwilioEnv, validateTwilioSignature } from "@/lib/messaging/twilio"

export const dynamic = "force-dynamic"

const EMPTY = '<?xml version="1.0" encoding="UTF-8"?><Response/>'
const xml = (status: number) => new Response(EMPTY, { status, headers: { "content-type": "text/xml" } })

/**
 * Twilio's inbound webhook. Messages are one-way, so the only thing read is STOP or START (a consent row each); every
 * other text is ignored. The signature is checked against the public URL; an unsigned or wrong request gets 403, and
 * 503 while Twilio is not configured. The reply is empty: Twilio's Advanced Opt-Out answers STOP and HELP itself.
 */
export async function POST(request: Request) {
  const env = readTwilioEnv()
  if (!env) return xml(503)
  const form = await request.formData()
  const params: Record<string, string> = {}
  for (const [key, value] of form.entries()) if (typeof value === "string") params[key] = value
  if (!validateTwilioSignature(`${readAppUrl()}/api/webhooks/twilio`, params, request.headers.get("x-twilio-signature"), env.authToken)) return xml(403)
  if (params.From && params.Body) await handleInboundText(db(), params.From, params.Body)
  return xml(200)
}
