"use client"

import { useState } from "react"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { money, type QuoteView } from "./quote-view"

// Stripe's own card page, drawn (docs/plans/2026-11-20-requests-and-quotes-research.md, "Deposits and card on file at approval"; Hannah's answers 5 and 6 of
// Nov 20 2026). The quote page hands the customer to it when Approve has a deposit: a Checkout Session in payment mode for exactly the deposit, with
// Stripe's own unticked "Save my payment method for future use" box, and the quote counts as approved only when the payment succeeds. After Approve with
// no deposit the Approved page's optional "Add a card" opens Stripe's setup page. Never a real card field: the boxes are drawn and say so, and nothing is
// entered or charged. The sentence about how a saved card may be used is Hannah's to write, so it is a marked placeholder. Client component for the box.

export interface StripePlaceholderProps {
  mode: "deposit" | "save-card"
  quote: QuoteView
  /** the customer pressed Pay (or Save card) */
  onPay: (o: { saveCard: boolean }) => void
  /** the customer closed the page: back to the quote, nothing approved and nothing charged */
  onBack: () => void
}

const BOX = "flex min-h-11 items-center rounded-md border border-border bg-background px-3 text-base text-muted-foreground"

export function StripePlaceholder({ mode, quote, onPay, onBack }: StripePlaceholderProps) {
  const [save, setSave] = useState(false)
  const deposit = mode === "deposit"
  const amount = deposit ? money(quote.deposit ?? 0) : null
  return (
    <main data-slot="stripe-placeholder" data-mode={mode} className="min-h-dvh bg-background">
      <p className="border-b border-dashed border-warning/60 bg-warning/10 px-4 py-2 text-center text-sm text-warning-ink">Stripe&apos;s own page, drawn here as a placeholder. No card is entered and nothing is charged.</p>
      <div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-6 md:grid-cols-2 md:gap-12 md:py-12">
        <section aria-labelledby="stripe-summary-h">
          <button type="button" onClick={onBack} className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-sm px-2 text-base text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
            <ChevronLeft aria-hidden className="size-4" />
            Trailhead Lawn &amp; Irrigation
          </button>
          <h1 id="stripe-summary-h" className="mt-4 text-base text-muted-foreground">
            {deposit ? `Pay Trailhead Lawn & Irrigation` : "Save a card with Trailhead Lawn & Irrigation"}
          </h1>
          <p className="mt-1 font-display text-5xl leading-none text-navy tabular-nums">{amount ?? "No charge"}</p>
          <p className="mt-3 text-base text-muted-foreground">{deposit ? `Deposit for quote ${quote.number}` : `For ${quote.firstName}, ${quote.address}`}</p>
        </section>
        <section aria-label={deposit ? "Pay with card" : "Save a card"} className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Email</p>
            <div className={BOX} aria-hidden>
              {quote.email}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Card information</p>
            <div className="grid gap-2" aria-hidden>
              <div className={BOX}>1234 1234 1234 1234</div>
              <div className="grid grid-cols-2 gap-2">
                <div className={BOX}>MM / YY</div>
                <div className={BOX}>CVC</div>
              </div>
            </div>
          </div>
          {deposit ? (
            <div className="flex min-h-11 items-center gap-3 text-base">
              <input id="stripe-save" type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="size-5 shrink-0 accent-primary" />
              <label htmlFor="stripe-save">Save my payment method for future use</label>
            </div>
          ) : null}
          <Button type="button" size="lg" className="w-full" onClick={() => onPay({ saveCard: deposit ? save : true })}>
            {deposit ? `Pay ${amount}` : "Save card"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">Powered by Stripe</p>
        </section>
      </div>
    </main>
  )
}
