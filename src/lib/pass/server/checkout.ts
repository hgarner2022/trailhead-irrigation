import "server-only"
import { eq } from "drizzle-orm"
import type Stripe from "stripe"
import type { z } from "zod"
import { callApi } from "@/api/core/call"
import type { Ctx } from "@/api/core/context"
import { ApiError } from "@/api/core/errors"
import { passesActivate, passesCreate } from "@/api/v1/passes/handlers"
import type { PassDetail } from "@/api/v1/passes/schemas"
import * as s from "@/db/schema"
import type { BeginResult, CheckoutConsent, CheckoutProblem, CheckoutSubmission, FinishResult } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-submit"
import type { Pass, Town } from "@/lib/admin/types"
import { createSetupSession } from "@/lib/stripe/checkout"

/** The Stripe session lasts 30 minutes; the pending pass is swept after 60. */
const SESSION_MINUTES = 30

export interface CheckoutDeps {
  /** a context for the public checkout principal; `passId` is the pass `passes.activate` may touch */
  ctx: (passId?: string) => Promise<Ctx>
  stripe: () => Stripe
}

const MESSAGE: Record<CheckoutProblem, string> = {
  "out-of-area": "We work in Erie, Longmont, Louisville, Lafayette, Firestone and Broomfield.",
  "email-unreachable": "We can't find that email's mail server. Check the spelling.",
  "too-many": "That email has started a few passes in the last hour. Please try again in a bit, or call us.",
  invalid: "Something in the answers needs another look. Go back a step and check them.",
  unavailable: "We couldn't reach the card form just now. Nothing was charged. Please try again.",
}

/** The reason an API refusal carries (`issues[0]` with path `reason`), as a problem the screen can word; anything else is `unavailable`. */
export function problemOf(error: unknown): { problem: CheckoutProblem; message: string } {
  if (error instanceof ApiError) {
    const reason = error.issues?.find((i) => i.path === "reason")?.message
    if (reason === "out-of-area" || reason === "email-unreachable" || reason === "too-many") return { problem: reason, message: MESSAGE[reason] }
    if (error.code === "invalid" || error.code === "unprocessable") return { problem: "invalid", message: error.code === "unprocessable" ? error.message : MESSAGE.invalid }
  }
  return { problem: "unavailable", message: MESSAGE.unavailable }
}

/** The create call: the checkout's answers as `passes.create` takes them. */
function createInput(f: CheckoutSubmission, passId?: string) {
  return {
    ...(passId ? { passId } : {}),
    customer: { firstName: f.firstName, email: f.email, phone: f.phone },
    property: { address: f.address.line1, town: f.town as Town, state: f.address.state, zip: f.address.zip },
    zones: f.zones,
    inspection: f.inspection,
    turnOnPreference: f.turnOnPreference,
    blowoutPreference: f.blowoutPreference,
    needsCustomerHome: f.needsCustomerHome,
    ...(f.accessNote ? { accessNote: f.accessNote } : {}),
  }
}

/**
 * Leaving the contact step: the pending pass (made, or updated when the customer went back), then the embedded card form's
 * Stripe session in setup mode. Nothing is charged. A refusal comes back as a problem for the screen, never a throw.
 */
export async function beginCheckoutWith(deps: CheckoutDeps, f: CheckoutSubmission, passId?: string): Promise<BeginResult> {
  try {
    const ctx = await deps.ctx()
    const pass = await callApi(ctx, passesCreate, createInput(f, passId))
    const [customer] = await ctx.db.select({ stripeCustomerId: s.customer.stripeCustomerId }).from(s.customer).where(eq(s.customer.id, pass.customerId))
    const session = await createSetupSession(deps.stripe(), {
      passId: pass.id,
      customerId: customer?.stripeCustomerId,
      email: f.email,
      name: f.firstName,
      expiresAt: Math.floor(ctx.now.getTime() / 1000) + SESSION_MINUTES * 60,
    })
    return { ok: true, passId: pass.id, sessionId: session.id, clientSecret: session.clientSecret }
  } catch (error) {
    return { ok: false, ...problemOf(error) }
  }
}

/** The pass the Done step shows, from what `passes.activate` returned. Links to Stripe and Jobber are for the admin and stay empty. */
export function passForDone(d: z.infer<typeof PassDetail>, firstName: string): Pass {
  return {
    id: d.id,
    number: d.number,
    season: d.season,
    clientId: d.customerId,
    firstName: d.firstName || firstName,
    town: d.town,
    zones: d.zones,
    turnOnPreference: d.turnOnPreference,
    blowoutPreference: d.blowoutPreference,
    status: "active",
    visits: d.visits.filter((v) => v.kind === "turn-on" || v.kind === "inspection" || v.kind === "blowout").map((v) => ({ kind: v.kind as "turn-on" | "inspection" | "blowout", window: v.window as "May" | "July" | "October", amount: v.amount })),
    stripeUrl: "",
    jobberUrl: "",
    ...(d.cardLast4 ? { cardLast4: d.cardLast4 } : {}),
    ...(d.cardExpires ? { cardExpires: d.cardExpires } : {}),
    ...(d.consent ? { consent: { termsAcceptedAt: d.consent.termsAcceptedAt ?? d.consent.recordedAt, termsVersion: d.consent.termsVersion ?? "", marketingOptIn: d.consent.marketingOptIn, marketingChannels: d.consent.marketingChannels, source: d.consent.source === "checkout" ? "checkout" : d.consent.source === "admin" ? "admin" : "form", recordedAt: d.consent.recordedAt } } : {}),
    ...(d.needsCustomerHome ? { needsCustomerHome: true } : {}),
  }
}

/**
 * The card step finished: activate the pass from the finished session (the card is read from Stripe, never from the browser),
 * with the consent the customer ticked. The caller drains the queue afterwards.
 */
export async function finishCheckoutWith(deps: CheckoutDeps, passId: string, sessionId: string, consent: CheckoutConsent, firstName = ""): Promise<FinishResult> {
  try {
    if (!consent.termsAccepted) return { ok: false, problem: "invalid", message: "Please accept the terms to continue" }
    const ctx = await deps.ctx(passId)
    const marketingChannels = [...(consent.marketingEmail ? ["email" as const] : []), ...(consent.marketingSms ? ["sms" as const] : [])]
    const detail = await callApi(ctx, passesActivate, { id: passId, setupSessionId: sessionId, consent: { termsAccepted: true as const, marketingOptIn: marketingChannels.length > 0, marketingChannels } })
    return { ok: true, pass: passForDone(detail, firstName) }
  } catch (error) {
    return { ok: false, ...problemOf(error) }
  }
}
