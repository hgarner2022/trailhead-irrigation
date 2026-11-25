"use client"

import { Tick } from "@/components/blocks/Tick"
import { Button } from "@/components/ui/button"
import { CARD_ON_FILE_WORDS } from "@/lib/booking/known-address"
import { CARD_SAVED, cardCharged } from "./booking-form-model"

// The card step (Hannah, Nov 21 2026: "they never collected their card"; a repair gets one too). Stripe's own setup form, drawn: it saves a card and charges nothing, and no real card field is ever
// on this screen, so the boxes are drawn, hidden from assistive tech, and a small note says so. Pressing Save card (the flow's button) keeps the card; the stories always keep the same Visa. A Season Pass
// needs the card because it is billed after each visit; a one-off may put it off with "Not now". The one line says when the card is charged. A repeat customer is recognised by address only (Hannah, Nov 23 2026),
// so the card on file (`onFile`, its brand and last four) is offered here, after the contact step, and only when the email typed there is the one on file; "Use a different card" puts the form back, and
// "Use the card on file" brings the card back. Without a match this step is the same as for a new customer. Pure props, client component.

const BOX = "flex min-h-12 items-center rounded-lg border border-border bg-background px-4 text-base text-muted-foreground"

export interface BookingCardProps {
  /** the card is already kept: "Visa ending 4242" instead of the form */
  saved: boolean
  /** a Season Pass needs the card; a one-off may say "Not now" */
  pass: boolean
  onSkip: () => void
  /** the card on file, "Visa ending 4242", offered only to the email on file; absent for everyone else */
  onFile?: string
  /** the customer chose a different card, so the form shows even though one is on file */
  other?: boolean
  onOther?: (other: boolean) => void
  /** Storybook only: the dashed note that says the card form is drawn. Never in the customer screen. */
  prototype?: boolean
}

/** A text action beside the form ("Use a different card", "Not now"): the button set's `link` variant, underlined, 44px tall. */
const TEXT_ACTION = "h-auto min-h-11 px-0 text-base font-semibold text-primary-deep underline underline-offset-2"

export function BookingCard({ saved, pass, onSkip, onFile, other = false, onOther, prototype = false }: BookingCardProps) {
  const useFile = Boolean(onFile) && !other
  return (
    <div data-slot="booking-card" className="space-y-6">
      {useFile ? (
        <p data-slot="card-on-file" className="flex items-center gap-3 rounded-lg border-2 border-navy bg-background px-4 py-4 type-body text-foreground">
          <Tick className="size-5" />
          <span>
            <span className="block text-sm text-muted-foreground">{CARD_ON_FILE_WORDS.use}</span>
            {onFile}
          </span>
        </p>
      ) : saved ? (
        <p data-slot="card-saved" className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-4 type-body text-foreground">
          <Tick className="size-5" />
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
          {prototype && (
            <p data-slot="card-drawn" className="rounded-md border border-dashed border-border bg-stone px-3 py-2 text-sm text-muted-foreground">
              Stripe&apos;s card form is drawn here. No card is entered.
            </p>
          )}
        </div>
      )}
      {onFile && onOther && (
        <Button type="button" variant="link" onClick={() => onOther(!other)} className={TEXT_ACTION}>
          {other ? CARD_ON_FILE_WORDS.use : CARD_ON_FILE_WORDS.other}
        </Button>
      )}
      <p data-slot="card-charged" className="text-base text-foreground">
        {cardCharged(pass)}
      </p>
      {!pass && !saved && !useFile && (
        <Button type="button" variant="link" onClick={onSkip} className={TEXT_ACTION}>
          Not now
        </Button>
      )}
    </div>
  )
}
