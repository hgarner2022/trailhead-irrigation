import { firstNameOf } from "@/lib/admin/people"
import type { Person } from "@/lib/admin/types"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"
import { hourWords, minutesToPx, type HourRange } from "./time-grid-model"
import { personStyle } from "./time-grid-style"
import type { GridColumn } from "./time-grid-types"

// The two fixed edges of the clock: the head of a day and the hour gutter at the left (a label on each hour, the now dot on today). The grid keeps both stuck while it scrolls.
// The Week's head is the day and one chip, "3 visits" or "Full", and nothing else (docs/plans/2026-11-26-scheduler-review-research.md, point 4); the day is a button that opens that
// day, and hovering or focusing it opens a small card with the towns, each person's open time and driving. The Day's head carries all of that in view: the day, the count, the towns
// and each person's name with their open time and driving. Pure props.

export const GUTTER = "w-14 shrink-0"

/** What the Week head's card says, line by line: "Erie 2, Lafayette 1", "Ryan 4 h open. 38 min driving.". Empty when there is nothing to say. */
export function dayDetailLines(column: GridColumn, people: readonly Person[]): string[] {
  const lines: string[] = []
  if (column.towns) lines.push(column.towns)
  for (const p of people) {
    const stat = column.stats?.[p.id]
    if (!stat) continue
    const parts = [stat.open && `${stat.open}.`, stat.driving && `${stat.driving} driving.`].filter(Boolean)
    if (parts.length) lines.push(`${firstNameOf(p.name)} ${parts.join(" ")}`)
  }
  return lines
}

/** Under the Week's day: each person column named by its colour dot and first name, or by initials from five people. Nothing for one person. */
export function PersonSubRow({ people, colourOf }: { people: readonly Person[]; colourOf: (id: string) => number }) {
  if (people.length < 2) return null
  const initials = people.length >= 5
  return (
    <div data-slot="person-subrow" className="flex border-t border-border/60">
      {people.map((p) => (
        <span key={p.id} role="img" aria-label={p.name} title={p.name} tabIndex={initials ? 0 : undefined} className="flex min-w-0 flex-1 items-center justify-center gap-1 px-0.5 py-1 text-[11px] leading-none text-navy-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50">
          {initials ? (
            <span aria-hidden className={cn("flex size-5 shrink-0 items-center justify-center rounded-full bg-card text-[9px] font-semibold text-navy ring-2", personStyle(colourOf(p.id)).ring)}>{p.initials}</span>
          ) : (
            <>
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", personStyle(colourOf(p.id)).dot)} />
              <span aria-hidden className="truncate">{firstNameOf(p.name)}</span>
            </>
          )}
        </span>
      ))}
    </div>
  )
}

export function DayHead({ column, people, colourOf, variant = "week", onOpenDay }: { column: GridColumn; people: readonly Person[]; colourOf: (id: string) => number; variant?: "week" | "day"; /** the Week's day opens that day */ onOpenDay?: (day: string) => void }) {
  const chip = column.caption ?? column.count
  const label = (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-sm font-semibold", column.today ? "bg-navy text-white" : "text-navy")}>
      {column.label}
      {column.today && <span className="sr-only">, today</span>}
    </span>
  )
  const chipEl = chip && <span data-slot="day-count" className={cn("truncate text-xs", chip === "Full" ? "font-medium text-warning-ink" : "text-navy-light")}>{chip}</span>
  if (variant === "week") {
    const lines = dayDetailLines(column, people)
    const trigger = onOpenDay ? (
      <button type="button" aria-label={`${column.label}${column.today ? ", today" : ""}${chip ? `, ${chip}` : ""}. Open the day`} onClick={() => onOpenDay(column.day)} className="inline-flex min-h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
        {label}
        {chipEl}
      </button>
    ) : (
      <span className="inline-flex items-center gap-1.5">{label}{chipEl}</span>
    )
    return (
      <div data-slot="day-head" data-variant="week" className="flex min-w-0 flex-col">
      <div className="flex min-w-0 items-center justify-center px-1 py-1.5">
        {lines.length ? (
          <HoverCard openDelay={250} closeDelay={80}>
            <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
            <HoverCardContent data-slot="day-detail" side="bottom" align="center" className="w-auto max-w-72 p-3 text-sm">
              <ul className="space-y-0.5 text-navy">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
            </HoverCardContent>
          </HoverCard>
        ) : trigger}
      </div>
      <PersonSubRow people={people} colourOf={colourOf} />
      </div>
    )
  }
  return (
    <div data-slot="day-head" data-variant="day" className="flex min-w-0 flex-col items-stretch gap-0.5 px-1 py-1.5">
      <div className="flex min-w-0 items-center justify-center gap-1.5">
        {label}
        {chipEl}
      </div>
      {column.towns && <span className="truncate text-center text-xs text-navy-light">{column.towns}</span>}
      <div className="flex">
        {people.map((p) => {
          const stat = column.stats?.[p.id]
          return (
            <span key={p.id} className="flex min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap px-0.5 text-xs leading-tight text-navy-light">
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", personStyle(colourOf(p.id)).dot)} />
              <span className="truncate">
                <span className="font-medium text-navy">{firstNameOf(p.name)}</span>
                {stat && ` ${[stat.open, stat.driving && `${stat.driving} drive`].filter(Boolean).join(" · ")}`}
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
