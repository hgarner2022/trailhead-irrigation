"use client"

import { useEffect, useRef, useState } from "react"
import { PayScreen } from "./PayScreen"
import { StripeCardPage } from "./StripeCardPage"
import type { PayBill } from "./pay-model"

// How an invoice is paid, in one place (Hannah, Nov 21 2026): the pay page with its summary, then, on the card button, Stripe's card page (drawn), then Stripe's
// processing moment, then `onPaid`, which is where the Paid page opens. A bill that carries a card on file offers it as one tap on the pay page and goes straight
// to the processing moment; "Use a different card" goes to the card page. Back from the card page is the invoice as it was. Prototype furniture: the live pay page
// redirects to Stripe from its server action and Stripe returns to `/pay/<id>/paid`; nothing is entered, charged or sent here. `processingMs` is the length of the
// processing moment (0 in tests).

export interface PayFlowProps {
  bill: PayBill
  /** the email Stripe shows on its card page */
  email: string
  /** the payment went through: open the Paid page */
  onPaid: (o: { saveCard: boolean; withSaved: boolean }) => void
  processingMs?: number
}

export function PayFlow({ bill, email, onPaid, processingMs = 1400 }: PayFlowProps) {
  const [step, setStep] = useState<"invoice" | "card" | "processing">("invoice")
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const settle = (o: { saveCard: boolean; withSaved: boolean }) => new Promise<void>((resolve) => {
    timer.current = setTimeout(() => {
      onPaid(o)
      resolve()
    }, processingMs)
  })
  if (step !== "invoice")
    return (
      <StripeCardPage
        bill={bill}
        email={email}
        processing={step === "processing"}
        onBack={() => setStep("invoice")}
        onPay={(o) => {
          setStep("processing")
          void settle({ saveCard: o.saveCard, withSaved: false })
        }}
      />
    )
  return <PayScreen bill={bill} payAction={async () => void setStep("card")} payWithSavedAction={bill.savedCard ? () => settle({ saveCard: false, withSaved: true }) : undefined} />
}
