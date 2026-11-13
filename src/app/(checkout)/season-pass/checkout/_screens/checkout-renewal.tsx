"use client"

import { ConsentBoxes } from "./checkout-consent"
import type { CheckoutState } from "./checkout-state"
import type { RenewalPrefill } from "./checkout-submit"
import type { StepProps } from "./checkout-steps"

/** The answers a renewal starts with, read off the last pass: the address, access note, zones, add-on and contact. The customer sees and can change each. */
export function renewalAnswers(r: RenewalPrefill): Partial<CheckoutState> {
  return {
    address: r.place.label,
    place: r.place,
    town: r.place.town as CheckoutState["town"],
    access: r.needsCustomerHome ? "no" : "yes",
    accessNote: r.accessNote,
    zones: r.zones,
    inspection: r.inspection,
    firstName: r.firstName,
    email: r.email,
    phone: r.phone,
    skipCard: Boolean(r.card),
  }
}

/** Under the days of a renewal: the card on file with a way to change it, and the terms, since there is no contact step to accept them on. */
export function RenewalExtras({ state, set, renewal, attempted }: StepProps & { renewal: RenewalPrefill; attempted: boolean }) {
  return (
    <div data-slot="renewal-extras">
      {renewal.card && (
        <p data-slot="renewal-card" className="text-base text-foreground">
          {`Card ending ${renewal.card.last4} on file, `}
          <a href="/account/pass" target="_blank" rel="noreferrer" className="font-medium text-primary-dark underline underline-offset-2 hover:text-primary-deep">
            change it
            <span className="sr-only"> (opens your pass page in a new tab)</span>
          </a>
          .
        </p>
      )}
      <ConsentBoxes state={state} set={set} attempted={attempted} />
    </div>
  )
}
