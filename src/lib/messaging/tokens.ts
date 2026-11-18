import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"
import { readEnv } from "@/lib/env"

type Purpose = "pass-image" | "visit-calendar" | "renew-pass" | "invoice-pay"

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

/** The pass card in an email. New links sign the pass's job id; a link signed over an old pass id still verifies over that id as it arrives and is then resolved (`resolvePassJob`). */
export const passImageUrl = (origin: string, passId: string) => `${origin}/api/pass-image/${passId}?token=${signToken("pass-image", passId)}`
export const visitCalendarUrl = (origin: string, visitId: string) => `${origin}/api/visits/${visitId}/calendar.ics?token=${signToken("visit-calendar", visitId)}`

/** The link that opens the checkout already filled in for a renewal, with the token that stands in for signing in. It opens the checkout for that one pass and nothing else. New links sign the pass's job id; an old link verifies over the old pass id as it arrives. */
export const renewUrl = (origin: string, passId: string) => `${origin}/season-pass/checkout?renew=${passId}&token=${signToken("renew-pass", passId)}`

/** The pay link in an invoice: the pay page for that one invoice, with the token that stands in for signing in. It opens that invoice and nothing else. */
export const payUrl = (origin: string, invoiceId: string) => `${origin}/pay/${invoiceId}?token=${signToken("invoice-pay", invoiceId)}`

/** How long the link in a text about a visit keeps opening that visit's page. */
export const VISIT_LINK_DAYS = 30

const visitLinkSig = (visitId: string, customerId: string, exp: number) => {
  const { API_KEY_PEPPER } = readEnv(["API_KEY_PEPPER"])
  return createHmac("sha256", API_KEY_PEPPER).update(`visit-link:${visitId}:${customerId}:${exp}`).digest("base64url").slice(0, 32)
}

/**
 * The signed token on the link in a customer's text about one visit: `<expiry seconds>.<signature>`, the HMAC over the purpose, the visit id, the
 * customer id and the expiry, so it opens that one visit for that one customer, for 30 days, and nothing else. It stands in for signing in on that
 * visit's page only (`/account/visits/<id>?t=`); a token for one visit never opens another, and a token for another customer never opens this one.
 */
export function signVisitLink(visitId: string, customerId: string, now = new Date()): string {
  const exp = Math.floor(now.getTime() / 1000) + VISIT_LINK_DAYS * 86_400
  return `${exp}.${visitLinkSig(visitId, customerId, exp)}`
}

export function verifyVisitLink(visitId: string, customerId: string, token: string | null | undefined, now = new Date()): boolean {
  if (!token) return false
  const [expText, sig = ""] = token.split(".")
  const exp = Number(expText)
  if (!Number.isInteger(exp) || exp * 1000 < now.getTime()) return false
  const want = Buffer.from(visitLinkSig(visitId, customerId, exp))
  const given = Buffer.from(sig)
  return given.length === want.length && timingSafeEqual(given, want)
}

/** The link in a text about a visit: that visit's page, already signed in as its customer. */
export const visitLinkUrl = (origin: string, visitId: string, customerId: string, now = new Date()) => `${origin}/account/visits/${visitId}?t=${signVisitLink(visitId, customerId, now)}`
