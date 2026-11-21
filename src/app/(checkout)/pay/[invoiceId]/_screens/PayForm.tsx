"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"

/** What the pay page's action answers when it could not open the card form: the sentence to show. It redirects to Stripe when it can. */
export type PayAction = () => Promise<{ message: string } | undefined | void>

/** The one-tap payment with the card on file: the button's words and what pressing it does. */
export interface SavedCardPay {
  label: string
  action: PayAction
}

/**
 * The pay button. It runs the action (a server action in the live page, a stub in stories), which redirects to Stripe's card form
 * on success; a problem comes back as one sentence under the button. Pressed once, it waits: a second press cannot open a second form.
 * A customer with a card on file (`saved`) gets that as the one filled button, "Pay $115 with Visa ending 4242", and the card form
 * as a plain outline button under it, "Use a different card" (Hannah, Nov 21 2026).
 */
export function PayForm({ label, action, saved }: { label: string; action: PayAction; saved?: SavedCardPay }) {
  const [problem, run, pending] = useActionState(async () => (await action()) ?? null, null)
  const [savedProblem, runSaved, savedPending] = useActionState(async () => (await saved?.action()) ?? null, null)
  const busy = pending || savedPending
  return (
    <div data-slot="pay-form" className="space-y-3">
      {saved && (
        <form action={runSaved}>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {savedPending ? "Processing" : saved.label}
          </Button>
        </form>
      )}
      <form action={run}>
        <Button type="submit" size="lg" variant={saved ? "outline" : "default"} className="w-full" disabled={busy}>
          {pending ? "Opening the card form" : saved ? "Use a different card" : label}
        </Button>
      </form>
      <p role="alert" className="text-sm text-destructive empty:hidden">
        {savedProblem?.message ?? problem?.message}
      </p>
    </div>
  )
}
