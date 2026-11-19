import { cn } from "@/lib/utils"
import { RECORD_ROW, RecordList, RecordRowEnd } from "./RecordPanel"

// The lines of a job or an invoice with what they add up to (docs/DESIGN.md, "The recipe"): each line is a name over its description with
// the price at the right, then the totals as a right-aligned list (Subtotal, Tax, Total, Paid, Balance). The same block is "What's
// included" on a job and the frozen lines of an invoice. A canceled line is struck through. Pure props, whole dollars as text.

export interface LineItem {
  name: string
  description?: string
  /** "$145" */
  amount: string
  canceled?: boolean
}

export type LineTotal = readonly [label: string, value: string, emphasis?: "strong" | "alert"]

export interface LineItemListProps {
  lines: readonly LineItem[]
  totals?: readonly LineTotal[]
  className?: string
}

export function LineItemList({ lines, totals = [], className }: LineItemListProps) {
  return (
    <div data-slot="line-item-list" className={className}>
      <RecordList>
        {lines.map((l) => (
          <li key={l.name} className={cn("flex items-start", RECORD_ROW, l.canceled && "text-muted-foreground line-through")}>
            <span className="block min-w-0 flex-1">
              <span className="block font-medium">{l.name}</span>
              {l.description ? <span className="block text-muted-foreground">{l.description}</span> : null}
            </span>
            <RecordRowEnd><span className="font-medium tabular-nums">{l.amount}</span></RecordRowEnd>
          </li>
        ))}
      </RecordList>
      {totals.length > 0 && (
        <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 border-t border-border pt-2 text-sm">
          {totals.map(([label, value, emphasis]) => (
            <div key={label} className="contents">
              <dt className={cn("text-right text-muted-foreground", emphasis === "strong" && "font-semibold text-foreground")}>{label}</dt>
              <dd className={cn("text-right tabular-nums", emphasis === "strong" && "font-semibold", emphasis === "alert" && "font-semibold text-destructive")}>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
