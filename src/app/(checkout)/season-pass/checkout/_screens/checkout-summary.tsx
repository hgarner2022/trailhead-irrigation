import { formatMoney } from "@/lib/admin/metrics"
import { preferencePhrase } from "@/lib/admin/format"
import { priceOnSale, visitPrice, visitsOnSale } from "@/lib/season-pass"
import type { CheckoutFields } from "./checkout-state"
import { PriceLines, PriceTotal } from "@/components/blocks/PriceLines"

type Timing = Partial<Pick<CheckoutFields, "turnOnPreference" | "blowoutPreference">>

const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`

/** The line under a visit: the customer's own pick for the two they chose a time for ("Mid October, your preference"), July for the add-on. */
function whenLine(key: "turn-on" | "inspection" | "blowout", timing: Timing): string {
  if (key === "inspection") return "July"
  const preference = key === "turn-on" ? timing.turnOnPreference : timing.blowoutPreference
  return preference ? `${capital(preferencePhrase(key, preference))}, your preference` : key === "turn-on" ? "April to May" : "October"
}

/** What the customer is agreeing to, above the card form: each visit still on sale with its price, the total, and what is charged today. Prices come from src/lib/season-pass.ts. The Season Pass checkout stays untaxed: a pass's lines are always written with taxable false (`insertLines` with `untaxed`, whatever the service row says), so no price here adds sales tax. */
export function OrderSummary({ state }: { state: Pick<CheckoutFields, "zones" | "inspection" | "today"> & Partial<Pick<CheckoutFields, "turnOnPreference" | "blowoutPreference">> }) {
  const visits = visitsOnSale(state.inspection, state.today)
  return (
    <section data-slot="checkout-summary" aria-label="Your pass" className="rounded-lg border border-border bg-background p-5 shadow-sm">
      <PriceLines className="border-t-0" lines={visits.map((visit) => ({ name: visit.name, value: formatMoney(visitPrice(visit, state.zones)), notes: [whenLine(visit.key, state)] }))} />
      <PriceTotal label="Season total" valueSlot="checkout-summary-total" value={formatMoney(priceOnSale(state.zones, state.inspection, state.today))} />
      <p className="mt-3 text-base text-muted-foreground">$0 today. We charge the card after each visit.</p>
    </section>
  )
}
