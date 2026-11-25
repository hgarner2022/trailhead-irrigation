import type { ReactNode } from "react"
import { firstNameOf } from "@/lib/admin/people"
import type { Person } from "@/lib/admin/types"
import { cn } from "@/lib/utils"
import { hourWords, minutesToPx, type HourRange } from "./time-grid-model"
import { personStyle } from "./time-grid-style"
import type { GridColumn } from "./time-grid-types"

// The two fixed edges of the clock: the head of a day (Jobber's "23 Mon" with today as a filled pill, a small count chip, an optional
// caption such as the day's fill, and each person under it as a small initials avatar in their colour, or their name in the Day view)
// and the hour gutter at the left (a label on each hour, the now dot on today). The grid keeps both stuck while it scrolls.
// Pure props.

export const GUTTER = "w-14 shrink-0"

export function DayHead({ column, people, colourOf, action }: { column: GridColumn; people: readonly Person[]; colourOf: (id: string) => number; /** no longer chooses between a name and initials: the first name is always shown */ names?: boolean; action?: ReactNode }) {
  // Three lines at most, whatever the width: the day and its stop count ("Full" in the count's place), the towns, and one line per person (name, then "7 h 30 open · 24 min drive"). The head asks
  // its own width (a container query): narrower, the towns go first, then the line shortens to the driving figure alone ("24 min drive", then "24 min"). The Day view's head is wide enough for it all.
  return (
    <div data-slot="day-head" className="@container flex min-w-0 flex-col items-stretch gap-0.5 px-1 py-1.5">
      <div className="flex min-w-0 items-center justify-center gap-1.5">
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-sm font-semibold", column.today ? "bg-navy text-white" : "text-navy")}>
          {column.label}
          {column.today && <span className="sr-only">, today</span>}
        </span>
        {column.caption && <span className={cn("truncate text-xs", column.caption === "Full" ? "font-medium text-warning-ink" : "text-navy-light")}>{`· ${column.caption}`}</span>}
        {action}
      </div>
      {column.towns && <span className="hidden truncate text-center text-xs text-navy-light @[170px]:block">{column.towns}</span>}
      <div className="flex">
        {people.map((p) => {
          const stat = column.stats?.[p.id]
          const full = stat?.open === "Full"
          return (
            <span key={p.id} className="flex min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap px-0.5 text-[11px] leading-tight text-navy-light">
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", personStyle(colourOf(p.id)).dot)} />
              <span className="truncate">
                <span className="font-medium text-navy">{firstNameOf(p.name)}</span>
                {stat && (
                  <>
                    <span className="hidden @[320px]:inline">{` ${[stat.open, stat.driving && `${stat.driving} drive`].filter(Boolean).join(" · ")}`}</span>
                    <span className="hidden @[230px]:inline @[320px]:hidden">{` ${[full && "Full", stat.driving && `${stat.driving} drive`].filter(Boolean).join(" · ")}`}</span>
                    <span className="@[230px]:hidden">{` ${[full && "Full", stat.driving].filter(Boolean).join(" · ")}`}</span>
                  </>
                )}
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function HourGutter({ range, hourPx, nowMinutes, className }: { range: HourRange; hourPx: number; nowMinutes?: number; className?: string }) {
  const hours = Array.from({ length: range.end - range.start }, (_, i) => range.start + i)
  return (
    <div aria-hidden data-slot="hour-gutter" className={cn("relative border-r border-border bg-background text-right text-xs tabular-nums text-navy-light", GUTTER, className)} style={{ height: minutesToPx((range.end - range.start) * 60, hourPx) }}>
      {hours.map((h, i) => (
        <span key={h} className="absolute right-2 -translate-y-1/2 bg-background px-0.5" style={{ top: i === 0 ? 8 : i * hourPx }}>
          {hourWords(h)}
        </span>
      ))}
      {nowMinutes !== undefined && nowMinutes >= range.start * 60 && nowMinutes <= range.end * 60 && (
        <span data-slot="now-dot" className="absolute -right-1 size-2.5 -translate-y-1/2 rounded-full bg-destructive" style={{ top: minutesToPx(nowMinutes - range.start * 60, hourPx) }} />
      )}
    </div>
  )
}
