import "server-only"
import type Stripe from "stripe"
import { isCardError, toCents } from "./client"

export interface ChargeInput {
  customerId: string
  paymentMethodId: string
  /** whole dollars, as the visit holds them */
  amount: number
  visitId: string
  passId: string
  /** 1 for the first try; a retry after a card update is the next number, so Stripe sees a new request */
  attempt: number
  description: string
}

export type ChargeResult =
  | { ok: true; paymentIntentId: string; receiptUrl: string | null }
  | { ok: false; paymentIntentId: string | null; message: string }

/** `visit-<id>-<attempt>`: the same try always sends the same key, so a crash and a retry never charge twice. */
export const chargeIdempotencyKey = (visitId: string, attempt: number) => `visit-${visitId}-${attempt}`

/**
 * One off-session charge of the saved card. A decline comes back as `{ ok: false }`; anything else (network, a bad key)
 * throws so the queue retries with the same idempotency key.
 */
export async function chargeOffSession(stripe: Stripe, input: ChargeInput): Promise<ChargeResult> {
  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: toCents(input.amount),
        currency: "usd",
        customer: input.customerId,
        payment_method: input.paymentMethodId,
        off_session: true,
        confirm: true,
        description: input.description,
        metadata: { visitId: input.visitId, passId: input.passId, attempt: String(input.attempt) },
        expand: ["latest_charge"],
      },
      { idempotencyKey: chargeIdempotencyKey(input.visitId, input.attempt) },
    )
    if (intent.status !== "succeeded") return { ok: false, paymentIntentId: intent.id, message: "The card needs the customer to confirm it" }
    const latest = intent.latest_charge
    return { ok: true, paymentIntentId: intent.id, receiptUrl: typeof latest === "object" && latest ? (latest.receipt_url ?? null) : null }
  } catch (error) {
    if (isCardError(error)) return { ok: false, paymentIntentId: error.payment_intent?.id ?? null, message: error.message }
    throw error
  }
}
