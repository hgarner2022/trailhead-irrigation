import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"
import { readEnv } from "@/lib/env"

type Purpose = "pass-image" | "visit-calendar"

/**
 * The signed token on a link in a message: an HMAC of the purpose and the row id with `API_KEY_PEPPER`, so a pass image or a
 * calendar file cannot be fetched by guessing an id, and a token for one purpose never opens another. It does not expire;
 * what it opens is a picture of the customer's own pass or one visit's day.
 */
export function signToken(purpose: Purpose, id: string): string {
  const { API_KEY_PEPPER } = readEnv(["API_KEY_PEPPER"])
  return createHmac("sha256", API_KEY_PEPPER).update(`${purpose}:${id}`).digest("base64url").slice(0, 32)
}

export function verifyToken(purpose: Purpose, id: string, token: string | null): boolean {
  if (!token) return false
  const want = Buffer.from(signToken(purpose, id))
  const given = Buffer.from(token)
  return given.length === want.length && timingSafeEqual(given, want)
}

export const passImageUrl = (origin: string, passId: string) => `${origin}/api/pass-image/${passId}?token=${signToken("pass-image", passId)}`
export const visitCalendarUrl = (origin: string, visitId: string) => `${origin}/api/visits/${visitId}/calendar.ics?token=${signToken("visit-calendar", visitId)}`
