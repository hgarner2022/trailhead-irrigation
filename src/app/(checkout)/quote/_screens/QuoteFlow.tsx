"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { QuoteScreen } from "./QuoteScreen"
import { StripePlaceholder } from "./StripePlaceholder"
import { money, quoteOf, type QuoteStatus, type QuoteView } from "./quote-view"

// The customer's way through a quote, with its steps held in one place (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.6; Hannah's answers 3 to 7 of
// Nov 20 2026): the quote, Approve (with a deposit it opens Stripe's card page and the quote counts only when the payment goes through; a closed card page
// leaves it as it was; with no deposit it is one tap), the Approved page with its optional Add a card (Stripe's setup page), and Decline, which confirms first.
// Prototype furniture: Stripe's pages are drawn, nothing is charged and nothing is sent. `onDone` tells the walkthrough what the customer chose.

export type QuoteStep = "quote" | "card" | "approved" | "save-card" | "declined"
export interface QuoteDone {
  outcome: "approved" | "declined"
  depositPaid?: boolean
  cardSaved?: boolean
}

export interface QuoteFlowProps {
  quote: QuoteView
  /** the page it opens on; a quote that no longer works opens its own page */
  start?: QuoteStep | Exclude<QuoteStatus, "open" | "approved" | "declined">
  /** the decline confirmation a story opens at once */
  confirmingDecline?: boolean
  onDone?: (done: QuoteDone) => void
}

export function QuoteFlow({ quote, start = "quote", confirmingDecline = false, onDone }: QuoteFlowProps) {
  const [step, setStep] = useState<QuoteStep | "replaced" | "old-link">(start)
  const [asking, setAsking] = useState(confirmingDecline)
  const [depositPaid, setDepositPaid] = useState(start === "approved" && quote.deposit !== null)
  const [cardSaved, setCardSaved] = useState<string | null>(null)
  const approve = () => {
    if (quote.deposit) setStep("card")
    else {
      setStep("approved")
      onDone?.({ outcome: "approved" })
    }
  }
  if (step === "card" || step === "save-card") {
    return (
      <StripePlaceholder
        mode={step === "card" ? "deposit" : "save-card"}
        quote={quote}
        onBack={() => setStep(step === "card" ? "quote" : "approved")}
        onPay={() => {
          if (step === "card") {
            setDepositPaid(true)
            onDone?.({ outcome: "approved", depositPaid: true })
          } else {
            setCardSaved("Visa ending 4242")
            onDone?.({ outcome: "approved", cardSaved: true })
          }
          setStep("approved")
        }}
      />
    )
  }
  const status: QuoteStatus = step === "quote" ? "open" : step
  return (
    <>
      <QuoteScreen quote={quote} status={status} depositPaid={depositPaid} cardSaved={cardSaved} onApprove={approve} onDecline={() => setAsking(true)} onAddCard={() => setStep("save-card")} />
      {asking && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setAsking(false)}
          title="Decline this quote?"
          message={`You are declining the quote for ${quoteOf(quote)}, ${money(quote.total)}. Ryan is told.`}
          confirmLabel="Decline the quote"
          destructive
          slot="decline-quote-dialog"
          onConfirm={async () => (setStep("declined"), onDone?.({ outcome: "declined" }), { ok: true })}
        />
      )}
    </>
  )
}
