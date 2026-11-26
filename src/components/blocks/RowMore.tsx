"use client"

import { ExternalLink, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// The More of a table row (Hannah, Nov 25 2026: a row shows at most ONE action; the rest are under More). A quiet three-dot button, 44px on a phone and 36px from `md`,
// that opens the row's other actions as a menu: a button that acts (Collect payment), a link that leaves (Open in Stripe, in a new tab) and, last and in the destructive
// colour, the one that undoes money (Refund $145). With nothing to hold it draws nothing, so a row with one action has no empty menu. `label` says whose menu it is to a
// screen reader ("More for INV-2026-0042").

export interface RowMoreItem {
  label: string
  onSelect?: () => void
  /** a link in place of an action; `external` opens it in a new tab */
  href?: string
  external?: boolean
  destructive?: boolean
}

export function RowMore({ label, items }: { label: string; items: readonly (RowMoreItem | false | undefined)[] }) {
  const shown = items.filter((i): i is RowMoreItem => Boolean(i))
  if (shown.length === 0) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" data-slot="row-more" className="size-11 shrink-0 md:size-9" aria-label={label}>
          <MoreHorizontal className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {shown.map((item) =>
          item.href ? (
            <DropdownMenuItem key={item.label} asChild className="min-h-11 md:min-h-9">
              <a href={item.href} {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {item.label}
                {item.external && (
                  <>
                    <ExternalLink aria-hidden />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </>
                )}
              </a>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={item.label} variant={item.destructive ? "destructive" : "default"} className="min-h-11 md:min-h-9" onSelect={item.onSelect}>
              {item.label}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
