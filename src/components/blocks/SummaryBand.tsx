import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// The summary band at the top of a customer record page, like Mailchimp's row of key figures under a campaign's title but in our tokens (docs/plans/2026-11-19-customer-side-polish-research.md,
// section 1e): one white card, the key facts side by side from `sm` up and two by two on a phone, each a quiet 12px label over a value in weight (16px semibold navy), or a badge.
// Pure props, server-safe.

export interface SummaryItem {
  label: string
  value: ReactNode
}

export function SummaryBand({ items, className }: { items: SummaryItem[]; className?: string }) {
  return (
    <Card data-slot="summary-band" className={cn("overflow-hidden", className)}>
      <dl className={cn("grid grid-cols-2 gap-px bg-border", items.length > 3 ? "sm:grid-cols-4" : items.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {items.map((i) => (
          <div key={i.label} className="min-w-0 space-y-1 bg-card p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{i.label}</dt>
            <dd className="text-base font-semibold text-navy">{i.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
