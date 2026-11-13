import { Button } from "@/components/ui/button"
import type { TrayItem } from "@/app/(admin)/admin/_screens/schedule-model"
import { KIND_WORDS, preferenceLabel } from "@/lib/admin/format"
import { cn } from "@/lib/utils"
import { EmptyState } from "./EmptyState"

// The tray beside the week: every visit that has no day yet (an open Jobber
// job, a pass visit waiting inside its window), earliest window first, so
// the job of scheduling is done on the Schedule and not found on Customers
// (the review, 2026-11-12). Place puts the item on the week; Schedule fills
// the whole tray at once. A customer who must be there picks their own day
// (the scheduling flow), so their row says so instead of offering Place.
// Pure render; the screen owns the state.

export interface ToScheduleTrayProps {
  items: TrayItem[]
  onPlace?: (item: TrayItem) => void
  /** hides Place for a person who reads the schedule and does not change it */
  readOnly?: boolean
  className?: string
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "Turn-on, early May" or "Inspection, July" or "Repair, open job". */
export function trayLine(item: TrayItem): string {
  const when = item.preference && (item.kind === "turn-on" || item.kind === "blowout") ? preferenceLabel(item.kind, item.preference).toLowerCase().replace(/^(\w)/, (m) => m) : item.window.toLowerCase()
  return `${capital(KIND_WORDS[item.kind])}, ${when}`
}

export function ToScheduleTray({ items, onPlace, readOnly, className }: ToScheduleTrayProps) {
  if (items.length === 0) return <EmptyState className={className} title="Nothing to schedule" line="Pass visits and open jobs waiting for a day show here." />
  return (
    <ol data-slot="to-schedule-tray" className={cn("divide-y divide-border", className)}>
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 py-2.5">
          <span className="min-w-0 flex-1 text-sm">
            <span className="block truncate font-medium text-foreground">{`${item.clientName} · ${item.town}`}</span>
            <span className="block text-muted-foreground">{trayLine(item)}</span>
          </span>
          {item.awaitingPick ? (
            <span data-slot="tray-waiting" className="shrink-0 text-xs font-medium text-primary-deep">Customer picks the day</span>
          ) : readOnly ? null : (
            <Button size="sm" variant="outline" aria-label={`Place ${item.clientName}, ${trayLine(item).toLowerCase()}`} onClick={() => onPlace?.(item)}>
              Place
            </Button>
          )}
        </li>
      ))}
    </ol>
  )
}
