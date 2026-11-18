import { cn } from "@/lib/utils"

// A money word as plain text (docs/DESIGN.md, "The recipe"): "$145 · Invoice sent, due Dec 1", "$115 unpaid", "$145 · Paid". The words
// come from src/lib/money/words.ts; this only sets them, on one line with tabular figures, and spends the warning colour on Past due
// and Failed and nowhere else. Never a pill and never in a grid cell on its own background. Pure render, server component.

export type MoneyTone = "past-due" | "failed" | "plain"

export interface MoneyCellProps {
  /** the words, as `words.ts` makes them; null when nothing is due */
  text: string | null
  /** Past due and Failed are the only two that are coloured */
  tone?: MoneyTone
  /** right-aligned, for a Total column */
  end?: boolean
  className?: string
}

export function MoneyCell({ text, tone = "plain", end, className }: MoneyCellProps) {
  if (!text) {
    return (
      <span data-slot="money-cell" data-empty className={cn("text-muted-foreground", end && "text-right", className)}>
        <span aria-hidden>{"—"}</span>
        <span className="sr-only">Nothing due</span>
      </span>
    )
  }
  return (
    <span data-slot="money-cell" data-tone={tone} className={cn("whitespace-nowrap tabular-nums", tone !== "plain" && "text-destructive", end && "block text-right", className)}>
      {text}
    </span>
  )
}
