import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import type { ReceiptOutType } from "@/api/v1/portal/schemas"
import { receiptNumber } from "@/emails/format"
import { fullDay, METHOD_PHRASE } from "@/lib/portal/words"
import { PrintButton } from "./PrintButton"

// The printable receipt for one payment, built from the payment row: who paid, for what, how and when. It is the receipt for a check, Venmo or cash
// payment, which has no card receipt; a card payment's page also links the card receipt. The account header and the buttons stay off the paper.

export function ReceiptScreen({ receipt }: { receipt: ReceiptOutType }) {
  const how = METHOD_PHRASE[receipt.method] ?? receipt.method
  const isCheck = receipt.method === "check"
  return (
    <main data-slot="account-receipt" className="mx-auto max-w-xl space-y-4 container-padding-x py-8 print:max-w-none print:p-0">
      <Card className="print:border-0 print:shadow-none">
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="font-display text-3xl leading-none text-navy">Receipt</h1>
              <p className="text-base text-muted-foreground">{receipt.paidOn ? `Paid ${fullDay(receipt.paidOn)}` : "Paid"}</p>
            </div>
            <Image src="/images/logo-badge.png" alt="Trailhead Lawn & Irrigation" width={57} height={40} className="h-10 w-auto" />
          </div>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[8rem_1fr]">
            {/* the same number the receipt email carries, so a customer quoting it to Ryan matches both */}
            <dt className="text-sm font-medium text-muted-foreground">Receipt number</dt>
            <dd data-slot="receipt-number" className="text-base text-foreground">{receiptNumber(receipt.id)}</dd>
            <dt className="text-sm font-medium text-muted-foreground">From</dt>
            <dd className="text-base text-foreground">{`${receipt.business.name}, ${receipt.business.phone}`}</dd>
            <dt className="text-sm font-medium text-muted-foreground">Paid by</dt>
            <dd className="text-base text-foreground">{receipt.customerName}</dd>
            {receipt.address && (
              <>
                <dt className="text-sm font-medium text-muted-foreground">Property</dt>
                <dd className="text-base text-foreground">{receipt.address}</dd>
              </>
            )}
            {receipt.jobName && (
              <>
                <dt className="text-sm font-medium text-muted-foreground">For</dt>
                <dd className="text-base text-foreground">{receipt.jobName}</dd>
              </>
            )}
            <dt className="text-sm font-medium text-muted-foreground">How</dt>
            <dd className="text-base text-foreground">{receipt.reference && !isCheck ? `${how[0]!.toUpperCase()}${how.slice(1)}, ${receipt.reference}` : `${how[0]!.toUpperCase()}${how.slice(1)}`}</dd>
            {isCheck && receipt.reference && (
              <>
                <dt className="text-sm font-medium text-muted-foreground">Check number</dt>
                <dd className="text-base text-foreground">{receipt.reference}</dd>
              </>
            )}
          </dl>
          {receipt.lines.length > 0 && (
            <ul className="divide-y divide-border border-y border-border">
              {receipt.lines.map((l, i) => (
                <li key={i} className="flex items-baseline justify-between gap-4 py-2">
                  <span className="text-base text-foreground">{l.quantity > 1 ? `${l.name} × ${l.quantity}` : l.name}</span>
                  <span className="text-base text-foreground">{`$${l.quantity * l.unitPrice}`}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="flex items-baseline justify-between gap-4 text-xl font-semibold text-foreground">
            <span>Amount paid</span>
            <span>{`$${receipt.amount}`}</span>
          </p>
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center gap-4 print:hidden">
        <PrintButton />
        {receipt.receiptUrl && (
          <a href={receipt.receiptUrl} target="_blank" rel="noreferrer" className="text-base font-semibold text-primary-deep underline underline-offset-2">
            View the card receipt
          </a>
        )}
      </div>
    </main>
  )
}
