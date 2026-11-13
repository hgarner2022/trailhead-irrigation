import { formatMoney } from "@/lib/admin/metrics"
import { preferencePhrase } from "@/lib/admin/format"
import { priceOnSale, visitPrice, visitsOnSale } from "@/lib/season-pass"
import type { CheckoutFields } from "./checkout-state"

type Timing = Partial<Pick<CheckoutFields, "turnOnPreference" | "blowoutPreference">>

const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`

/** The line under a visit: the customer's own pick for the two they chose a time for ("Mid October, your preference"), July for the add-on. */
function whenLine(key: "turn-on" | "inspection" | "blowout", timing: Timing): string {
  if (key === "inspection") return "July"
  const preference = key === "turn-on" ? timing.turnOnPreference : timing.blowoutPreference
  return preference ? `${capital(preferencePhrase(key, preference))}, your preference` : key === "turn-on" ? "April to May" : "October"
}

/** What the customer is agreeing to, above the card form: each visit still on sale with its price, the total, and what is charged today. Prices come from src/lib/season-pass.ts. */
export function OrderSummary({ state }: { state: Pick<CheckoutFields, "zones" | "inspection" | "today"> & Partial<Pick<CheckoutFields, "turnOnPreference" | "blowoutPreference">> }) {
  const visits = visitsOnSale(state.inspection, state.today)
  return (
    <section data-slot="checkout-summary" aria-label="Your pass" className="rounded-lg border border-border bg-background p-5 shadow-sm">
      <ul className="grid gap-3">
        {visits.map((visit) => (
          <li key={visit.key} className="flex items-baseline justify-between gap-4">
            <span className="text-base text-foreground">
              {visit.name}
              <span className="block text-sm text-muted-foreground">{whenLine(visit.key, state)}</span>
            </span>
            <span className="font-display text-xl tabular-nums text-navy">{formatMoney(visitPrice(visit, state.zones))}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex items-baseline justify-between gap-4 border-t border-border pt-4 text-base font-semibold text-foreground">
        <span>Season total</span>
        <span data-slot="checkout-summary-total" className="font-display text-2xl font-normal tabular-nums text-navy">
          {formatMoney(priceOnSale(state.zones, state.inspection, state.today))}
        </span>
      </p>
      <p className="mt-3 text-base text-muted-foreground">$0 today. We charge the card after each visit.</p>
    </section>
  )
}
