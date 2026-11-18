"use client"

import { useId, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { chargingWords, paidWords, receiptLine, type CollectPlan, type PayChoice, type PayOption } from "@/lib/money/collect"
import { cn } from "@/lib/utils"

// "How is this paid?": the second beat of a finished visit, in one block for the visit panel and the job panel. Pure props. The
// choices come from `collectPlan` (the card on file first and selected, the cash ways, an invoice, Pay later only for a customer
// with no card, Tap to pay greyed as not built). Nothing moves money until the one button under the choices is pressed, and
// each press does exactly one thing: one payment row, or one invoice, or nothing at all for Pay later. A decline says so and
// offers the other ways; once it has gone through the block says what happened in the words of `words.ts`. Client component.

export type Answer = { ok: true } | { ok: false; message: string }

export interface CollectPaymentProps {
  plan: CollectPlan
  /** "Spring turn-on · $145 unpaid": what is being paid for */
  summary: string
  /** the customer's first name, for "Receipt emailed to Andrea." */
  firstName: string
  /** the Charge button: `payments.chargeCard` */
  onCharge: () => Promise<Answer>
  /** the Record button: `payments.record` */
  onRecord: (input: { method: "check" | "venmo" | "cash"; reference?: string; amount?: number }) => Promise<Answer>
  /** Send the invoice: `invoices.send` */
  onInvoice: () => Promise<Answer>
  /** Leave it unpaid: nothing is written */
  onLater: () => void
  onClose: () => void
  className?: string
}

const RADIO = "flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border border-input px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"

function Choice({ option, checked, disabled, onPick }: { option: PayOption; checked: boolean; disabled: boolean; onPick: () => void }) {
  const title = useId()
  const line = useId()
  return (
    <label className={RADIO}>
      <input type="radio" name="pay-choice" value={option.value} checked={checked} disabled={disabled} onChange={onPick} aria-labelledby={title} aria-describedby={line} className="mt-0.5 size-4 shrink-0 accent-primary" />
      <span className="flex min-w-0 flex-col">
        <span id={title} className="font-medium text-foreground">
          {option.label}
        </span>
        <span id={line} className="text-muted-foreground">
          {option.line}
        </span>
      </span>
    </label>
  )
}

export function CollectPayment({ plan, summary, firstName, onCharge, onRecord, onInvoice, onLater, onClose, className }: CollectPaymentProps) {
  const [choice, setChoice] = useState<PayChoice>(plan.initial)
  const [more, setMore] = useState(false)
  const [reference, setReference] = useState("")
  const [amount, setAmount] = useState("")
  const [problem, setProblem] = useState(plan.declined ? "The card didn't go through. Choose another way." : "")
  const [result, setResult] = useState<{ title: string; line: string } | null>(null)
  const [pending, start] = useTransition()
  const shown = [...plan.options, ...(more ? plan.anotherWay : [])]
  const picked = shown.find((o) => o.value === choice) ?? shown[0]!
  const busy = pending || plan.charging
  const handed = picked.value === "check" || picked.value === "venmo" || picked.value === "cash"
  const settle = (answer: Answer, done: { title: string; line: string }) => {
    if (answer.ok) setResult(done)
    else setProblem(answer.message)
  }
  const press = () => {
    setProblem("")
    if (picked.value === "later") return onLater()
    start(async () => {
      if (picked.value === "card") settle(await onCharge(), { title: paidWords("card_on_file"), line: receiptLine(firstName) })
      else if (picked.value === "invoice") settle(await onInvoice(), { title: "Invoice sent", line: `A pay link went to ${firstName}.` })
      else if (handed) {
        const method = picked.value as "check" | "venmo" | "cash"
        settle(await onRecord({ method, ...(reference.trim() ? { reference: reference.trim() } : {}), ...(plan.needsAmount && amount ? { amount: Number(amount) } : {}) }), { title: paidWords(method), line: receiptLine(firstName) })
      }
    })
  }
  if (result) {
    return (
      <div data-slot="collect-payment" data-state="done" className={cn("flex flex-col gap-3", className)}>
        <p className="text-sm text-muted-foreground">{summary}</p>
        <p role="status" className="font-display text-2xl text-navy">{result.title}</p>
        <p className="text-sm">{result.line}</p>
        <Button type="button" className="min-h-11 self-start" onClick={onClose}>
          Close
        </Button>
      </div>
    )
  }
  return (
    <div data-slot="collect-payment" className={cn("flex flex-col gap-3", className)}>
      <p className="text-sm text-muted-foreground">{summary}</p>
      {plan.charging && plan.cardWords && (
        <p role="status" className="text-sm font-medium">
          {chargingWords(plan.amount, plan.cardWords)}
        </p>
      )}
      <fieldset className="flex flex-col gap-2" disabled={busy}>
        <legend className="mb-1 text-sm font-medium text-foreground">How is this paid?</legend>
        {shown.map((o) => (
          <Choice key={o.value} option={o} checked={picked.value === o.value} disabled={busy} onPick={() => setChoice(o.value)} />
        ))}
        <label className={RADIO}>
          <input type="radio" name="pay-choice" disabled className="mt-0.5 size-4 shrink-0" />
          <span className="flex min-w-0 flex-col">
            <span className="font-medium text-foreground">Tap to pay</span>
            <span className="text-muted-foreground">Not built yet</span>
          </span>
        </label>
      </fieldset>
      {plan.anotherWay.length > 0 && !more && (
        <Button type="button" variant="ghost" className="min-h-11 self-start text-muted-foreground" onClick={() => (setMore(true), setChoice("check"))}>
          Paid another way
        </Button>
      )}
      {handed && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="collect-reference" className="mb-1 block text-sm font-medium text-foreground">
              {picked.value === "check" ? "Check number (optional)" : picked.value === "venmo" ? "Venmo handle (optional)" : "Note (optional)"}
            </label>
            <Input id="collect-reference" value={reference} onChange={(e) => setReference(e.target.value)} className="min-h-11" />
          </div>
          {plan.needsAmount && (
            <div>
              <label htmlFor="collect-amount" className="mb-1 block text-sm font-medium text-foreground">
                Amount received
              </label>
              <Input id="collect-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="$" className="min-h-11" />
            </div>
          )}
        </div>
      )}
      <p role="alert" className="text-sm text-destructive empty:hidden">
        {problem}
      </p>
      <Button type="button" className="min-h-11 w-full sm:w-auto sm:self-start" disabled={busy || (handed && plan.needsAmount && !Number(amount))} onClick={press}>
        {picked.button}
      </Button>
    </div>
  )
}
