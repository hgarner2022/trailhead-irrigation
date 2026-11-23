"use client"

import { useState } from "react"
import { FormRow } from "@/components/blocks/FormRow"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CODE_LENGTH, FIXTURE_CODE, RETURNING_WORDS, type Returning, type SavedCustomer } from "@/lib/booking/returning"

// The repeat customer's block at the top of the contact step (docs/plans/2026-11-23-booking-day-time-and-repeat-research.md, section 4). It is the same for every visitor: one line, "Booked with us before?",
// with "Use saved details". That asks for the email, sends a six-digit code and takes it in the form. Before the code is right nothing about the person shows. Right, it says "Welcome back, Andrea." and lists
// what was filled in (the address of this booking and whether it is on file, the card), each one changeable, with one line, "Not you?", that undoes it. Anyone may ignore the block and fill the form in.
// The drawn code is the prototype's stand-in for the email. Pure props, client component.

const LINK = "inline-flex min-h-11 cursor-pointer items-center text-base font-semibold text-primary-deep underline underline-offset-2"

export interface ReturningBlockProps {
  state: Returning
  /** the address the code goes to */
  email: string
  onEmail: (email: string) => void
  /** a code that was not right, or an email with nothing saved */
  problem: "wrong" | "none" | null
  /** known only once verified */
  saved: SavedCustomer | null
  /** the address of this booking, and whether it is the one on file */
  street: string
  onFile: boolean
  card: string
  onAsk: () => void
  onSend: () => void
  onCancel: () => void
  onVerify: (code: string) => void
  onNotYou: () => void
  onChangeAddress: () => void
  onChangeCard: () => void
}

export function ReturningBlock({ state, email, onEmail, problem, saved, street, onFile, card, onAsk, onSend, onCancel, onVerify, onNotYou, onChangeAddress, onChangeCard }: ReturningBlockProps) {
  const [code, setCode] = useState("")
  if (state === "none")
    return (
      <p data-slot="returning-offer" className="flex flex-wrap items-center gap-x-4 text-base text-foreground">
        {RETURNING_WORDS.offer}
        <button type="button" onClick={onAsk} className={LINK}>
          {RETURNING_WORDS.start}
        </button>
      </p>
    )
  if (state === "asking")
    return (
      <section data-slot="returning-asking" aria-label="Saved details" className="rounded-lg border border-border bg-cream px-4 py-4">
        <FormRow label={RETURNING_WORDS.emailLabel}>
          <Input name="returning-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => onEmail(e.target.value)} data-autofocus className="h-12 rounded-lg bg-background px-4 text-base shadow-sm" />
        </FormRow>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
          <Button type="button" className="min-h-11 text-base" disabled={!email.includes("@")} onClick={onSend}>
            {RETURNING_WORDS.send}
          </Button>
          <button type="button" onClick={onCancel} className={LINK}>
            {RETURNING_WORDS.cancel}
          </button>
        </div>
      </section>
    )
  if (state === "sent")
    return (
      <section data-slot="returning-sent" aria-label="Saved details" className="rounded-lg border border-border bg-cream px-4 py-4">
        <p role="status" className="text-base text-foreground">
          {RETURNING_WORDS.sent(email)}
        </p>
        <div className="mt-3">
          <FormRow label={RETURNING_WORDS.codeLabel} error={problem === "wrong" ? RETURNING_WORDS.wrong : undefined}>
            <Input name="returning-code" inputMode="numeric" autoComplete="one-time-code" maxLength={CODE_LENGTH} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} data-autofocus className="h-12 max-w-48 rounded-lg bg-background px-4 text-base tabular-nums tracking-widest shadow-sm" />
          </FormRow>
        </div>
        {problem === "none" && (
          <p role="alert" className="mt-2 text-base text-foreground">
            {RETURNING_WORDS.none}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
          <Button type="button" className="min-h-11 text-base" onClick={() => onVerify(code)}>
            {RETURNING_WORDS.confirm}
          </Button>
          <button type="button" onClick={onSend} className={LINK}>
            {RETURNING_WORDS.again}
          </button>
          <button type="button" onClick={onCancel} className={LINK}>
            {RETURNING_WORDS.cancel}
          </button>
        </div>
        <p data-slot="returning-drawn" className="mt-3 rounded-md border border-dashed border-border bg-stone px-3 py-2 text-sm text-muted-foreground">
          {`The email is drawn here. The code is ${FIXTURE_CODE}.`}
        </p>
      </section>
    )
  return (
    <section data-slot="returning-welcome" aria-label="Saved details" className="rounded-lg border border-border bg-cream px-4 py-4">
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
