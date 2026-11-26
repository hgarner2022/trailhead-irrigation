"use client"

import { useId, useState, useTransition, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { chargingWords, paidWords, receiptLine, type CollectPlan, type PayChoice, type PayOption } from "@/lib/money/collect"
import { cn } from "@/lib/utils"
import { FormRow } from "./FormRow"
import { useFooterSlot } from "./record-slot"

// "How is this paid?": the second beat of a finished visit, in one block for the visit panel and the job panel. Pure props. The
// choices come from `collectPlan` (the card on file first and selected, the cash ways, an invoice, Pay later only for a customer
// with no card; there is no Tap to pay row until it is built). Nothing moves money until the one button under the choices is pressed, and
// each press does exactly one thing: one payment row, or one invoice, or nothing at all for Pay later. A decline says so and
// offers the other ways; once it has gone through the block says what happened in the words of `words.ts`. Inside a record panel the
// one button goes to the panel's footer (`RecordFooter slot`), so beat two reads as the panel's body with the footer's primary; in a dialog it stays under the choices. Client component.

export type Answer = { ok: true } | { ok: false; message: string }

export interface CollectPaymentProps {
  plan: CollectPlan
  /** "Spring turn-on · $145 unpaid": what is being paid for */
  summary: string
  /** the customer's first name, for "Receipt emailed to Andrea." */
  firstName: string
  /** the Charge button: `payments.chargeCard` */
  onCharge: (o?: { notify: boolean }) => Promise<Answer>
  /** the Record button: `payments.record` */
  onRecord: (input: { method: "check" | "venmo" | "cash"; reference?: string; amount?: number; notify?: boolean }) => Promise<Answer>
  /** Send the invoice: `invoices.send` */
  onInvoice: (options?: { report: boolean; notify?: boolean }) => Promise<Answer>
  /** Leave it unpaid: nothing is written */
  onLater: () => void
  onClose: () => void
  /** the words on the one button for the chosen way; the plan's own when left out */
  buttonLabel?: (picked: PayOption) => string
  /** the exact effect of the chosen way (what happens, to whom, how much), said under that option; the dialog's own button is the confirm, so no second dialog opens (a payment's receipt is not a notification: there is no "without notifying") */
  confirmFor?: (picked: PayOption, reference: string) => AskCopy | null
  /** a quiet "Not now" beside the button: leaves the job Done and unpaid, writes nothing */
  notNow?: boolean
  /** called once the money has gone through (or the invoice has), so a panel can drop its Cancel and leave the one Close */
  onSettled?: () => void
  /** the money has gone through: the page changes state and says so in a toast, so the block shows no result card of its own and no Close (the way paid and its words are passed) */
  onDone?: (done: { way: PayChoice; title: string; line: string }) => void
  className?: string
}

const RADIO = "flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border border-input px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:disabled]:cursor-not-allowed has-[:disabled]:border-dashed"

function Choice({ option, checked, disabled, onPick, effect }: { option: PayOption; checked: boolean; disabled: boolean; onPick: () => void; effect?: ReactNode }) {
  const title = useId()
  const line = useId()
  return (
    <div className={RADIO} onClick={() => !disabled && onPick()}>
      <input type="radio" name="pay-choice" value={option.value} checked={checked} disabled={disabled} onChange={onPick} aria-labelledby={title} aria-describedby={line} className="mt-0.5 size-4 shrink-0 accent-primary" />
      <span className="flex min-w-0 flex-col">
        <span id={title} className="font-medium text-foreground">
          {option.label}
        </span>
        <span id={line} className="text-navy-light">
          {option.line}
        </span>
        {effect}
      </span>
    </div>
  )
}

/** The words of a confirmation; `reportOption` adds the visit-report checkbox (checked by default) and the two sentences it switches between. */
export interface AskCopy {
  title: string
  message: string
  confirmLabel: string
  reportOption?: { label: string; with: string; without: string }
  /** the quiet twin under the confirm's caret ("Record without notifying"): the confirm becomes a `SplitButton` and the handler gets `notify: false` */
  quiet?: string
}

export function CollectPayment({ plan, summary, firstName, onCharge, onRecord, onInvoice, onLater, onClose, buttonLabel, notNow, confirmFor, onSettled, onDone, className }: CollectPaymentProps) {
  const [choice, setChoice] = useState<PayChoice>(plan.initial)
  const [more, setMore] = useState(false)
  const [reference, setReference] = useState("")
  const [amount, setAmount] = useState("")
  const [problem, setProblem] = useState(plan.declined ? "The card didn't go through. Choose another way." : "")
  const [result, setResult] = useState<{ title: string; line: string } | null>(null)
  const [pending, start] = useTransition()
  const [report, setReport] = useState(true)
  const shown = [...plan.options, ...(more ? plan.anotherWay : [])]
  const picked = shown.find((o) => o.value === choice) ?? shown[0]!
  const busy = pending || plan.charging
  // While the card is being charged the panel says so, from the press or from a charge already going through.
  const charging = plan.charging || (pending && picked.value === "card")
  const handed = picked.value === "check" || picked.value === "venmo" || picked.value === "cash"
  const settle = (answer: Answer, done: { title: string; line: string }) => {
    if (answer.ok) {
      if (onDone) onDone({ way: picked.value, ...done })
      else setResult(done)
      onSettled?.()
    } else setProblem(answer.message)
  }
  // The one button: in the footer of the panel it is in, else under the choices.
  const ask = confirmFor?.(picked, reference) ?? null
  const effectFor = ask && (
    <span data-slot="collect-effect" className="mt-1 flex flex-col gap-1 text-foreground" onClick={(e) => e.stopPropagation()}>
      <span>{ask.reportOption ? (report ? ask.reportOption.with : ask.reportOption.without) : ask.message}</span>
      {ask.reportOption && (
        <span className="flex min-h-11 items-center gap-3 font-medium">
          <input id="collect-report" type="checkbox" checked={report} onChange={(e) => setReport(e.target.checked)} aria-labelledby="collect-report-l" className="size-5 shrink-0 cursor-pointer accent-primary" />
          <span id="collect-report-l" className="cursor-pointer" onClick={() => setReport((r) => !r)}>{ask.reportOption.label}</span>
        </span>
      )}
    </span>
  )
  const slot = useFooterSlot()
  const place = (button: ReactNode) => (slot ? createPortal(button, slot) : button)
  const press = () => {
    setProblem("")
    if (picked.value === "later") return onLater()
    run()
  }
  const run = () => {
    start(async () => {
      const quiet = false
      if (picked.value === "card") settle(await onCharge(quiet ? { notify: false } : undefined), { title: paidWords("card_on_file"), line: receiptLine(firstName) })
      else if (picked.value === "invoice") settle(await onInvoice({ report, ...(quiet ? { notify: false } : {}) }), { title: "Invoice sent", line: `A pay link went to ${firstName}.` })
      else if (handed) {
        const method = picked.value as "check" | "venmo" | "cash"
        settle(await onRecord({ method, ...(reference.trim() ? { reference: reference.trim() } : {}), ...(plan.needsAmount && amount ? { amount: Number(amount) } : {}), ...(quiet ? { notify: false } : {}) }), { title: paidWords(method), line: receiptLine(firstName) })
      }
    })
  }
  if (result) {
    return (
      <div data-slot="collect-payment" data-state="done" className={cn("flex flex-col gap-3", className)}>
        <p className="text-sm text-muted-foreground">{summary}</p>
        <p role="status" className="font-display text-2xl text-navy">{result.title}</p>
        <p className="text-sm">{result.line}</p>
        {place(
          <Button type="button" size="touch" className={cn(!slot && "self-start")} onClick={onClose}>
            Close
          </Button>,
        )}
      </div>
    )
  }
  return (
    <div data-slot="collect-payment" className={cn("flex flex-col gap-3", className)}>
      <p className="text-sm text-muted-foreground">{summary}</p>
      {charging && plan.cardWords && (
        <p role="status" className="text-sm font-medium">
          {chargingWords(plan.amount, plan.cardWords)}
        </p>
      )}
      <fieldset className="flex flex-col gap-2" disabled={busy}>
        {/* The panel's or dialog's own heading says it once, so the legend is for a screen reader only. */}
        <legend className="sr-only">How is this paid?</legend>
        {shown.map((o) => (
          <Choice key={o.value} option={o} checked={picked.value === o.value} disabled={busy || Boolean(o.disabled)} onPick={() => setChoice(o.value)} effect={picked.value === o.value ? effectFor : undefined} />
        ))}
      </fieldset>
      {plan.anotherWay.length > 0 && !more && (
        <Button size="touch" type="button" variant="ghost" className="self-start text-muted-foreground" onClick={() => (setMore(true), setChoice("check"))}>
          Paid another way
        </Button>
      )}
      {handed && (
        <div className="grid grid-cols-2 gap-3">
          <FormRow label={picked.value === "check" ? "Check number (optional)" : picked.value === "venmo" ? "Venmo handle (optional)" : "Note (optional)"}>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} className="min-h-11" />
          </FormRow>
          {plan.needsAmount && (
            <FormRow label="Amount received">
              <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="$" className="min-h-11" />
            </FormRow>
          )}
        </div>
      )}
      <p role="alert" className="text-sm text-destructive empty:hidden">
        {problem}
      </p>
      {place(
        <div className={cn("flex flex-wrap items-center gap-2", !slot && "w-full")}>
          <Button size="touch" type="button" className="w-full sm:w-auto" disabled={busy || (handed && plan.needsAmount && !Number(amount))} onClick={press}>
            {buttonLabel ? buttonLabel(picked) : picked.button}
          </Button>
          {notNow && picked.value !== "later" && (
            <Button size="touch" type="button" variant="ghost" className="text-muted-foreground" disabled={busy} onClick={onLater}>
              Not now
            </Button>
          )}
        </div>,
      )}
    </div>
  )
}
