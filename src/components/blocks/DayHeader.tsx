import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

// The head of a Schedule day (docs/plans/2026-11-18-admin-holistic-design.md, 5.2): the day's name, how full it is ("5 stops, 3 h open") and the towns
// already in it ("Erie 3, Lafayette 2"), so Ryan sees the day filling by neighbourhood before he places anything. Today is marked. The "+" opens New job
// with the day filled in, and is left off for a tech, who reads the week. Pure render: the words come from `fillWords` and `townsWords`
// (src/lib/admin/day-fill.ts) and the screen decides which element wraps it (a table header in the week, a heading in the day).

export interface DayHeaderProps {
  /** "Tue 24" */
  label: string
  /** YYYY-MM-DD, for the "+" button's name and the callback */
  day: string
  today?: boolean
  /** "5 stops, 3 h open" */
  fill: string
  /** "Erie 3, Lafayette 2"; empty for an empty day */
  towns: string
  onNewJob?: (day: string) => void
  className?: string
}

export function DayHeader({ label, day, today, fill, towns, onNewJob, className }: DayHeaderProps) {
  return (
    <div data-slot="day-header" className={cn("min-w-0", className)}>
      <span className="flex items-center justify-between gap-1">
        <span className="font-display text-sm uppercase tracking-wide">
          {label}
          {today && <span className="sr-only">, today</span>}
        </span>
        {onNewJob && (
          <button
            type="button"
            data-slot="week-grid-new-job"
            aria-label={`New job on ${label}`}
            title="New job"
            onClick={() => onNewJob(day)}
            className="-my-1.5 flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-cream hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        )}
      </span>
      <span data-slot="day-fill" className={cn("block text-xs font-normal normal-case tracking-normal", today ? "text-primary-deep" : "text-muted-foreground")}>{fill}</span>
      {towns && <span data-slot="day-towns" title={towns} className={cn("block truncate text-xs font-normal normal-case tracking-normal", today ? "text-primary-deep" : "text-muted-foreground")}>{towns}</span>}
    </div>
  )
}
