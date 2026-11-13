import "server-only"
import { createHash } from "node:crypto"
import { eq } from "drizzle-orm"
import type Stripe from "stripe"
import type { z } from "zod"
import { callApi } from "@/api/core/call"
import type { Ctx } from "@/api/core/context"
import { ApiError } from "@/api/core/errors"
import { passesActivate, passesConsent, passesCreate } from "@/api/v1/passes/handlers"
import type { PassDetail } from "@/api/v1/passes/schemas"
import * as s from "@/db/schema"
import type { BeginResult, CheckoutConsent, CheckoutProblem, CheckoutSubmission, FinishResult } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-submit"
import type { Pass, Town } from "@/lib/admin/types"
import { createSetupSession } from "@/lib/stripe/checkout"

/** The Stripe session lasts 30 minutes; the pending pass is swept after 60. */
// Stripe refuses a session that expires sooner than 30 minutes after IT receives the request. The expiry and the
// idempotency key are both taken from the same ten-minute bucket of the clock, so a customer who presses Continue three
// times inside that bucket sends Stripe the identical request three times and gets the one session back each time
// (Stripe requires identical parameters under one key), and the expiry is never under 35 minutes out.
const BUCKET_MS = 10 * 60 * 1000

/** A short stable digest of a string, for idempotency keys. */
const fingerprint = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 12)
const SESSION_MINUTES = 45

export interface CheckoutDeps {
  /** a context for the public checkout principal; `passId` is the pass `passes.activate` may touch */
  ctx: (passId?: string) => Promise<Ctx>
  stripe: () => Stripe
}

const MESSAGE: Record<CheckoutProblem, string> = {
  "out-of-area": "We work in Erie, Longmont, Louisville, Lafayette, Firestone and Broomfield.",
  "email-unreachable": "We can't find that email's mail server. Check the spelling.",
  "slow-down": "That was a lot of requests at once. Wait a minute and try again.",
  "too-many": "That email has started a few passes in the last hour. Please try again in a bit, or call us.",
  invalid: "Something in the answers needs another look. Go back a step and check them.",
  unavailable: "We couldn't reach the card form just now. Nothing was charged. Please try again.",
  expired: "That card form timed out. Nothing was charged. Press Try again for a fresh one.",
}

/** A refusal the customer caused needs no log; anything else (Stripe, the database) is written to the function log with the checkout step and the pass, so the deploy's logs say where and for whom. */
export function logCheckoutFailure(action: string, step: "contact" | "card", passId: string | undefined, error: unknown): void {
  if (error instanceof ApiError && (error.code === "invalid" || error.code === "unprocessable" || error.code === "rate_limited")) return
  console.error(`${action} failed at the ${step} step (pass ${passId ?? "not made yet"}):`, error instanceof Error ? `${error.name}: ${error.message}` : String(error))
}

/** The reason an API refusal carries (`issues[0]` with path `reason`), as a problem the screen can word; anything else is `unavailable`. */
export function problemOf(error: unknown): { problem: CheckoutProblem; message: string } {
  if (error instanceof ApiError) {
    const reason = error.issues?.find((i) => i.path === "reason")?.message
    if (reason === "out-of-area" || reason === "email-unreachable" || reason === "too-many") return { problem: reason, message: MESSAGE[reason] }
    if (reason === "slow-down") return { problem: "slow-down", message: MESSAGE["slow-down"] }
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
  let known = passId
  try {
    // The terms were accepted at the end of the contact step; without them no pending pass is made.
    if (!f.consent.termsAccepted) return { ok: false, problem: "invalid", message: "Please accept the terms to continue" }
    const ctx = await deps.ctx()
    const pass = await callApi(ctx, passesCreate, createInput(f, passId))
    known = pass.id
    // The snapshot goes on the pending pass now, so an activation Stripe's webhook gets to first (the tab closed after the card was saved) records the same consent.
    await recordConsentWith(deps, pass.id, f.consent)
    const [customer] = await ctx.db.select({ stripeCustomerId: s.customer.stripeCustomerId }).from(s.customer).where(eq(s.customer.id, pass.customerId))
    const bucket = Math.floor(Date.now() / BUCKET_MS) * BUCKET_MS
    const session = await createSetupSession(deps.stripe(), {
      passId: pass.id,
      customerId: customer?.stripeCustomerId,
      email: f.email,
      name: f.firstName,
      expiresAt: Math.floor(bucket / 1000) + SESSION_MINUTES * 60,
      // The key also carries the contact details, so a corrected email or name inside the bucket is a new request, not a 400.
      idempotencyKey: `setup-${pass.id}-${bucket}-${fingerprint(`${f.email}|${f.firstName}`)}`,
    })
    return { ok: true, passId: pass.id, sessionId: session.id, clientSecret: session.clientSecret }
  } catch (error) {
    logCheckoutFailure("beginCheckout", "contact", known, error)
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
    logCheckoutFailure("finishCheckout", "card", passId, error)
    if (await sessionExpired(deps, sessionId)) return { ok: false, problem: "expired", message: MESSAGE.expired }
    return { ok: false, ...problemOf(error) }
  }
}

/** Whether Stripe has expired the card form's session, so the screen opens a new one instead of retrying the old. */
async function sessionExpired(deps: CheckoutDeps, sessionId: string): Promise<boolean> {
  try {
    return (await deps.stripe().checkout.sessions.retrieve(sessionId)).status === "expired"
  } catch {
    return false
  }
}

/**
 * Record the boxes as ticked on the pending pass (when the contact step passes), so an activation that Stripe's webhook gets to first
 * (the tab closed after the card was saved) records the same consent. Best effort; the finishing request carries the boxes too.
 */
export async function recordConsentWith(deps: CheckoutDeps, passId: string, consent: CheckoutConsent): Promise<void> {
  try {
    if (!consent.termsAccepted) return
    const ctx = await deps.ctx(passId)
    const marketingChannels = [...(consent.marketingEmail ? ["email" as const] : []), ...(consent.marketingSms ? ["sms" as const] : [])]
    await callApi(ctx, passesConsent, { id: passId, consent: { termsAccepted: true as const, marketingOptIn: marketingChannels.length > 0, marketingChannels } })
  } catch (error) {
    logCheckoutFailure("recordConsent", "card", passId, error)
  }
}
