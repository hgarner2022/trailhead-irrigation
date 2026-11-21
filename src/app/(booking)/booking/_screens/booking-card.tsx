"use client"

import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CARD_SAVED, cardCharged } from "./booking-form-model"

// The card step (Hannah, Nov 21 2026: "they never collected their card"; a repair gets one too). Stripe's own setup form, drawn: it saves a card and charges nothing, and no real card field is ever
// on this screen, so the boxes are drawn, hidden from assistive tech, and a small note says so. Pressing Save card (the flow's button) keeps the card; the stories always keep the same Visa. A Season Pass
// needs the card because it is billed after each visit; a one-off may put it off with "Not now". The one line says when the card is charged. Pure props, client component.

const BOX = "flex min-h-12 items-center rounded-lg border border-border bg-background px-4 text-base text-muted-foreground"

export interface BookingCardProps {
  /** the card is already kept: "Visa ending 4242" instead of the form */
  saved: boolean
  /** a Season Pass needs the card; a one-off may say "Not now" */
  pass: boolean
  onSkip: () => void
}

export function BookingCard({ saved, pass, onSkip }: BookingCardProps) {
  return (
    <div data-slot="booking-card" className="space-y-6">
      {saved ? (
        <p data-slot="card-saved" className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-4 text-lg text-foreground">
          <Check aria-hidden className="size-5 shrink-0 text-success" />
          {CARD_SAVED}
        </p>
      ) : (
        <div data-slot="card-form" className="space-y-3">
          <p className="text-sm font-medium text-foreground">Card information</p>
          <div className="grid gap-2" aria-hidden>
            <div className={BOX}>1234 1234 1234 1234</div>
            <div className="grid grid-cols-2 gap-2">
              <div className={BOX}>MM / YY</div>
              <div className={BOX}>CVC</div>
            </div>
          </div>
          <p data-slot="card-drawn" className="rounded-md border border-dashed border-border bg-stone px-3 py-2 text-sm text-muted-foreground">
            Stripe&apos;s card form is drawn here. No card is entered.
          </p>
        </div>
      )}
      <p data-slot="card-charged" className="text-base text-foreground">
        {cardCharged(pass)}
      </p>
      {!pass && !saved && (
        <Button type="button" variant="ghost" onClick={onSkip} className="h-auto min-h-11 px-0 text-base font-semibold text-primary-deep underline underline-offset-2 hover:bg-transparent">
          Not now
        </Button>
      )}
    </div>
  )
}
