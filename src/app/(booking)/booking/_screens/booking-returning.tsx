"use client"

import { Button } from "@/components/ui/button"
import { RETURNING_WORDS, type LinkChannel, type Returning, type SavedCustomer } from "@/lib/booking/returning"

// The returning customer's block at the top of the contact step (docs/plans/2026-11-19-booking-form-design.md, "Repeat customers (Nov 22 2026)"). Before the customer verifies it shows only the offer of
// a sign-in link by text or email and, once sent, where it went with the digits and letters hidden; no name, address or card. Opened, it says "Welcome back, Andrea." and lists what was filled in
// (the address of this booking and whether it is on file, the card, how we reach her), each one changeable, with one line, "Not you?", that undoes it. "Continue without signing in" keeps the form
// a guest checkout. The "link opened" button is the prototype's stand-in for tapping the link in the text. Pure props, client component.

const LINK = "inline-flex min-h-11 cursor-pointer items-center text-base font-semibold text-primary-deep underline underline-offset-2"

export interface ReturningBlockProps {
  state: Returning
  /** how the link was sent */
  via: LinkChannel
  /** what was typed, so the masked destination is the visitor's own words */
  contact: { email: string; phone: string }
  /** known only once verified */
  saved: SavedCustomer | null
  /** the address of this booking, and whether it is the one on file */
  street: string
  onFile: boolean
  card: string
  onSend: (channel: LinkChannel) => void
  onSkip: () => void
  /** the prototype's stand-in for opening the link */
  onOpenLink: () => void
  onNotYou: () => void
  onChangeAddress: () => void
  onChangeCard: () => void
}

export function ReturningBlock({ state, via, contact, saved, street, onFile, card, onSend, onSkip, onOpenLink, onNotYou, onChangeAddress, onChangeCard }: ReturningBlockProps) {
  if (state === "none" || state === "declined") return null
  if (state === "offer")
    return (
      <section data-slot="returning-offer" aria-label="Saved details" className="mb-8 rounded-lg border border-border bg-cream px-4 py-4">
        <p className="text-base text-foreground">{RETURNING_WORDS.offer}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-11 text-base" onClick={() => onSend("text")}>
            {RETURNING_WORDS.text}
          </Button>
          <Button type="button" variant="outline" className="min-h-11 text-base" onClick={() => onSend("email")}>
            {RETURNING_WORDS.email}
          </Button>
        </div>
        <button type="button" onClick={onSkip} className={LINK}>
          {RETURNING_WORDS.skip}
        </button>
      </section>
    )
  if (state === "sent")
    return (
      <section data-slot="returning-sent" aria-label="Saved details" className="mb-8 rounded-lg border border-border bg-cream px-4 py-4">
        <p role="status" className="text-base text-foreground">
          {RETURNING_WORDS.sent(via, contact)}
        </p>
        <div className="mt-1 flex flex-wrap gap-x-5">
          <button type="button" onClick={() => onSend(via)} className={LINK}>
            {RETURNING_WORDS.again}
          </button>
          <button type="button" onClick={onSkip} className={LINK}>
            {RETURNING_WORDS.skip}
          </button>
        </div>
        <p data-slot="returning-drawn" className="mt-2 rounded-md border border-dashed border-border bg-stone px-3 py-2 text-sm text-muted-foreground">
          The link is drawn here.{" "}
          <button type="button" onClick={onOpenLink} className="font-semibold text-primary-deep underline underline-offset-2">
            Open it
          </button>
        </p>
      </section>
    )
  return (
    <section data-slot="returning-welcome" aria-label="Saved details" className="mb-8 rounded-lg border border-border bg-cream px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-display text-2xl leading-tight text-navy">{RETURNING_WORDS.welcome(saved?.firstName ?? "")}</h2>
        <button type="button" onClick={onNotYou} className={LINK}>
          {RETURNING_WORDS.notYou}
        </button>
      </div>
      <ul className="mt-2 divide-y divide-border text-base">
        <li className="flex items-center justify-between gap-4 py-1">
          <div>
            <p className="text-sm text-muted-foreground">Address</p>
            <p className="text-foreground">{street}</p>
            <p className="text-sm text-muted-foreground">{onFile ? "On file" : "New, we'll add it"}</p>
          </div>
          <button type="button" onClick={onChangeAddress} aria-label="Change address" className={LINK}>
            Change
          </button>
        </li>
        <li className="flex items-center justify-between gap-4 py-1">
          <div>
            <p className="text-sm text-muted-foreground">Card</p>
            <p className="text-foreground">{card}</p>
          </div>
          <button type="button" onClick={onChangeCard} aria-label="Change card" className={LINK}>
            Change
          </button>
        </li>
      </ul>
    </section>
  )
}
