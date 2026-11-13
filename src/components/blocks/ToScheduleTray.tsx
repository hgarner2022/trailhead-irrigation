import { Button } from "@/components/ui/button"
import type { TrayItem } from "@/app/(admin)/admin/_screens/schedule-model"
import { KIND_WORDS } from "@/lib/admin/format"
import { cn } from "@/lib/utils"
import { EmptyState } from "./EmptyState"

// The list beside the week: every job that needs a day, for active passes
// only (a job with a day is never here, an unpaid pass's job is never here),
// earliest window first, so the work of scheduling is done on the Schedule
// and not found on Customers. Place puts the job on the week; Schedule fills
// the whole list at once. A customer who must be there picks their own day,
// so their row says so instead of offering Place. A refused Place says why
// under its row, in the API's own words, and nowhere else on the page. Pure
// render; the screen owns the state.

export interface ToScheduleTrayProps {
  items: TrayItem[]
  onPlace?: (item: TrayItem) => void
  /** hides Place for a person who reads the schedule and does not change it */
  readOnly?: boolean
  /** why a Place was refused, by item id */
  problems?: Record<string, string>
  className?: string
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "Turn-on, May" or "Inspection, July": what the job is and the month it belongs to. */
export function trayLine(item: TrayItem): string {
  return `${capital(KIND_WORDS[item.kind])}, ${item.window}`
}

export function ToScheduleTray({ items, onPlace, readOnly, problems = {}, className }: ToScheduleTrayProps) {
  if (items.length === 0) return <EmptyState className={className} title="Nothing needs a day" line="Jobs of active passes with no day show here." />
  return (
    <ol data-slot="to-schedule-tray" className={cn("divide-y divide-border", className)}>
      {items.map((item) => (
        <li key={item.id} className="py-2.5">
          <div className="flex items-center gap-3">
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
          </div>
          {problems[item.id] && (
            <p data-slot="tray-problem" role="alert" className="mt-1.5 text-xs text-destructive">
              {problems[item.id]}
            </p>
          )}
        </li>
      ))}
    </ol>
  )
}
