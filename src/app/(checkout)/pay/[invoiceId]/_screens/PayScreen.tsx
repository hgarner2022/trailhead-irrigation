import Image from "next/image"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BUSINESS } from "@/emails/format"
import { PayForm, type PayAction } from "./PayForm"
import { dueWords, lineTotal, money, paidWords, payLabel, type PayBill } from "./pay-model"

// The pay page: one bill, as the customer sees it, on a phone first. The Trailhead badge, "Your bill", the frozen lines, the tax
// line only when there is tax, the total, the due day and one button that opens Stripe's card form. A paid bill says when and
// links the receipt; a cancelled one says so. It shows nothing but the bill: no contact details, no other customer, no admin
// data. Pure render from props (the page loads the bill through `invoices.payView`), server component.

export interface PayScreenProps {
  bill: PayBill
  /** opens Stripe's card form (redirects); a stub in stories */
  payAction: PayAction
}

function Lines({ bill }: { bill: PayBill }) {
  return (
    <dl data-slot="pay-lines" className="divide-y divide-border border-y border-border">
      {bill.lines.map((line, i) => (
        <div key={`${line.name}-${i}`} className="flex items-start justify-between gap-4 py-3">
          <div className="min-w-0">
            <dt className="text-base font-medium text-foreground">{line.name}</dt>
            {line.description && <dd className="mt-0.5 text-sm text-muted-foreground">{line.description}</dd>}
            {line.quantity > 1 && <dd className="mt-0.5 text-sm text-muted-foreground">{line.quantity} at {money(line.unitPrice)}</dd>}
          </div>
          <dd className="shrink-0 text-base text-foreground tabular-nums">{money(lineTotal(line))}</dd>
        </div>
      ))}
      {bill.tax > 0 && (
        <div className="flex items-baseline justify-between gap-4 py-3">
          <dt className="text-base text-foreground">Sales tax</dt>
          <dd className="text-base text-foreground tabular-nums">{money(bill.tax)}</dd>
        </div>
      )}
    </dl>
  )
}

function Total({ bill }: { bill: PayBill }) {
  return (
    <div data-slot="pay-total" className="mt-4 flex items-baseline justify-between gap-4">
      <p className="text-base font-medium text-foreground">Total</p>
      <p className="font-display text-4xl leading-none text-navy tabular-nums">{money(bill.total)}</p>
    </div>
  )
}

function Open({ bill, payAction }: PayScreenProps) {
  return (
    <>
      <Lines bill={bill} />
      <Total bill={bill} />
      <p data-slot="pay-due" className={bill.status === "overdue" ? "mt-1 text-right text-sm font-medium text-warning" : "mt-1 text-right text-sm text-muted-foreground"}>
        {dueWords(bill)}
      </p>
      <p className="mt-6 text-sm text-foreground">We keep the card for the visits after this one.</p>
      <div className="mt-3">
        <PayForm label={payLabel(bill)} action={payAction} />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">Paid by check, Venmo or cash already? Nothing to do.</p>
    </>
  )
}

function Paid({ bill }: { bill: PayBill }) {
  return (
    <>
      <Lines bill={bill} />
      <Total bill={bill} />
      <p data-slot="pay-paid" className="mt-6 flex items-center gap-2 text-base font-medium text-positive-deep">
        <CheckCircle2 className="size-5 shrink-0 text-positive" aria-hidden />
        {paidWords(bill)}
      </p>
      {bill.receiptUrl && (
        <Button asChild variant="outline" size="lg" className="mt-4 w-full">
          <a href={bill.receiptUrl}>View the receipt</a>
        </Button>
      )}
    </>
  )
}

function Cancelled() {
  return (
    <div data-slot="pay-cancelled" className="border-y border-border py-6">
      <p className="text-base font-medium text-foreground">This bill was cancelled.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Nothing is due. Questions? Call Ryan at{" "}
        <a href={BUSINESS.phoneTel} className="font-medium text-primary-dark underline underline-offset-2 hover:text-primary-deep">
          {BUSINESS.phone}
        </a>
        .
      </p>
    </div>
  )
}

export function PayScreen({ bill, payAction }: PayScreenProps) {
  return (
    <main data-slot="pay-screen" className="flex min-h-dvh justify-center px-4 py-8 sm:py-12">
      <Card className="h-fit w-full max-w-md">
        <CardContent className="p-5 pt-5 sm:p-8 sm:pt-8">
          <Image src="/images/logo-badge.png" alt="Trailhead Lawn & Irrigation" width={57} height={40} className="h-12 w-auto" priority />
          <h1 className="mt-5 font-display text-4xl leading-none text-navy">Your bill</h1>
          <p className="mt-2 mb-6 text-base text-muted-foreground">
            Hi {bill.firstName}, here is bill {bill.number}.
          </p>
          {bill.status === "cancelled" ? <Cancelled /> : bill.status === "paid" ? <Paid bill={bill} /> : <Open bill={bill} payAction={payAction} />}
        </CardContent>
      </Card>
    </main>
  )
}
