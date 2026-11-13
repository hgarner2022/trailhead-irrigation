// Test helper (no server-only: tests import it). A hand-written stand-in for the Stripe methods the app calls: nothing
// reaches the network and no key is real. `webhooks` is the SDK's own, which only does local signature maths.
import Stripe from "stripe"
import { vi } from "vitest"

export const WEBHOOK_SECRET = "whsec_test_secret"
export const signer = new Stripe("sk_test_stub").webhooks

export interface StubCard { brand?: string; last4?: string; expMonth?: number; expYear?: number; pm?: string; customer?: string }

/** A complete setup session as `checkout.sessions.retrieve` returns it with the card expanded. */
export const completeSession = (id: string, metadata: Record<string, string>, card: StubCard = {}) => ({
  id,
  status: "complete",
  customer: card.customer ?? "cus_1",
  metadata,
  setup_intent: { payment_method: { id: card.pm ?? "pm_new", card: { brand: card.brand ?? "visa", last4: card.last4 ?? "4242", exp_month: card.expMonth ?? 8, exp_year: card.expYear ?? 2030 } } },
})

let intents = 0
export function stubStripe(over: { sessions?: Record<string, unknown>; charge?: () => unknown | Promise<unknown> } = {}) {
  const calls = {
    sessionCreate: vi.fn(async (params: Record<string, unknown>) => ({ id: `cs_${calls.sessionCreate.mock.calls.length}`, url: "https://checkout.stripe.test/c/pay", client_secret: "cs_secret", ...params })),
    sessionRetrieve: vi.fn(async (id: string) => {
      const s = over.sessions?.[id]
      if (!s) throw new Error(`no session ${id}`)
      return s
    }),
    customersUpdate: vi.fn(async () => ({})),
    detach: vi.fn(async () => ({})),
    paymentIntentsCreate: vi.fn<(params: Record<string, unknown>, options: { idempotencyKey: string }) => Promise<unknown>>(async () =>
      over.charge ? over.charge() : { id: `pi_ok_${++intents}`, status: "succeeded", latest_charge: { receipt_url: "https://pay.stripe.test/receipt/1" } },
    ),
  }
  const stripe = {
    checkout: { sessions: { create: calls.sessionCreate, retrieve: calls.sessionRetrieve } },
    customers: { update: calls.customersUpdate },
    paymentMethods: { detach: calls.detach },
    paymentIntents: { create: calls.paymentIntentsCreate },
    webhooks: signer,
  } as unknown as Stripe
  return { stripe, calls }
}

let declines = 0
export const declined = (id = `pi_declined_${++declines}`) => Object.assign(new Error("Your card was declined."), { type: "StripeCardError", payment_intent: { id } })
