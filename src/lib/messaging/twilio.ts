import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"
import { readOptionalEnv } from "@/lib/env"

export interface OutgoingText {
  to: string
  body: string
}

export type TextSender = (message: OutgoingText) => Promise<{ id: string }>

export interface TwilioEnv {
  accountSid: string
  authToken: string
  from: string
}

/** Twilio is optional until the owner finishes its registration: null while any of the three names is unset. */
export function readTwilioEnv(): TwilioEnv | null {
  const accountSid = readOptionalEnv("TWILIO_ACCOUNT_SID")
  const authToken = readOptionalEnv("TWILIO_AUTH_TOKEN")
  const from = readOptionalEnv("TWILIO_FROM")
  return accountSid && authToken && from ? { accountSid, authToken, from } : null
}

/** One text through Twilio's REST API (basic auth, form body): no SDK. */
export const sendTextNow: TextSender = async ({ to, body }) => {
  const env = readTwilioEnv()
  if (!env) throw new Error("Twilio is not configured")
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.accountSid}/Messages.json`, {
    method: "POST",
    headers: { authorization: `Basic ${Buffer.from(`${env.accountSid}:${env.authToken}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: env.from, Body: body }),
  })
  const json = (await response.json().catch(() => ({}))) as { sid?: string; message?: string }
  if (!response.ok || !json.sid) throw new Error(`Twilio failed: ${json.message ?? response.status}`)
  return { id: json.sid }
}

/** Twilio's `X-Twilio-Signature`: base64 HMAC-SHA1 of the full URL plus every form field, name then value, sorted by name. */
export function twilioSignature(url: string, params: Record<string, string>, authToken: string): string {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("")
  return createHmac("sha1", authToken).update(data).digest("base64")
}

export function validateTwilioSignature(url: string, params: Record<string, string>, signature: string | null, authToken: string): boolean {
  if (!signature) return false
  const given = Buffer.from(signature)
  const want = Buffer.from(twilioSignature(url, params, authToken))
  return given.length === want.length && timingSafeEqual(given, want)
}
