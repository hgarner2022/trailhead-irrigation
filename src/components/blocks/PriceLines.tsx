import { cn } from "@/lib/utils"

// THE line items of every customer screen: the booking form's price, the Season Pass offer, a quote, an invoice, a receipt and the checkout's order summary all list money through this one block,
// so a price reads the same wherever it is met (Hannah, Nov 25 2026: "Line items could be better... Price is smaller than the line items"). A line is a pair in the body face: the name regular at the
// left, the value the same size and heavier at the right, tabular numerals, both on one baseline (`type-item` and `type-value` in src/app/base.css); anything more about a line sits under its name in
// the quiet 14px. `PriceTotal` is the one figure a bill exists to state, in the display face (`type-figure`), with its label on the same baseline. Pure props, server-safe.

export interface PriceLine {
  name: string
  /** "$145", already worded */
  value: string
  /** quiet lines under the name: what the line covers, "2 at $45", "April to May" */
  notes?: readonly (string | null | undefined | false)[]
}

export function PriceLines({ lines, className, ...props }: { lines: readonly PriceLine[] } & Omit<React.ComponentProps<"dl">, "children">) {
  return (
    <dl data-slot="price-lines" className={cn("divide-y divide-border border-y border-border", className)} {...props}>
      {lines.map((line, i) => (
        // One wrapper per line with the dt and every dd as its direct children (a dl's groups may not nest a second div): the name and the value share the first row's baseline, the notes sit under the name.
        <div key={`${line.name}-${i}`} data-slot="price-line" className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 py-3">
          <dt className="col-start-1 row-start-1 min-w-0 type-item text-foreground">{line.name}</dt>
          <dd className="col-start-2 row-start-1 type-value text-foreground">{line.value}</dd>
          {line.notes?.map((note) => note && <dd key={note} className="col-start-1 mt-0.5 type-meta text-muted-foreground">{note}</dd>)}
        </div>
      ))}
    </dl>
  )
}

/** The total under the lines: its label in the body face, the figure in the display face, on one baseline; `note` ("Due Dec 1") sits under the figure at the right. */
export function PriceTotal({ label = "Total", value, valueSlot, note, className, ...props }: { label?: string; value: string; valueSlot?: string; note?: React.ReactNode; className?: string } & Omit<React.ComponentProps<"div">, "children">) {
  return (
    <div data-slot="price-total" className={cn("pt-4", className)} {...props}>
      <p className="flex items-baseline justify-between gap-4">
        <span className="type-item font-semibold text-foreground">{label}</span>
        <span data-slot={valueSlot} className="type-figure text-navy">{value}</span>
      </p>
      {note}
    </div>
  )
}
