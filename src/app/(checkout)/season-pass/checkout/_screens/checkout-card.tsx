"use client"

import type { StepProps } from "./checkout-steps"
import { StripeCard } from "./StripeCard"
import { OrderSummary } from "./checkout-summary"

// The card step: the order summary, then Stripe's embedded form when wired (a Stripe key, a session and the two server actions);
// unwired (stories, the prototype) the placeholder, and the flow's own button saves. The terms were accepted on the contact step.

export interface CardFormProps {
  /** the publishable key; with `clientSecret` it makes the step wired */
  stripeKey?: string
  clientSecret?: string
  onCardComplete?: () => void
}

export function CardStep({ state, stripeKey, clientSecret, onCardComplete }: StepProps & CardFormProps) {
  const wired = Boolean(stripeKey && clientSecret && onCardComplete)
  return (
    <>
      <OrderSummary state={state} />
      {wired ? (
        <div className="mt-8" aria-live="polite">
          <StripeCard key={clientSecret} publishableKey={stripeKey!} clientSecret={clientSecret!} onComplete={onCardComplete!} />
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-stone p-8 text-center text-muted-foreground">Stripe&apos;s card form mounts here.</div>
      )}
    </>
  )
}
