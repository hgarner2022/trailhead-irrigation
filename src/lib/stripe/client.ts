import "server-only"
import Stripe from "stripe"
import { readStripeSecretKey } from "@/lib/env"

export type { Stripe }

let client: Stripe | undefined

/** The Stripe client, built on first use from `STRIPE_SECRET_KEY` so importing this module never needs the environment. Everything else takes `stripe` as an argument, and tests pass a stub. */
export function getStripe(): Stripe {
  client ??= new Stripe(readStripeSecretKey())
  return client
}

/** Dollars (whole, as the database holds them) to the cents Stripe wants. Cents never leave this folder. */
export const toCents = (dollars: number) => Math.round(dollars * 100)

/** A Stripe card error, which is a decline and not a fault: recognised by its `type` so a stub can throw one without the SDK. */
export function isCardError(error: unknown): error is { type: "StripeCardError"; message: string; payment_intent?: { id?: string } } {
  return typeof error === "object" && error !== null && (error as { type?: unknown }).type === "StripeCardError"
}
