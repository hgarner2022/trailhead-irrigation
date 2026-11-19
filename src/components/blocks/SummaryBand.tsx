import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// The band of key facts under a record page's header (docs/plans/2026-11-19-admin-page-layout-research.md, rule 3): one card of up to four
// cells, each a small icon in a cream circle at the left, then a small grey label over its value in the display face and one muted line
// under it, hairlines between the cells (a 1px gap over the border colour, so it holds at any width), two by two on a phone and four across
// from `lg`. It is the one large thing on the page after the title. The tone `alert` is for Past due and Failed only. Pure render, server component.

export interface SummaryItem {
  label: string
  value: ReactNode
  /** one muted line under the value: the time, the town, the money word */
  sub?: ReactNode
  tone?: "plain" | "alert"
  /** a lucide icon in a small cream circle at the left of the cell: Calendar, UserRound, MapPin, Receipt */
  icon?: LucideIcon
}

export function SummaryBand({ items, className }: { items: readonly SummaryItem[]; className?: string }) {
  return (
    <div data-slot="summary-band" role="group" aria-label="Summary" className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border shadow-sm lg:grid-cols-4", className)}>
      {items.map(({ icon: Icon, ...item }) => (
        <div key={item.label} data-slot="summary-cell" className="flex min-w-0 items-start gap-3 bg-card px-4 py-4 sm:px-5">
          {Icon && (
            <span data-slot="summary-icon" aria-hidden className="hidden size-9 sm:flex shrink-0 items-center justify-center rounded-full border border-border bg-cream text-primary-dark">
              <Icon className="size-[18px]" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className={cn("mt-1 break-words font-display text-2xl font-semibold leading-tight", item.tone === "alert" ? "text-destructive" : "text-navy")}>{item.value}</p>
            {item.sub && <p className={cn("mt-0.5 break-words text-sm", item.tone === "alert" ? "font-medium text-destructive" : "text-muted-foreground")}>{item.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
