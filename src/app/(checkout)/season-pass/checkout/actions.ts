"use server"

import { after } from "next/server"
import { db } from "@/db"
import { ctxForCheckout } from "@/lib/admin/api-ctx"
import { beginCheckoutWith, finishCheckoutWith, type CheckoutDeps } from "@/lib/pass/server/checkout"
import { drain } from "@/lib/queue"
import { handlers } from "@/lib/queue/handlers"
import { getStripe } from "@/lib/stripe/client"
import type { BeginResult, CheckoutConsent, CheckoutSubmission, FinishResult } from "./_screens/checkout-submit"

// The checkout's two server actions. They run as the anonymous `public` principal, so they can only reach the four handlers
// that principal is allowed (src/api/core/call.ts), and both return a problem for the screen instead of throwing. The
// logic is in src/lib/pass/server/checkout.ts so it is tested without Next.

const deps = (): CheckoutDeps => ({ ctx: (passId) => ctxForCheckout(passId), stripe: getStripe })

/** Leaving the contact step: the pending pass and the card form's Stripe session. Nothing is charged. */
export async function beginCheckout(submission: CheckoutSubmission, passId?: string): Promise<BeginResult> {
  return beginCheckoutWith(deps(), submission, passId)
}

/** The card step finished: activate the pass, then queue the onboarding and the confirmation after the response. */
export async function finishCheckout(passId: string, sessionId: string, consent: CheckoutConsent, firstName?: string): Promise<FinishResult> {
  const result = await finishCheckoutWith(deps(), passId, sessionId, consent, firstName)
  if (result.ok) after(() => drain(db(), handlers))
  return result
}
