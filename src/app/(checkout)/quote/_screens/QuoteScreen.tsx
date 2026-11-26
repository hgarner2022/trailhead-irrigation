"use client"

import Image from "next/image"
import Link from "next/link"
import { MessageSquareText, Phone } from "lucide-react"
import { Tick } from "@/components/blocks/Tick"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BUSINESS } from "@/emails/format"
import { textRyanHref } from "@/lib/portal/words"
import { approveLabel, money, quoteOf, type QuoteStatus, type QuoteView } from "./quote-view"
import { PriceLines, PriceTotal } from "@/components/blocks/PriceLines"

// The quote page (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.6 and "Deposits and card on file at approval"; Hannah's answers 3 to 7 of
// Nov 20 2026): one quote behind a signed link, on a phone first, built like the pay page. The Trailhead badge, "Your quote", what it includes with its prices, the total,
// the deposit line only when Ryan set one, then Approve and Decline with Text Ryan and Call Ryan beside them. Approve with a deposit goes to Stripe's card page
// and counts only when the payment succeeds; with no deposit it is one tap, and the Approved page offers an optional "Add a card" (never required, never part of
// Approve). The customer reads "quote", never "job", "line" or "stage", and nothing here promises a time, a refund, a reassurance or an expiry. Pure render over
// props: the flow around it (`QuoteFlow`) keeps the steps. Client component only because Decline opens a dialog in the flow.

const LINK = "font-medium text-primary-dark underline underline-offset-2 hover:text-primary-deep"

export interface QuoteScreenProps {
  quote: QuoteView
  status: QuoteStatus
  /** the deposit went through on Stripe's page: the Approved page says so and names the receipt */
  depositPaid?: boolean
  /** a card was added after Approve: "Visa ending 4242" */
  cardSaved?: string | null
  onApprove?: () => void
  onDecline?: () => void
  onAddCard?: () => void
}

function Lines({ quote }: { quote: QuoteView }) {
  return <PriceLines data-slot="quote-lines" lines={quote.lines.map((l) => ({ name: l.name, value: money(l.amount), notes: [l.description] }))} />
}

function Total({ quote, deposit = true }: { quote: QuoteView; deposit?: boolean }) {
  return (
    <>
      <PriceTotal data-slot="quote-total" value={money(quote.total)} />
      {deposit && quote.deposit ? <PriceLines data-slot="quote-deposit" className="mt-4" lines={[{ name: "Deposit due when you approve", value: money(quote.deposit) }]} /> : null}
    </>
  )
}

/** Text Ryan and Call Ryan: the way to a person, beside Approve and Decline. */
function Reach({ quote }: { quote: QuoteView }) {
  return (
    <div data-slot="quote-reach" className="mt-3 grid grid-cols-2 gap-3">
      <Button asChild variant="outline" size="lg">
        <a href={textRyanHref(`Hi Ryan, I have a question about quote ${quote.number} for ${quoteOf(quote)}.`)}>
          <MessageSquareText aria-hidden className="size-4" />
          Text Ryan
        </a>
      </Button>
      <Button asChild variant="outline" size="lg">
        <a href={BUSINESS.phoneTel}>
          <Phone aria-hidden className="size-4" />
          Call Ryan
        </a>
      </Button>
    </div>
  )
}

function Open({ quote, onApprove, onDecline }: Pick<QuoteScreenProps, "quote" | "onApprove" | "onDecline">) {
  return (
    <>
      <Lines quote={quote} />
      <Total quote={quote} />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button type="button" size="lg" className="w-full sm:order-2" onClick={onApprove}>
          {approveLabel(quote)}
        </Button>
        <Button type="button" size="lg" variant="outline" className="w-full sm:order-1" onClick={onDecline}>
          Decline
        </Button>
      </div>
      <Reach quote={quote} />
    </>
  )
}

