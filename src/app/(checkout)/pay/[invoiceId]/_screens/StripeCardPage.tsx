"use client"

import { useState } from "react"
import { ChevronLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BUSINESS } from "@/emails/format"
import { money, type PayBill } from "./pay-model"

// Stripe's own card page for an invoice, drawn (Hannah, Nov 21 2026: "On the invoice, how do they collect payment? Did you not show the Stripe setup here?"). The pay page's
// button hands the customer to a Stripe Checkout Session in payment mode for the invoice's total; this is that page as the customer meets it: what they are paying and for what,
// the email, the card number, expiry and CVC, Stripe's own unticked "Save my payment method for future use" box, the Pay button and, once pressed, Stripe's
// processing state; then Stripe returns the customer to our Paid page. Never a real card field: the boxes are drawn and say so, and nothing is entered or charged. The
// sentence about how a saved card may be used is Hannah's to write (the quote page's open question), so it is the same marked placeholder, never invented. Prototype
// furniture: the live page has no such screen of ours, it redirects to Stripe. Client component for the box and the pressed state.

export interface StripeCardPageProps {
  bill: Pick<PayBill, "number" | "total" | "serviceName" | "address">
  /** the email Stripe shows, read-only, from the invoice's customer */
  email: string
  /** the customer pressed Pay: `saveCard` is the box as it stood */
  onPay: (o: { saveCard: boolean }) => void
  /** the customer pressed the back arrow: nothing is charged and the invoice is as it was */
  onBack: () => void
  /** draw the page after Pay was pressed: the button reads Processing and nothing can be pressed */
  processing?: boolean
}

const BOX = "flex min-h-11 items-center rounded-md border border-border bg-background px-3 text-base text-muted-foreground"

export function StripeCardPage({ bill, email, onPay, onBack, processing = false }: StripeCardPageProps) {
  const [save, setSave] = useState(false)
  const amount = money(bill.total)
  const what = [bill.serviceName ? `Invoice ${bill.number} for your ${bill.serviceName}` : `Invoice ${bill.number}`, bill.address].filter(Boolean).join(" at ")
  return (
    <main data-slot="stripe-card-page" data-processing={processing || undefined} className="min-h-dvh bg-background">
      <p className="border-b border-dashed border-warning/60 bg-warning/10 px-4 py-2 text-center text-sm text-warning-ink">Stripe&apos;s own page, drawn here as a placeholder. No card is entered and nothing is charged.</p>
      <div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-6 md:grid-cols-2 md:gap-12 md:py-12">
        <section aria-labelledby="stripe-pay-h">
          <button type="button" onClick={onBack} disabled={processing} className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-sm px-2 text-base text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
            <ChevronLeft aria-hidden className="size-4" />
            {BUSINESS.name}
          </button>
          <h1 id="stripe-pay-h" className="mt-4 text-base text-muted-foreground">
            Pay {BUSINESS.name}
          </h1>
          <p className="mt-1 type-figure text-navy">{amount}</p>
          <p className="mt-3 text-base text-muted-foreground">{what}</p>
        </section>
        <section aria-label="Pay with card" className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Email</p>
            <div className={BOX} aria-hidden>
              {email}
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
          <div className="flex min-h-11 items-center gap-3 text-base">
            <input id="stripe-save" type="checkbox" checked={save} disabled={processing} onChange={(e) => setSave(e.target.checked)} className="size-5 shrink-0 accent-primary" />
            <label htmlFor="stripe-save">Save my payment method for future use</label>
          </div>
          <Button type="button" size="lg" className="w-full" disabled={processing} onClick={() => onPay({ saveCard: save })}>
            {processing ? (
              <>
                <Loader2 aria-hidden className="size-4 animate-spin" />
                Processing
              </>
            ) : (
              `Pay ${amount}`
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">Powered by Stripe</p>
        </section>
      </div>
    </main>
  )
}
