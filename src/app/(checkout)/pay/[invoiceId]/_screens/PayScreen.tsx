import Image from "next/image"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BUSINESS } from "@/emails/format"
import { textRyanHref } from "@/lib/portal/words"
import { VisitReport } from "@/components/blocks/VisitReport"
import { PayForm, type PayAction } from "./PayForm"
import { dueWords, introWords, lineTotal, money, paidWords, payLabel, payWithLabel, type PayBill } from "./pay-model"
import { PriceLines, PriceTotal } from "@/components/blocks/PriceLines"

// The pay page: one invoice, as the customer sees it, on a phone first. The Trailhead badge, "Your invoice", the frozen lines, the tax
// line only when there is tax, the total, the due day and one button that opens Stripe's card form. A paid invoice says when and
// links the receipt; a canceled one says so. It shows nothing but the invoice: no contact details, no other customer, no admin
// data. Pure render from props (the page loads the invoice through `invoices.payView`), server component.

export interface PayScreenProps {
  bill: PayBill
  /** opens Stripe's card form (redirects); a stub in stories */
  payAction: PayAction
  /** pays with the card on file in one tap, for a bill that carries `savedCard`; left out where the page cannot (the live page today) */
  payWithSavedAction?: PayAction
}

function Lines({ bill }: { bill: PayBill }) {
  const lines = bill.lines.map((line) => ({ name: line.name, value: money(lineTotal(line)), notes: [line.description, line.quantity > 1 && `${line.quantity} at ${money(line.unitPrice)}`] }))
  return <PriceLines data-slot="pay-lines" lines={bill.tax > 0 ? [...lines, { name: "Tax", value: money(bill.tax) }] : lines} />
}

function Open({ bill, payAction, payWithSavedAction }: PayScreenProps) {
  const saved = bill.savedCard && payWithSavedAction ? { label: payWithLabel(bill, bill.savedCard), action: payWithSavedAction } : undefined
  return (
    <>
      <Lines bill={bill} />
      {bill.report && <VisitReport report={bill.report} className="mt-6" />}
      <PriceTotal
        data-slot="pay-total"
        value={money(bill.total)}
        note={<p data-slot="pay-due" className={bill.status === "overdue" ? "mt-1 text-right type-meta font-medium text-warning" : "mt-1 text-right type-meta text-muted-foreground"}>{dueWords(bill)}</p>}
      />
      {!saved && <p className="mt-6 text-sm text-foreground">You can keep the card for future visits on the next page.</p>}
      <div className={saved ? "mt-6" : "mt-3"}>
        <PayForm label={payLabel(bill)} action={payAction} saved={saved} />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">Paid by check, Venmo or cash already? Nothing to do.</p>
    </>
  )
}

function Paid({ bill }: { bill: PayBill }) {
  return (
    <>
      <Lines bill={bill} />
      {bill.report && <VisitReport report={bill.report} className="mt-6" />}
      <PriceTotal data-slot="pay-total" value={money(bill.total)} />
      <p data-slot="pay-paid" className="mt-6 flex items-center gap-2 text-base font-medium text-positive-deep">
        <Check className="size-5 shrink-0 text-positive" aria-hidden />
        {paidWords(bill)}
      </p>
      {/* The receipt right here (UX audit row 13): the card receipt once Stripe has one, else the customer's visits, where every receipt is. */}
      <Button asChild variant="outline" size="lg" className="mt-4 w-full">
        <a href={bill.receiptUrl ?? "/account/visits"}>View the receipt</a>
      </Button>
      <Button asChild variant="link" size="lg" className="mt-2 w-full font-semibold text-primary-deep underline underline-offset-2">
        <a href="/account">Open your Trailhead account</a>
      </Button>
    </>
  )
}

function Canceled() {
  const link = "font-medium text-primary-dark underline underline-offset-2 hover:text-primary-deep"
  return (
    <div data-slot="pay-cancelled" className="border-y border-border py-6">
      <p className="text-base font-medium text-foreground">This invoice was voided.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {"Nothing is due. "}
        <a href={textRyanHref("Hi Ryan, I have a question about a voided invoice.")} className={link}>
          Text Ryan
        </a>
        {" if you have a question, at "}
        <a href={BUSINESS.phoneTel} className={link}>
          {BUSINESS.phone}
        </a>
        .
      </p>
    </div>
  )
}

export function PayScreen({ bill, payAction, payWithSavedAction }: PayScreenProps) {
  return (
    <main data-slot="pay-screen" className="flex min-h-dvh justify-center px-4 py-8 sm:py-12">
      <Card className="h-fit w-full max-w-md">
        <CardContent className="p-5 pt-5 sm:p-8 sm:pt-8">
          <Image src="/images/logo-badge.png" alt="Trailhead Lawn & Irrigation" width={57} height={40} className="h-12 w-auto" priority />
          <h1 className="mt-5 type-title text-navy">Your invoice</h1>
          <p className="mt-2 mb-6 text-base text-muted-foreground">
            {introWords(bill)}
          </p>
          {bill.status === "cancelled" ? <Canceled /> : bill.status === "paid" ? <Paid bill={bill} /> : <Open bill={bill} payAction={payAction} payWithSavedAction={payWithSavedAction} />}
        </CardContent>
      </Card>
    </main>
  )
}
