"use client"

import { useId } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { StepProps } from "./checkout-steps"

const LINK = "font-medium text-primary-dark underline underline-offset-2 hover:text-primary-deep"

function TermsLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={LINK}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

/** The id of the line that says the terms are still unticked; the flow's button points at it with `aria-describedby`. */
export const CONSENT_PROBLEM_ID = "checkout-consent-problem"
export const CONSENT_PROBLEM = "Please accept the terms to continue"

// The Season Pass section of the terms page (version 2026-11, TERMS_VERSION); the second link is the terms as a whole.
const SEASON_PASS_TERMS_HREF = "/terms#season-pass"

const MARKETING = [
  { key: "marketingEmail", label: "Seasonal tips and offers by email", note: "You can stop any time. Visit reminders and receipts are sent either way." },
  { key: "marketingSms", label: "Seasonal tips and offers by text", note: "Message frequency varies. Msg and data rates may apply. Reply STOP to opt out. Consent is not a condition of purchase." },
] as const

/** The consent boxes that end the contact step, so Continue is the moment of acceptance: the terms, required, then email and text marketing, each off until ticked. */
export function ConsentBoxes({ state, set, attempted }: StepProps & { attempted: boolean }) {
  const id = useId()
  const problem = attempted && !state.termsAccepted
  return (
    <div data-slot="checkout-consent" className="mt-8 grid gap-5">
      <div>
        <div className="flex items-start gap-3">
          <Checkbox
            id={`${id}-terms`}
            name="termsAccepted"
            checked={state.termsAccepted}
            onCheckedChange={(checked) => set("termsAccepted", checked === true)}
            aria-invalid={problem || undefined}
            aria-describedby={problem ? CONSENT_PROBLEM_ID : undefined}
            className="mt-1 size-5"
          />
          <Label htmlFor={`${id}-terms`} className="inline text-base font-normal leading-snug text-foreground">
            I accept the <TermsLink href={SEASON_PASS_TERMS_HREF}>Season Pass terms</TermsLink> and the <TermsLink href="/terms">Trailhead terms of service</TermsLink>
          </Label>
        </div>
        {problem && (
          <p id={CONSENT_PROBLEM_ID} className="mt-2 pl-8 text-sm text-destructive">
            {CONSENT_PROBLEM}
          </p>
        )}
      </div>
      {MARKETING.map((box) => (
        <div key={box.key} className="flex items-start gap-3">
          <Checkbox
            id={`${id}-${box.key}`}
            name={box.key}
            checked={state[box.key]}
            onCheckedChange={(checked) => set(box.key, checked === true)}
            aria-describedby={`${id}-${box.key}-note`}
            className="mt-1 size-5"
          />
          <div>
            <Label htmlFor={`${id}-${box.key}`} className="inline text-base font-normal leading-snug text-foreground">
              {box.label}
            </Label>
            <p id={`${id}-${box.key}-note`} className="mt-1 text-sm text-muted-foreground">
              {box.note}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

