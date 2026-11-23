"use client"

import { useId, useState } from "react"
import { ContactPreference, type ContactChannel } from "@/components/blocks/ContactPreference"
import { FormRow } from "@/components/blocks/FormRow"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { emailSuggestion } from "@/lib/email-check"
import { cn } from "@/lib/utils"
import type { CheckoutFields } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { TERMS_PROBLEM, contactProblem } from "./booking-form-model"

// The contact step: first and last name, email, phone (labels above, one column, a problem written as help under the field once the customer leaves it or presses Continue), then how we
// reach them (text, email or both, asked once here and read everywhere after), then two groups that never mix: the required line that accepts the terms, and under a hairline the one
// optional box, "Send me tips and offers from Trailhead by email", unticked. A request for a quote has no terms line. Pure props, client component.

const LINK = "font-medium text-primary-dark underline underline-offset-2 hover:text-primary-deep"
const FIELD = "h-12 rounded-lg bg-background px-4 text-base shadow-sm"

const FIELDS = [
  { key: "firstName", label: "First name", type: "text", autoComplete: "given-name", inputMode: undefined, half: true },
  { key: "lastName", label: "Last name", type: "text", autoComplete: "family-name", inputMode: undefined, half: true },
  { key: "email", label: "Email", type: "email", autoComplete: "email", inputMode: "email", half: false },
  { key: "phone", label: "Phone", type: "tel", autoComplete: "tel", inputMode: "tel", half: false },
] as const

export interface BookingContactProps {
  fields: CheckoutFields
  set: <K extends keyof CheckoutFields>(field: K, value: CheckoutFields[K]) => void
  channel: ContactChannel
  onChannel: (c: ContactChannel) => void
  attempted: boolean
  /** a request for a quote has no terms line */
  terms: boolean
}

export function BookingContact({ fields, set, channel, onChannel, attempted, terms }: BookingContactProps) {
  const id = useId()
  const [touched, setTouched] = useState<Set<string>>(() => new Set())
  const termsProblem = terms && attempted && !fields.termsAccepted
  return (
    <div data-slot="booking-contact" className="space-y-8">
      <div className="grid grid-cols-2 gap-x-3 gap-y-5">
        {FIELDS.map((field, i) => {
          const problem = contactProblem(field.key, fields[field.key])
          const shown = problem !== null && (attempted || touched.has(field.key))
          const slip = field.key === "email" && !shown ? emailSuggestion(fields.email) : null
          return (
            <div key={field.key} className={cn(!field.half && "col-span-2")}>
              <FormRow label={field.label} error={shown ? (problem ?? undefined) : undefined}>
                <Input
                  name={field.key}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  inputMode={field.inputMode}
                  data-autofocus={i === 0 || undefined}
                  value={fields[field.key]}
                  onChange={(e) => set(field.key, e.target.value)}
                  onBlur={() => setTouched((prev) => new Set(prev).add(field.key))}
                  className={cn(FIELD, shown && "border-destructive")}
                />
              </FormRow>
              {slip && (
                <p data-slot="email-slip" className="mt-1 text-sm text-muted-foreground">
                  Did you mean{" "}
                  <button type="button" onClick={() => set("email", slip)} className={cn(LINK, "inline-flex min-h-11 cursor-pointer items-center")}>
                    {slip}
                  </button>
                  ?
                </p>
              )}
            </div>
          )
        })}
      </div>
      <ContactPreference plain value={channel} onChange={onChannel} name={`${id}-preference`} />
      {terms && (
        <div data-slot="booking-terms" className="border-t border-border pt-6">
          <div className="flex items-start gap-3">
            <Checkbox id={`${id}-terms`} name="termsAccepted" checked={fields.termsAccepted} onCheckedChange={(c) => set("termsAccepted", c === true)} aria-invalid={termsProblem || undefined} aria-describedby={termsProblem ? `${id}-terms-problem` : undefined} className="mt-1 size-5" />
            <Label htmlFor={`${id}-terms`} className="inline text-base font-normal leading-snug text-foreground">
              I accept the{" "}
              <a href="/terms#booking" target="_blank" rel="noreferrer" className={LINK}>
                booking terms<span className="sr-only"> (opens in a new tab)</span>
              </a>{" "}
              and the{" "}
              <a href="/terms" target="_blank" rel="noreferrer" className={LINK}>
                Trailhead terms of service<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Label>
          </div>
          {termsProblem && (
            <p id={`${id}-terms-problem`} role="alert" className="mt-2 pl-8 text-sm text-destructive">
              {TERMS_PROBLEM}
            </p>
          )}
        </div>
      )}
      <div data-slot="booking-marketing" className="flex items-start gap-3 border-t border-border pt-6">
        <Checkbox id={`${id}-marketing`} name="marketingEmail" checked={fields.marketingEmail} onCheckedChange={(c) => set("marketingEmail", c === true)} className="mt-1 size-5" />
        <div>
          <Label htmlFor={`${id}-marketing`} className="inline text-base font-normal leading-snug text-foreground">
            Send me tips and offers from Trailhead by email
          </Label>
        </div>
      </div>
    </div>
  )
}
