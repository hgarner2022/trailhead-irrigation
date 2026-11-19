import "server-only"
import { db } from "@/db"
import { readAppUrl } from "@/lib/env"
import { recordDeliveryReport } from "@/lib/messaging/delivery-report"
import { readTwilioEnv, validateTwilioSignature } from "@/lib/messaging/twilio"

export const dynamic = "force-dynamic"

/**
 * Twilio's delivery report for a text we sent (the `StatusCallback` on every send). The signature is checked against the public URL like the
 * inbound webhook: an unsigned or wrong request gets 403, and 503 while Twilio is not configured. A report for a sid we do not know answers 200 and
 * records nothing, so Twilio never retries it.
 */
export async function POST(request: Request) {
  const env = readTwilioEnv()
  if (!env) return new Response(null, { status: 503 })
  const form = await request.formData()
  const params: Record<string, string> = {}
  for (const [key, value] of form.entries()) if (typeof value === "string") params[key] = value
  if (!validateTwilioSignature(`${readAppUrl()}/api/webhooks/twilio/status`, params, request.headers.get("x-twilio-signature"), env.authToken)) return new Response(null, { status: 403 })
  await recordDeliveryReport(db(), { sid: params.MessageSid ?? "", status: params.MessageStatus ?? "", errorCode: params.ErrorCode })
  return new Response(null, { status: 200 })
}
