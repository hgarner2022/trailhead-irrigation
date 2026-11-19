import { Button } from "@/components/ui/button"
import type { TrayItem } from "@/app/(admin)/admin/_screens/schedule-model"
import { KIND_WORDS } from "@/lib/admin/format"
import { EmptyState } from "./EmptyState"

// The Unscheduled list under the week: every visit that needs a day, a pass's or a
// one-off job's (a job with a day is never here, an unpaid pass's job is
// never here), one-off jobs first, then the earliest window, so the work of scheduling is done on the Schedule
// and not found on Customers. Place puts one job on the next open day with the first person who has room; a quiet
// "Place all N" above the list puts every job at once, after a preview (docs/plans/2026-11-18-admin-holistic-design.md, 5.2).
// A customer who must be there picks their own day, so their row says so instead of offering Place. A refused Place says why
// under its row, in the API's own words, and nowhere else on the page; a job nothing has room for says so under its
// row with "Another day", which opens the job to pick one by hand. Pure render; the screen owns the state.

export interface ToScheduleTrayProps {
  items: TrayItem[]
  onPlace?: (item: TrayItem) => void
  /** Place all: opens the preview; the button is not drawn without it, or when every job is one a customer is picking */
  onPlaceAll?: () => void
  /** "Another day" under a job nothing has room for: the screen opens the job */
  onAnotherDay?: (item: TrayItem) => void
  /** why no day was found for a job, by item id (the words of section 10) */
  noRoom?: Record<string, string>
  /** hides Place for a person who reads the schedule and does not change it */
  readOnly?: boolean
  /** why a Place was refused, by item id */
  problems?: Record<string, string>
  className?: string
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "Turn-on, May" or "Inspection, July": what the job is and the month it belongs to; a one-off job is just "Repair". */
export function trayLine(item: TrayItem): string {
  return item.window ? `${capital(KIND_WORDS[item.kind])}, ${item.window}` : capital(KIND_WORDS[item.kind])
}

export function ToScheduleTray({ items, onPlace, onPlaceAll, onAnotherDay, noRoom = {}, readOnly, problems = {}, className }: ToScheduleTrayProps) {
  if (items.length === 0) return <EmptyState className={className} title="Every job has a day." line="A job with no day waits here until you schedule it." />
  const placeable = items.filter((i) => !i.awaitingPick).length
  return (
    <div className={className}>
      {onPlaceAll && !readOnly && placeable > 0 && (
        <div className="mb-2 flex justify-end">
          <Button type="button" size="sm" variant="outline" className="min-h-11" onClick={onPlaceAll}>
            {`Schedule all ${placeable}`}
          </Button>
        </div>
      )}
      <ol data-slot="to-schedule-tray" className="divide-y divide-border">
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
                <Button size="sm" variant="outline" aria-label={`Schedule ${item.clientName}, ${trayLine(item).toLowerCase()}`} onClick={() => onPlace?.(item)}>
                  Schedule
                </Button>
              )}
            </div>
            {problems[item.id] && (
              <p data-slot="tray-problem" role="alert" className="mt-1.5 text-xs text-destructive">
                {problems[item.id]}
              </p>
            )}
            {noRoom[item.id] && (
              <div data-slot="tray-no-room" className="mt-1.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                <p>{noRoom[item.id]}</p>
                {onAnotherDay && !readOnly && (
                  <Button type="button" size="sm" variant="link" className="h-auto min-h-11 p-0 text-xs text-primary-dark hover:text-primary-deep" onClick={() => onAnotherDay(item)}>
                    Another day
                  </Button>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
