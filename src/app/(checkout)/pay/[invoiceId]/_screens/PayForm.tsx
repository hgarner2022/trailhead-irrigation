"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"

/** What the pay page's action answers when it could not open the card form: the sentence to show. It redirects to Stripe when it can. */
export type PayAction = () => Promise<{ message: string } | undefined | void>

/**
 * The pay button. It runs the action (a server action in the live page, a stub in stories), which redirects to Stripe's card form
 * on success; a problem comes back as one sentence under the button. Pressed once, it waits: a second press cannot open a second form.
 */
export function PayForm({ label, action }: { label: string; action: PayAction }) {
  const [problem, run, pending] = useActionState(async () => (await action()) ?? null, null)
  return (
    <form action={run} data-slot="pay-form">
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Opening the card form" : label}
      </Button>
      <p role="alert" className="mt-3 text-sm text-destructive empty:hidden">
        {problem?.message}
      </p>
    </form>
  )
}
