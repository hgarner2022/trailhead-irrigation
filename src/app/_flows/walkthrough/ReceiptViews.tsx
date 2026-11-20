"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ReceiptScreen } from "@/app/(account)/account/_screens/ReceiptScreen"
import { BUSINESS, receiptNumber } from "@/emails/format"
import { fullDay } from "@/lib/portal/words"
import { CARD, PAYMENT_ID, receiptEmailOf, receiptOf, receiptText, type Way } from "./receipt-data"

// The receipt as the customer meets it (Hannah, Nov 19 2026): the text bubble, the email rendered in a frame, and the receipt page (the account's own
// ReceiptScreen; a refund's page is the same card with the refund's words). Shared by the customer walkthrough's Receipts step and the admin
// walkthrough's receipt dialogs and page. Pure props.

export function TextBubble({ body }: { body: string }) {
  return (
    <p data-slot="receipt-text" className="max-w-[19rem] rounded-2xl rounded-bl-sm border border-border bg-stone px-4 py-3 text-sm leading-relaxed text-foreground">
      {body}
    </p>
  )
}

export function EmailFrame({ way, reference, height = 560 }: { way: Way; reference?: string; height?: number }) {
  const e = receiptEmailOf(way, reference)
  return (
    <div data-slot="receipt-email" className="overflow-hidden rounded-lg border border-border bg-card">
      <p className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">{e.subject}</p>
      <iframe title={`Email: ${e.subject}`} srcDoc={e.html} style={{ height }} className="w-full border-0 bg-white" />
    </div>
  )
}

/** A refund's page: the receipt's card with the money going the other way. */
export function RefundPage() {
  return (
    <main data-slot="account-receipt" data-refund className="mx-auto max-w-xl space-y-4 container-padding-x py-8">
      <Card>
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="font-display text-3xl leading-none text-navy">Refund</h1>
              <p className="text-base text-muted-foreground">{`Refunded ${fullDay("2026-11-18")}`}</p>
            </div>
            <Image src="/images/logo-badge.png" alt="Trailhead Lawn & Irrigation" width={57} height={40} className="h-10 w-auto" />
          </div>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[8rem_1fr]">
            <dt className="text-sm font-medium text-muted-foreground">Receipt number</dt>
            <dd className="text-base text-foreground">{receiptNumber(PAYMENT_ID)}</dd>
            <dt className="text-sm font-medium text-muted-foreground">From</dt>
            <dd className="text-base text-foreground">{`${BUSINESS.name}, ${BUSINESS.phone}`}</dd>
            <dt className="text-sm font-medium text-muted-foreground">Refunded to</dt>
            <dd className="text-base text-foreground">{CARD}</dd>
            <dt className="text-sm font-medium text-muted-foreground">For</dt>
            <dd className="text-base text-foreground">Sprinkler repair visit, 480 Briggs St, Erie</dd>
          </dl>
          <p className="flex items-baseline justify-between gap-4 text-xl font-semibold text-foreground">
            <span>Amount refunded</span>
            <span>$145</span>
          </p>
          <p className="text-base text-muted-foreground">It can take 5 to 10 days to show on your statement.</p>
        </CardContent>
      </Card>
    </main>
  )
}

/** The receipt page inside another page: its own <main> becomes a plain div, so the prototype never holds one landmark inside another. */
export function ReceiptPage({ way, reference }: { way: Way; reference?: string }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    box.current?.querySelectorAll("main").forEach((m) => {
      const plain = document.createElement("div")
      plain.className = m.className
      plain.setAttribute("data-slot", m.getAttribute("data-slot") ?? "account-receipt")
      while (m.firstChild) plain.appendChild(m.firstChild)
      m.replaceWith(plain)
    })
  }, [way])
  return <div ref={box}>{way === "refund" ? <RefundPage /> : <ReceiptScreen receipt={receiptOf(way, reference)} />}</div>
}

const H = "mb-2 text-xs font-semibold uppercase tracking-wide text-primary-dark"
/** The three things a customer gets for one payment, in a column: the text, the email, the page. */
export function ReceiptSet({ way, reference }: { way: Way; reference?: string }) {
  return (
    <div data-slot="receipt-set" className="mx-auto max-w-2xl space-y-8 px-4 py-6">
      <section>
        <h2 className={H}>The text</h2>
        <TextBubble body={receiptText(way)} />
      </section>
      <section>
        <h2 className={H}>The email</h2>
        <EmailFrame way={way} reference={reference} />
      </section>
      <section>
        <h2 className={H}>The receipt page</h2>
        <div className="rounded-lg border border-border bg-cream">
          <ReceiptPage way={way} reference={reference} />
        </div>
      </section>
    </div>
  )
}
