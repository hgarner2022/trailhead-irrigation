"use client"

import { useId, useState, useTransition, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "./ConfirmDialog"
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
  onCharge: () => Promise<Answer>
  /** the Record button: `payments.record` */
  onRecord: (input: { method: "check" | "venmo" | "cash"; reference?: string; amount?: number }) => Promise<Answer>
  /** Send the invoice: `invoices.send` */
  onInvoice: (options?: { report: boolean }) => Promise<Answer>
  /** Leave it unpaid: nothing is written */
  onLater: () => void
  onClose: () => void
  /** the words on the one button for the chosen way; the plan's own when left out */
  buttonLabel?: (picked: PayOption) => string
  /** the words of the confirmation the button opens (what happens, to whom, how much); no dialog when left out or when it answers null */
  confirmFor?: (picked: PayOption, reference: string) => AskCopy | null
  /** a quiet "Not now" beside the button: leaves the job Done and unpaid, writes nothing */
  notNow?: boolean
  /** called once the money has gone through (or the invoice has), so a panel can drop its Cancel and leave the one Close */
  onSettled?: () => void
  className?: string
}

const RADIO = "flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border border-input px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:disabled]:cursor-not-allowed has-[:disabled]:border-dashed"

function Choice({ option, checked, disabled, onPick }: { option: PayOption; checked: boolean; disabled: boolean; onPick: () => void }) {
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
}

export function CollectPayment({ plan, summary, firstName, onCharge, onRecord, onInvoice, onLater, onClose, buttonLabel, notNow, confirmFor, onSettled, className }: CollectPaymentProps) {
  const [choice, setChoice] = useState<PayChoice>(plan.initial)
  const [more, setMore] = useState(false)
  const [reference, setReference] = useState("")
  const [amount, setAmount] = useState("")
  const [problem, setProblem] = useState(plan.declined ? "The card didn't go through. Choose another way." : "")
  const [result, setResult] = useState<{ title: string; line: string } | null>(null)
  const [pending, start] = useTransition()
  const [asking, setAsking] = useState<AskCopy | null>(null)
  const [report, setReport] = useState(true)
  const shown = [...plan.options, ...(more ? plan.anotherWay : [])]
  const picked = shown.find((o) => o.value === choice) ?? shown[0]!
  const busy = pending || plan.charging
  // While the card is being charged the panel says so, from the press or from a charge already going through.
  const charging = plan.charging || (pending && picked.value === "card")
  const handed = picked.value === "check" || picked.value === "venmo" || picked.value === "cash"
  const settle = (answer: Answer, done: { title: string; line: string }) => {
    if (answer.ok) {
      setResult(done)
      onSettled?.()
    } else setProblem(answer.message)
  }
  // The one button: in the footer of the panel it is in, else under the choices.
  const slot = useFooterSlot()
  const place = (button: ReactNode) => (slot ? createPortal(button, slot) : button)
  const press = () => {
    setProblem("")
    if (picked.value === "later") return onLater()
    const ask = confirmFor?.(picked, reference)
    if (ask) return setAsking(ask)
    run()
  }
  const run = () => {
    start(async () => {
      if (picked.value === "card") settle(await onCharge(), { title: paidWords("card_on_file"), line: receiptLine(firstName) })
      else if (picked.value === "invoice") settle(await onInvoice({ report }), { title: "Invoice sent", line: `A pay link went to ${firstName}.` })
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
        {place(
          <Button type="button" className={cn("min-h-11", !slot && "self-start")} onClick={onClose}>
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
        {/* In a panel the panel's own heading says it, so the legend is for a screen reader only. */}
        <legend className={cn("mb-1 text-sm font-medium text-foreground", slot && "sr-only")}>How is this paid?</legend>
        {shown.map((o) => (
          <Choice key={o.value} option={o} checked={picked.value === o.value} disabled={busy || Boolean(o.disabled)} onPick={() => setChoice(o.value)} />
        ))}
      </fieldset>
      {plan.anotherWay.length > 0 && !more && (
        <Button type="button" variant="ghost" className="min-h-11 self-start text-muted-foreground" onClick={() => (setMore(true), setChoice("check"))}>
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
          <Button type="button" className="min-h-11 w-full sm:w-auto" disabled={busy || (handed && plan.needsAmount && !Number(amount))} onClick={press}>
            {buttonLabel ? buttonLabel(picked) : picked.button}
          </Button>
          {notNow && picked.value !== "later" && (
            <Button type="button" variant="ghost" className="min-h-11 text-muted-foreground" disabled={busy} onClick={onLater}>
              Not now
            </Button>
          )}
        </div>,
      )}
      {asking && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setAsking(null)}
          title={asking.title}
          message={asking.reportOption ? (report ? asking.reportOption.with : asking.reportOption.without) : asking.message}
          confirmLabel={asking.confirmLabel}
          slot="collect-confirm"
          onConfirm={async () => {
            setAsking(null)
            run()
            return { ok: true }
          }}
        >
          {asking.reportOption && (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
              <input type="checkbox" checked={report} onChange={(e) => setReport(e.target.checked)} className="size-5 shrink-0 accent-primary" />
              {asking.reportOption.label}
            </label>
          )}
        </ConfirmDialog>
      )}
    </div>
  )
}
