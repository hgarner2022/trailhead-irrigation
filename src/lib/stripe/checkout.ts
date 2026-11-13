import "server-only"
import type Stripe from "stripe"

export interface SetupSessionInput {
  passId: string
  /** the Stripe customer saved on the customer row, when the person has paid us before */
  customerId?: string | null
  email: string
  name: string
  /** unix seconds; Stripe allows 30 minutes to 24 hours */
  expiresAt: number
  /** the same key for the same pass and time bucket, so submit, submit, submit makes one session (Stripe replays the first answer) */
  idempotencyKey?: string
}

/**
 * The embedded Checkout Session in setup mode that saves a card and charges nothing. `redirect_on_completion: "never"`
 * keeps the customer on our page, which calls `passes.activate` with the session id when the card step finishes.
 * Stripe creates the customer in setup mode when none is passed.
 */
export async function createSetupSession(stripe: Stripe, input: SetupSessionInput): Promise<{ id: string; clientSecret: string }> {
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    // Required by the 2026 API versions even in setup mode (the saved card is charged in dollars later).
    currency: "usd",
    ui_mode: "embedded_page",
    redirect_on_completion: "never",
    expires_at: input.expiresAt,
    ...(input.customerId ? { customer: input.customerId } : { customer_email: input.email }),
    metadata: { purpose: "pass-setup", passId: input.passId, name: input.name },
    setup_intent_data: { metadata: { passId: input.passId } },
  }, input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined)
  if (!session.client_secret) throw new Error("Stripe returned no client secret for the setup session")
  return { id: session.id, clientSecret: session.client_secret }
}

export interface SavedCard {
  customerId: string
  paymentMethodId: string
  brand: string
  last4: string
  /** `YYYY-MM`, which sorts as text against a season's month */
  expires: string
  passId: string | null
  purpose: string | null
}

/** The card a completed setup session saved. Throws when the session is not complete or saved no card. */
export async function paymentMethodFromSession(stripe: Stripe, sessionId: string): Promise<SavedCard> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["setup_intent.payment_method"] })
  if (session.status !== "complete") throw new Error("The card step is not complete")
  const intent = session.setup_intent
  const method = typeof intent === "object" && intent ? intent.payment_method : null
  const customer = typeof session.customer === "string" ? session.customer : session.customer?.id
  if (!method || typeof method === "string" || !method.card || !customer) throw new Error("The session saved no card")
  return {
    customerId: customer,
    paymentMethodId: method.id,
    brand: method.card.brand,
    last4: method.card.last4,
    expires: `${method.card.exp_year}-${String(method.card.exp_month).padStart(2, "0")}`,
    passId: session.metadata?.passId ?? null,
    purpose: session.metadata?.purpose ?? null,
  }
}
