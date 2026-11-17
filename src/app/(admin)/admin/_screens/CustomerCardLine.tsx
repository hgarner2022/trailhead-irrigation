"use client"

import { Button } from "@/components/ui/button"
import type { ClientCard } from "@/lib/admin/types"
import type { VisitActions } from "./visit-actions-types"
import { customerCardWords } from "./customers-model"
import { FORM_STATUS, useRunner } from "./use-runner"

/**
 * The customer block's Card line: "Visa ending 4242, expires 08/28" or "No card on file", with Send card link beside it
 * (the link hangs on the customer's newest pass, so a customer with no pass has none). The line itself is plain text.
 */
export function CustomerCardLine({ card, passId, readOnly, actions }: { card: ClientCard | undefined; passId?: string; readOnly: boolean; actions?: VisitActions }) {
  const { pending, error, done, run } = useRunner()
  return (
    <span data-slot="customer-card-line" className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span>{customerCardWords(card)}</span>
      {!readOnly && passId && (
        <Button variant="outline" size="sm" disabled={pending} onClick={() => (actions ? run(() => actions.sendCardUpdateLink(passId), undefined, "Card link sent.") : console.info("send card link", passId))}>
          Send card link
        </Button>
      )}
      <span role="alert" className={`${FORM_STATUS} w-full font-normal ${error ? "text-destructive" : "text-muted-foreground"}`}>
        {error || done}
      </span>
    </span>
  )
}
