import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { MoneyCell, type MoneyTone } from "./MoneyCell"
import { RecordChip } from "./RecordChip"
import type { RecordPreviewData } from "./record-preview-model"
import { RECORD_ROW, RecordFacts, RecordList, RecordRowEnd, RecordRowText, type RecordFact } from "./RecordPanel"

// The body of a Billing section on a job or a customer (docs/DESIGN.md, "The recipe"): what is owed in the facts (Total, Paid, Unpaid),
// then one row per invoice and per payment, in the words of `src/lib/money/words.ts`. An invoice row opens that invoice (Remind, Record
// the payment live there); a payment row is quiet text. The section's heading is the caller's `SectionHeading`. Pure props.

export interface BillingRowData {
  id: string
  kind: "invoice" | "payment"
  /** "Invoice TH-1042", "Venmo" */
  title: string
  /** "Sent Nov 18, due Dec 2" */
  detail?: string
  /** a `StatusPill` for an invoice */
  end?: ReactNode
  /** the amount of a payment row: "$145" */
  amount?: string
  tone?: MoneyTone
  /** an invoice row's title is a `RecordChip` that opens the invoice */
  onOpen?: () => void
  href?: string
  preview?: RecordPreviewData
}

export interface BillingSectionProps {
  summary: readonly RecordFact[]
  rows: readonly BillingRowData[]
  /** what the section says with nothing to show */
  emptyLine?: string
  className?: string
}

export function BillingSection({ summary, rows, emptyLine = "Nothing to bill yet.", className }: BillingSectionProps) {
  return (
    <div data-slot="billing-section" className={className}>
      {summary.length > 0 && <RecordFacts rows={summary} />}
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{emptyLine}</p>
      ) : (
        <RecordList>
          {rows.map((r) => {
            const inner = (
              <>
                <RecordRowText title={r.title} detail={r.detail} />
                <RecordRowEnd>{r.end ?? (r.amount ? <MoneyCell text={r.amount} tone={r.tone} /> : null)}</RecordRowEnd>
              </>
            )
            if (r.kind === "invoice") {
              return (
                <li key={r.id} data-kind={r.kind} className={cn("flex items-center", RECORD_ROW)}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <RecordChip kind="invoice" name={r.title} href={r.href ?? `/admin/invoices?invoice=${encodeURIComponent(r.id)}`} preview={r.preview} onOpen={r.onOpen} />
                    {r.detail && <span className="text-sm text-muted-foreground">{r.detail}</span>}
                  </span>
                  <RecordRowEnd>{r.end ?? (r.amount ? <MoneyCell text={r.amount} tone={r.tone} /> : null)}</RecordRowEnd>
                </li>
              )
            }
            return (
              <li key={r.id} data-kind={r.kind}>
                <div className={cn("flex items-center", RECORD_ROW)}>{inner}</div>
              </li>
            )
          })}
        </RecordList>
      )}
    </div>
  )
}
