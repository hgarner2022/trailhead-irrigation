import { Receipt } from "lucide-react"
import { paymentLine } from "@/lib/portal/words"

// One payment in a job's Money block, with its receipt: "Paid Nov 3, card $145" and a Receipt link on every payment. A card payment's receipt is
// Stripe's page (opens in a new tab); any other payment (check, Venmo, cash) has no card receipt, so the link goes to the receipt page built from the
// payment row. A refund reads "Refunded Nov 5, card $145" and has no receipt. Pure props, server-safe.

export interface ReceiptLineProps {
  amount: number
  method: string
  paidOn: string | null
  /** "1043": a check number or Venmo handle the customer gave */
  reference?: string | null
  /** the card receipt, when the payment has one */
  receiptUrl?: string | null
  /** the printable receipt page for this payment, used when there is no card receipt */
  printHref: string
}

export function ReceiptLine({ amount, method, paidOn, reference, receiptUrl, printHref }: ReceiptLineProps) {
  const refund = amount < 0
  return (
    <li data-slot="receipt-line" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
      <p className="text-base text-foreground">
        {paymentLine({ amount, method, paidOn })}
        {reference && !refund && <span className="text-muted-foreground">{` · ${reference}`}</span>}
      </p>
      {!refund && (
        <a
          href={receiptUrl ?? printHref}
          {...(receiptUrl ? { target: "_blank", rel: "noreferrer" } : {})}
          className="inline-flex items-center gap-1.5 text-base font-semibold text-primary-deep underline underline-offset-2"
        >
          <Receipt className="size-4" aria-hidden />
          Receipt
        </a>
      )}
    </li>
  )
}
