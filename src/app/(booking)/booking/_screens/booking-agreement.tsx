import { AGREEMENT_PLACEHOLDER, RENEWAL_FACTS } from "@/lib/booking/pass-words"

// The Season Pass agreement step (Hannah, Nov 20 2026): the one agreement sentence, which is a clearly marked placeholder until she writes it (never terms from us), and the renewal choice stated as
// facts: the pass auto-renews each season until the customer cancels, a reminder comes before each renewal, the customer cancels in their account, and they pay only for each visit done, after the
// visit. Nothing to tick: the Season Pass terms are accepted with the contact step. Pure props.

export function BookingAgreement() {
  return (
    <div data-slot="booking-agreement" className="space-y-8">
      <div data-slot="agreement-placeholder" className="rounded-lg border border-dashed border-warning/60 bg-warning/10 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Placeholder</p>
        <p className="mt-1 text-base text-foreground">{AGREEMENT_PLACEHOLDER}</p>
      </div>
      <dl data-slot="renewal-facts" className="divide-y divide-border rounded-lg border border-border bg-background">
        {RENEWAL_FACTS.map((f) => (
          <div key={f.label} className="px-4 py-3">
            <dt className="text-sm text-muted-foreground">{f.label}</dt>
            <dd className="mt-0.5 text-base text-foreground">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
