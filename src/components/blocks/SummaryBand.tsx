import type { ReactNode } from "react"
import Link from "next/link"
import { ChevronRight, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// The band of key facts under a record page's header (docs/plans/2026-11-19-admin-page-layout-research.md, rule 3): one card of up to four
// cells, each a small icon in a cream circle at the left, then a small grey label over its value in the display face and one muted line
// under it, hairlines between the cells (a 1px gap over the border colour, so it holds at any width), two by two on a phone and four across
// from `lg`. It is the one large thing on the page after the title. A cell with `href` or `onClick` is a link to the thing it summarises (Hannah,
// Nov 19 2026): the pointer, a quiet chevron and an underline on hover and focus, 44px or taller; a cell with nothing to open ("Nothing unpaid", "No card") has neither and is not a link. The tone `alert` is for Past due and Failed only. Pure render, server component.

export interface SummaryItem {
  label: string
  value: ReactNode
  /** one muted line under the value: the time, the town, the money word */
  sub?: ReactNode
  tone?: "plain" | "alert"
  /** a lucide icon in a small cream circle at the left of the cell: Calendar, UserRound, MapPin, Receipt */
  icon?: LucideIcon
  /** the cell opens the thing it summarises: the next job, the invoice, the pass */
  href?: string
  /** or scrolls to a section, opens a card: a button, not a link */
  onClick?: () => void
}

export function SummaryBand({ items, className }: { items: readonly SummaryItem[]; className?: string }) {
  return (
    <div data-slot="summary-band" role="group" aria-label="Summary" className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border shadow-sm lg:grid-cols-4", className)}>
      {items.map((item) => (
        <Cell key={item.label} item={item} />
      ))}
    </div>
  )
}

const CELL = "relative flex min-w-0 flex-col items-start gap-2 bg-card px-4 py-4 sm:flex-row sm:gap-3 sm:px-5"
const TARGET = "group text-left transition-colors hover:bg-row-hover focus-visible:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"

function Cell({ item }: { item: SummaryItem }) {
  const { icon: Icon, href, onClick } = item
  const body = (
    <>
      {Icon && (
        <span data-slot="summary-icon" aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-cream text-primary-dark">
          <Icon className="size-[18px]" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{item.label}</p>
        <p className={cn("mt-1 break-words font-display text-xl font-semibold leading-tight sm:text-2xl", item.tone === "alert" ? "text-destructive" : "text-navy", (href || onClick) && "group-hover:underline group-focus-visible:underline")}>{item.value}</p>
        {item.sub && <p className={cn("mt-0.5 break-words text-sm", item.tone === "alert" ? "font-medium text-destructive" : "text-muted-foreground")}>{item.sub}</p>}
      </div>
      {(href || onClick) && <ChevronRight aria-hidden className="absolute right-3 top-4 size-4 shrink-0 text-muted-foreground opacity-40 sm:static sm:mt-1 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />}
    </>
  )
  if (href) {
    return (
      <Link href={href} data-slot="summary-cell" data-link className={cn(CELL, TARGET, "min-h-11")}>
        {body}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} data-slot="summary-cell" data-link className={cn(CELL, TARGET, "min-h-11")}>
        {body}
      </button>
    )
  }
  return (
    <div data-slot="summary-cell" className={CELL}>
      {body}
    </div>
  )
}