function Approved({ quote, depositPaid, cardSaved, onAddCard }: Pick<QuoteScreenProps, "quote" | "depositPaid" | "cardSaved" | "onAddCard">) {
  return (
    <>
      <Lines quote={quote} />
      <Total quote={quote} deposit={false} />
      <p data-slot="quote-approved" className="mt-6 flex items-center gap-2 text-base font-medium text-positive-deep">
        <Tick className="size-5 text-current" />
        Approved
      </p>
      {depositPaid && quote.deposit ? (
        <>
          <p data-slot="quote-receipt-line" className="mt-2 text-base text-foreground">
            {`We sent a receipt for your ${money(quote.deposit)} deposit to ${quote.email}.`}
          </p>
          <Button asChild variant="outline" size="lg" className="mt-4 w-full">
            <Link href="/account/visits">View the receipt</Link>
          </Button>
        </>
      ) : cardSaved ? (
        <p data-slot="quote-card-saved" className="mt-2 text-base text-foreground">{`Card added: ${cardSaved}.`}</p>
      ) : (
        <div data-slot="quote-add-card" className="mt-4 border-t border-border pt-4">
          <Button type="button" variant="outline" size="lg" className="w-full" onClick={onAddCard}>
            Add a card
          </Button>
        </div>
      )}
      <Button asChild variant="link" size="lg" className="mt-2 w-full font-semibold text-primary-deep underline underline-offset-2">
        <a href="/account">Open your Trailhead account</a>
      </Button>
    </>
  )
}

function Declined({ quote }: { quote: QuoteView }) {
  return (
    <>
      <div className="border-y border-border py-6" data-slot="quote-declined">
        <p className="text-base font-medium text-foreground">You declined this quote.</p>
        <p className="mt-1 text-sm text-muted-foreground">{`Quote ${quote.number} for ${quoteOf(quote)}, ${money(quote.total)}.`}</p>
      </div>
      <Reach quote={quote} />
    </>
  )
}

function Gone({ title, line, quote }: { title: string; line: string; quote: QuoteView | null }) {
  return (
    <>
      <div className="border-y border-border py-6" data-slot="quote-gone">
        <p className="text-base font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{line}</p>
      </div>
      {quote ? (
        <Reach quote={quote} />
      ) : (
        <div className="mt-6 grid gap-3">
          <Button asChild size="lg" className="w-full">
            <a href="/account">Sign in</a>
          </Button>
          <p className="text-center text-base text-muted-foreground">
            <a href={textRyanHref("Hi Ryan, my quote link did not open.")} className={LINK}>
              Text Ryan
            </a>
            {" or "}
            <a href={BUSINESS.phoneTel} className={LINK}>
              call Ryan
            </a>
            .
          </p>
        </div>
      )}
    </>
  )
}

const HEADLINE: Record<QuoteStatus, string> = { open: "Your quote", approved: "Your quote", declined: "Your quote", replaced: "Your quote", "old-link": "We can't open that quote" }

export function QuoteScreen({ quote, status, depositPaid, cardSaved, onApprove, onDecline, onAddCard }: QuoteScreenProps) {
  return (
    <main data-slot="quote-screen" data-status={status} className="flex min-h-dvh justify-center px-4 py-8 sm:py-12">
      <Card className="h-fit w-full max-w-md">
        <CardContent className="p-5 pt-5 sm:p-8 sm:pt-8">
          <Image src="/images/logo-badge.png" alt="Trailhead Lawn & Irrigation" width={57} height={40} className="h-12 w-auto" priority />
          <h1 className="mt-5 type-title text-navy">{HEADLINE[status]}</h1>
          {status !== "old-link" && (
            <p className="mt-2 mb-6 text-base text-muted-foreground">
              Hi {quote.firstName}, here is quote {quote.number} for {quoteOf(quote)}.
            </p>
          )}
          {status === "open" && <Open quote={quote} onApprove={onApprove} onDecline={onDecline} />}
          {status === "approved" && <Approved quote={quote} depositPaid={depositPaid} cardSaved={cardSaved} onAddCard={onAddCard} />}
          {status === "declined" && <Declined quote={quote} />}
          {status === "replaced" && <Gone title="This quote was replaced." line="Text Ryan or call Ryan with a question." quote={quote} />}
          {status === "old-link" && <Gone title="This quote link is old or wrong." line="Sign in, or text or call Ryan." quote={null} />}
        </CardContent>
      </Card>
    </main>
  )
}
