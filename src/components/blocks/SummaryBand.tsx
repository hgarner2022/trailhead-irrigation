import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// The band of key facts under a record page's header (docs/plans/2026-11-19-admin-page-layout-research.md, rule 3): one card of up to four
// cells, each a small grey label over its value in the display face and one muted line under it, hairlines between the cells (a 1px gap
// over the border colour, so it holds at any width), two by two on a phone and four across from `lg`. It is the one large thing on the page
// after the title. The tone `alert` is for Past due and Failed only. Pure render, server component.

export interface SummaryItem {
  label: string
  value: ReactNode
  /** one muted line under the value: the time, the town, the money word */
  sub?: ReactNode
  tone?: "plain" | "alert"
}

export function SummaryBand({ items, className }: { items: readonly SummaryItem[]; className?: string }) {
  return (
    <dl data-slot="summary-band" aria-label="Summary" className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border shadow-sm lg:grid-cols-4", className)}>
      {items.map((item) => (
        <div key={item.label} data-slot="summary-cell" className="min-w-0 bg-card px-5 py-4">
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd className={cn("mt-1 break-words font-display text-2xl font-semibold leading-tight", item.tone === "alert" ? "text-destructive" : "text-navy")}>{item.value}</dd>
          {item.sub && <dd className={cn("mt-0.5 break-words text-sm", item.tone === "alert" ? "font-medium text-destructive" : "text-muted-foreground")}>{item.sub}</dd>}
        </div>
      ))}
    </dl>
  )
}
