"use client"

import { Helper, ConsentBoxes, type StepProps } from "./checkout-steps"
import { StripeCard } from "./StripeCard"

// The card step. Wired (a Stripe key, a session and the two server actions) it asks for the terms first, then opens Stripe's
// embedded form under the boxes; unwired (stories, the prototype) it shows the placeholder and the flow's own button saves.

export interface CardFormProps {
  /** the publishable key; with `clientSecret` it makes the step wired */
  stripeKey?: string
  clientSecret?: string
  onCardComplete?: () => void
}

export function CardStep({ state, set, attempted, stripeKey, clientSecret, onCardComplete }: StepProps & { attempted: boolean } & CardFormProps) {
  const wired = Boolean(stripeKey && clientSecret && onCardComplete)
  // The terms are what the card form was opened with: they stay accepted while it is open, and Back unlocks them. The marketing boxes stay free.
  const locked = wired && state.termsAccepted
  return (
    <>
      {wired ? (
        <>
          <Helper>We charge the card after each visit, at the price you just saw. Nothing is charged today.</Helper>
          <ConsentBoxes state={state} set={set} attempted={attempted} locked={locked} />
          <div className="mt-8" aria-live="polite">
            {state.termsAccepted ? (
              <StripeCard key={clientSecret} publishableKey={stripeKey!} clientSecret={clientSecret!} onComplete={onCardComplete!} />
            ) : (
              <p data-slot="card-form-locked" className="rounded-lg border border-dashed border-border bg-stone p-6 text-center text-muted-foreground">
                Accept the terms above and the card form opens here.
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="rounded-lg border border-dashed border-border bg-stone p-8 text-center text-muted-foreground">Stripe&apos;s card form mounts here. Nothing is charged today.</div>
          <Helper>We charge the card after each visit, at the price you just saw.</Helper>
          <ConsentBoxes state={state} set={set} attempted={attempted} />
        </>
      )}
    </>
  )
}
