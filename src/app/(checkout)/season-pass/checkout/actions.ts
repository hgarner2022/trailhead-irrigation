"use server"

import { headers } from "next/headers"
import { after } from "next/server"
import { db } from "@/db"
import { ctxForCheckout } from "@/lib/admin/api-ctx"
import { beginCheckoutWith, finishCheckoutWith, offerDaysWith, renewCheckoutWith, type CheckoutDeps } from "@/lib/pass/server/checkout"
import { drain } from "@/lib/queue"
import { handlers } from "@/lib/queue/handlers"
import { getStripe } from "@/lib/stripe/client"
import { clientIpFrom } from "./client-ip"
import type { Offers } from "./_screens/checkout-days"
import type { BeginResult, OfferQuery, RenewalPrefill, CheckoutConsent, CheckoutSubmission, FinishResult } from "./_screens/checkout-submit"

// The checkout's two server actions. They run as the anonymous `public` principal, so they can only reach the four handlers
// that principal is allowed (src/api/core/call.ts), and both return a problem for the screen instead of throwing. The
// logic is in src/lib/pass/server/checkout.ts so it is tested without Next.

const deps = async (): Promise<CheckoutDeps> => {
  const ip = clientIpFrom(await headers())
  return { ctx: (passId, renewPassId) => ctxForCheckout(passId, { clientIp: ip, renewPassId }), stripe: getStripe }
}

/** Leaving the contact step: the pending pass and the card form's Stripe session. Nothing is charged. */
export async function beginCheckout(submission: CheckoutSubmission, passId?: string): Promise<BeginResult> {
  return beginCheckoutWith(await deps(), submission, passId)
}

/** The card step finished: activate the pass, then queue the onboarding and the confirmation after the response. */
export async function finishCheckout(passId: string, sessionId: string, consent: CheckoutConsent, firstName?: string): Promise<FinishResult> {
  const result = await finishCheckoutWith(await deps(), passId, sessionId, consent, firstName)
  if (result.ok) after(() => drain(db(), handlers))
  return result
}

/** The "Your days" step: the open days to offer for each visit at this address. An empty answer is a possible answer; the step says Ryan sets those days. */
export async function offerDays(query: OfferQuery): Promise<Offers> {
  return offerDaysWith(await deps(), query)
}

/** Reserving the next season on the card on file: the pass, its days and the confirmation. Queues the messages after the response. */
export async function renewCheckout(renewal: Pick<RenewalPrefill, "passId" | "token">, submission: CheckoutSubmission): Promise<FinishResult> {
  // Loaded when needed: the session library is only for the renewal's own-customer check.
  const { auth } = await import("@/auth")
  const principal = (await auth())?.principal ?? null
  const result = await renewCheckoutWith(await deps(), renewal, submission, principal)
  if (result.ok) after(() => drain(db(), handlers))
  return result
}
