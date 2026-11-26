"use client"

import { useEffect, useRef, useState } from "react"
import { FormRow } from "@/components/blocks/FormRow"
import { RecordList, RecordRowEnd, RECORD_ROW } from "@/components/blocks/RecordPanel"
import { SectionCard } from "@/components/blocks/SectionCard"
import { SegmentedControl } from "@/components/blocks/SegmentedControl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { QUIET } from "./QuoteParts"
import { depositOf, lineTotal, linesTotal, money, sendBlock, type DepositInput, type DepositMode, type QuoteLine, type QuoteRecord } from "./quote-model"

// The Quote editor (Hannah, Nov 20 2026: "Create a quote here. What's the flow?"; moved to the quote's own page on Nov 22 2026): the one card a Draft quote leads with. Ryan PRICES
// the quote here (a price box in each line's row, a line added or canceled, an optional deposit), presses Send a quote, and the customer approves from a link; the job is made
// then, not before. A line holds what is sold, never the customer's words: those are shown once at the top and are the quote's first note. A quantity is shown only when it is
// more than one. What stops the send is said in ONE quiet line beside the button. Pure props over the quote.

const STEPS = ["Price", "Send", "They approve"]
const NONE: DepositInput = { mode: "none", value: "" }
export const MISSING_ID = "quote-missing"

export interface QuoteEditorProps {
  quote: QuoteRecord
  /** typing a price is the edit: whole dollars, empty for no price */
  onPrice: (lineId: string, amount: number) => void
  onCancelLine: (lineId: string) => void
  onRestoreLine: (lineId: string) => void
  /** Edit opens the line's dialog (name, description, quantity) */
  onEditLine: (lineId: string) => void
  onAddLine: () => void
  onDeposit: (input: DepositInput) => void
  onSend: () => void
  /** put the cursor in the first empty price box when the page opens (a quote just made from a request) */
  autoFocusPrice?: boolean
}

export function QuoteEditor({ quote, onPrice, onCancelLine, onRestoreLine, onEditLine, onAddLine, onDeposit, onSend, autoFocusPrice }: QuoteEditorProps) {
  const total = linesTotal(quote.lines)
  const draft = quote.depositDraft ?? NONE
  const result = depositOf(total, draft)
  const missing = sendBlock(quote)
  // step 1 until a line has a price, step 2 from then on; the third is the customer's
  const step = total > 0 ? 2 : 1
  return (
    <SectionCard title="Quote" id="quote-h">
      <ol data-slot="quote-steps" aria-label="Steps" className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i + 1 === step ? "step" : undefined} className={cn(i + 1 === step && "font-medium text-foreground")}>
            {i + 1} {s}
          </li>
        ))}
      </ol>
      {quote.words && (
        <div data-slot="what-they-asked" className="mb-4 border-b border-border pb-4 text-sm">
          <p className="text-muted-foreground">What they asked</p>
          <p className="mt-0.5 whitespace-pre-wrap">{quote.words}</p>
        </div>
      )}
      <RecordList data-slot="quote-lines" className="mt-0">
        {quote.lines.map((l, i) => (
          <LineRow key={l.id} line={l} onPrice={onPrice} onCancel={onCancelLine} onRestore={onRestoreLine} onEdit={onEditLine} focusFirst={Boolean(autoFocusPrice) && i === firstEmpty(quote)} />
        ))}
      </RecordList>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 border-t border-border pt-2">
        <button type="button" className={QUIET} onClick={onAddLine}>
          Add a line
        </button>
        <dl className="flex items-baseline gap-6 text-sm font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{money(total)}</dd>
        </dl>
      </div>
      <DepositControl total={total} draft={draft} amount={result.amount} problem={result.problem} onChange={onDeposit} />
      <div data-slot="quote-editor-footer" className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4">
        <Button size="touch" type="button" className="w-full sm:w-auto" disabled={Boolean(missing)} aria-describedby={missing ? MISSING_ID : undefined} onClick={onSend}>
          Send a quote
        </Button>
        {missing && (
          <p id={MISSING_ID} className="text-sm text-muted-foreground">
            {missing}
          </p>
        )}
      </div>
    </SectionCard>
  )
}

/** The line to focus first: the first one with no price. */
const firstEmpty = (quote: QuoteRecord) => quote.lines.findIndex((l) => !l.canceled && l.amount === 0)

