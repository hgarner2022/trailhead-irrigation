"use client"

import { useState } from "react"
import { QuoteFlow } from "@/app/(checkout)/quote/_screens/QuoteFlow"
import { NO_DEPOSIT, WITH_DEPOSIT, money, type QuoteView } from "@/app/(checkout)/quote/_screens/quote-view"
import { Button } from "@/components/ui/button"
import { quoteApprovedText, quoteDeclinedText, quoteText } from "@/lib/portal/quote-words"
import type { FlowText } from "../FlowFrame"
import { PhoneInbox } from "./PhoneInbox"

// The quote step of the customer walkthrough (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.6 and "Deposits and card on file at approval"): Ryan has sent a
// quote by text. You open the link in the text, read the quote, and Approve (a deposit goes to Stripe's card page, drawn) or Decline. Two chips switch the quote
// you were sent, one with a $300 deposit and one with none, so both ways to Approve can be walked. What the customer gets after deciding shows in the inbox. Nothing
// is sent or charged. Client component.

const FIRST = { deposit: WITH_DEPOSIT, none: NO_DEPOSIT } as const
type Which = keyof typeof FIRST
const LINK = (q: QuoteView) => `https://www.trailheadirrigation.com/quote/${q.number}`
const facts = (q: QuoteView) => ({ first: q.firstName, service: q.service, address: q.address, total: money(q.total), ...(q.deposit ? { deposit: money(q.deposit) } : {}), number: q.number, link: LINK(q) })

export function QuoteWalk({ onOpenLink }: { onOpenLink?: (href: string) => void }) {
  const [which, setWhich] = useState<Which>("deposit")
  const [opened, setOpened] = useState(false)
  const [decided, setDecided] = useState<"approved" | "declined" | null>(null)
  const quote = FIRST[which]
  const f = facts(quote)
  const texts: FlowText[] = [
    { id: "quote", channel: "text", body: quoteText(f) },
    ...(decided === "approved" ? [{ id: "approved", channel: "text" as const, body: quoteApprovedText({ ...f, depositPaid: Boolean(quote.deposit) }) }] : []),
    ...(decided === "declined" ? [{ id: "declined", channel: "text" as const, body: quoteDeclinedText(f) }] : []),
  ]
  const pick = (w: Which) => {
    setWhich(w)
    setOpened(false)
    setDecided(null)
  }
  return (
    <div data-slot="quote-walk" data-opened={opened || undefined}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-3" role="group" aria-label="The quote you were sent">
        <Button type="button" size="sm" variant={which === "deposit" ? "default" : "outline"} aria-pressed={which === "deposit"} onClick={() => pick("deposit")}>
          With a $300 deposit
        </Button>
        <Button type="button" size="sm" variant={which === "none" ? "default" : "outline"} aria-pressed={which === "none"} onClick={() => pick("none")}>
          With no deposit
        </Button>
        {opened && (
          <Button type="button" size="sm" variant="ghost" onClick={() => (setOpened(false), setDecided(null))}>
            Back to the text
          </Button>
        )}
      </div>
      {opened ? <QuoteFlow key={which} quote={quote} onDone={(d) => setDecided(d.outcome)} /> : <PhoneInbox key={`${which}-${decided ?? "none"}`} texts={texts} onLink={(url) => (/\/quote\//.test(url) ? setOpened(true) : onOpenLink?.(url))} />}
    </div>
  )
}
