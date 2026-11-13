"use client"

import { useEffect, useMemo, useRef } from "react"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js/pure"

// Stripe's embedded card form, in setup mode: it saves a card and charges nothing. Mounted only on the card step, and only
// once the terms are accepted, so the script loads when the customer is about to use it. `/pure` loads Stripe.js on the
// first `loadStripe` call, not on import, and stories never reach that call (no key is passed), so Storybook stays offline.
// `onComplete` is read through a ref: the provider warns when its options change.

export function StripeCard({ publishableKey, clientSecret, onComplete }: { publishableKey: string; clientSecret: string; onComplete: () => void }) {
  const stripe = useMemo(() => loadStripe(publishableKey), [publishableKey])
  const latest = useRef(onComplete)
  useEffect(() => {
    latest.current = onComplete
  })
  const options = useMemo(() => ({ clientSecret, onComplete: () => latest.current() }), [clientSecret])
  return (
    <div data-slot="stripe-card" className="rounded-lg bg-background p-2 shadow-sm">
      <EmbeddedCheckoutProvider stripe={stripe} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}
