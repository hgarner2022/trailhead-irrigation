"use client"

import { Card, CardContent } from "@/components/ui/card"
import { OrderSummary } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-summary"
import type { CheckoutFields } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { dayAtTime } from "@/lib/booking/day-time"
import type { DayTimePick } from "@/lib/booking/day-time"
import type { ServiceEntry } from "@/lib/booking/services"
import { money, priceFor, townOf } from "./booking-model"

// The card step (design section 4.6): a short summary of what is booked and what is charged, then Stripe's embedded form, described here and not embedded (nothing is wired). Nothing is
// charged today. The cancellation words sit under the summary, the card is for a tap and a receipt (never a deposit), and a one-off may skip it. A refused card puts Stripe's line in
// the form and ours under it.

const LINK = "font-medium text-primary-dark underline underline-offset-2 hover:text-primary-deep"

export function CardStep({ service, fields, picks, failure, onSkip }: { service: ServiceEntry; fields: CheckoutFields; picks: Record<string, DayTimePick>; failure?: string; onSkip?: () => void }) {
  const pick = picks.visit
  return (
    <div data-slot="booking-card" className="space-y-6">
      {service.kind === "pass" ? (
        <OrderSummary state={fields} />
      ) : (
        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="flex items-baseline justify-between gap-4 text-base text-foreground">
              <span>
                {service.name}
                {service.perZone && `, ${fields.zones} zones`}
              </span>
              <span className="font-display text-2xl tabular-nums text-navy">{money(priceFor(service, fields.zones))}</span>
            </p>
            {pick?.day && pick.start && <p className="text-base text-muted-foreground">{`${dayAtTime(pick.day, pick.start)}, ${townOf(fields) ?? ""}`}</p>}
            <p className="border-t border-border pt-3 text-base text-foreground">$0 today. We charge the card after Ryan finishes the visit.</p>
            {service.key === "repair" && <p className="text-base text-muted-foreground">A repair visit is $145. If Ryan finds bigger work, he quotes it first and you decide.</p>}
          </CardContent>
        </Card>
      )}
      <p className="text-base text-muted-foreground">So your visit is paid in a tap and your receipt arrives by email. Change your day from your Trailhead account until the day before.</p>
      <div data-slot="stripe-placeholder" className="rounded-lg border border-dashed border-border bg-stone p-6 text-base text-muted-foreground">
        <p className="font-semibold text-foreground">Stripe&apos;s card form goes here.</p>
        <p className="mt-1">Apple Pay or Google Pay where the phone has them, else card number, expiry and CVC. The button under it reads Save card and book.</p>
      </div>
      {failure && (
        <div role="alert" className="space-y-1 text-base text-destructive">
          <p>Your card was declined.</p>
          <p>{failure}</p>
        </div>
      )}
      {service.kind !== "pass" && (
        <p className="text-base text-muted-foreground">
          <button type="button" onClick={onSkip} className={`${LINK} inline-flex min-h-11 cursor-pointer items-center`}>
            Pay another way after the visit
          </button>
          {" Ryan asks how you'd like to pay when he's done: card, check, Venmo or cash."}
        </p>
      )}
    </div>
  )
}