function LineRow({ line, onPrice, onCancel, onRestore, onEdit, focusFirst }: { line: QuoteLine; onPrice: QuoteEditorProps["onPrice"]; onCancel: QuoteEditorProps["onCancelLine"]; onRestore: QuoteEditorProps["onRestoreLine"]; onEdit: QuoteEditorProps["onEditLine"]; focusFirst: boolean }) {
  // the box keeps what is typed; a price that is not whole dollars is not sent on until it is
  const [text, setText] = useState(line.amount ? String(line.amount) : "")
  const bad = text.trim() !== "" && !/^\d+$/.test(text.trim())
  const ref = useRef<HTMLInputElement>(null)
  // a price that changed from outside the box (Change service puts the new service's price on the line) shows in it; typing never trips this, because what is typed is what the line holds
  useEffect(() => {
    const typed = text.trim() === "" ? 0 : /^\d+$/.test(text.trim()) ? Number(text) : null
    if (typed !== null && typed !== line.amount) setText(line.amount ? String(line.amount) : "")
    // only when the line's price moves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line.amount])
  useEffect(() => {
    if (focusFirst) ref.current?.focus()
  }, [focusFirst])
  const many = (line.quantity ?? 1) > 1
  return (
    <li data-canceled={line.canceled ? "true" : undefined} className={cn("flex flex-col gap-1 sm:flex-row sm:items-start", RECORD_ROW)}>
      <span className="block min-w-0 flex-1 sm:pt-2.5">
        <span className={cn("block font-medium", line.canceled && "text-muted-foreground line-through")}>{line.name}</span>
        {line.description && <span className={cn("block text-muted-foreground", line.canceled && "line-through")}>{line.description}</span>}
      </span>
      <RecordRowEnd>
        <span className="flex flex-wrap items-center justify-end gap-x-2">
          {many && <span className={cn("tabular-nums text-muted-foreground", line.canceled && "line-through")}>{line.quantity} ×</span>}
          <span className="relative">
            <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              ref={ref}
              inputMode="numeric"
              autoComplete="off"
              aria-label={`Price for ${line.name}`}
              aria-invalid={bad || undefined}
              placeholder="Price"
              disabled={line.canceled}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                const t = e.target.value.trim()
                if (t === "") onPrice(line.id, 0)
                else if (/^\d+$/.test(t)) onPrice(line.id, Number(t))
              }}
              className={cn("w-28 pl-6 text-right tabular-nums", line.canceled && "line-through")}
            />
          </span>
          {many && !line.canceled && <span className="w-20 text-right tabular-nums text-muted-foreground">{money(lineTotal(line))}</span>}
          {line.canceled ? (
            <button type="button" className={cn(QUIET, "text-sm")} aria-label={`Restore ${line.name}`} onClick={() => onRestore(line.id)}>
              Restore
            </button>
          ) : (
            <>
              <button type="button" className={cn(QUIET, "text-sm")} aria-label={`Edit ${line.name}`} onClick={() => onEdit(line.id)}>
                Edit
              </button>
              <button type="button" className={cn(QUIET, "text-sm")} aria-label={`Cancel ${line.name}`} onClick={() => onCancel(line.id)}>
                Cancel
              </button>
            </>
          )}
        </span>
        {bad && <span className="block text-sm text-destructive">Use whole dollars.</span>}
      </RecordRowEnd>
    </li>
  )
}

/** The optional deposit: None by default, dollars or a percent, the dollars it comes to, never above the total. What is wrong with it is the quiet line beside Send a quote. */
function DepositControl({ total, draft, amount, problem, onChange }: { total: number; draft: DepositInput; amount: number | null; problem: string; onChange: (input: DepositInput) => void }) {
  const mode = draft.mode
  return (
    <div data-slot="quote-deposit" className="mt-4 flex flex-col gap-2 border-t border-border pt-4 text-sm">
      <p className="font-medium">Deposit</p>
      <SegmentedControl
        label="Deposit"
        value={mode}
        onChange={(v) => onChange({ mode: v as DepositMode, value: "" })}
        options={[
          { value: "none", label: "None" },
          { value: "dollars", label: "Dollars" },
          { value: "percent", label: "Percent" },
        ]}
      />
      {mode !== "none" && (
        <FormRow label={mode === "dollars" ? "Deposit in dollars" : "Deposit as a percent of the total"} hint={amount ? `${money(amount)} of ${money(total)}. Frozen as dollars when you send.` : `The total is ${money(total)}.`}>
          <Input inputMode="numeric" autoComplete="off" aria-invalid={Boolean(problem && draft.value.trim()) || undefined} value={draft.value} onChange={(e) => onChange({ mode, value: e.target.value })} placeholder={mode === "dollars" ? "300" : "25"} className="w-40" />
        </FormRow>
      )}
    </div>
  )
}
