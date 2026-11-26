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
    <div data-slot="person-subrow" className="flex">
      {people.map((p) => (
        <span key={p.id} role="img" aria-label={p.name} title={p.name} tabIndex={initials ? 0 : undefined} className="type-admin-dense flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-sm px-0.5 pb-1.5 leading-none text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", personStyle(colourOf(p.id)).dot)} />
          <span aria-hidden className="truncate">{initials ? p.initials : firstNameOf(p.name)}</span>
        </span>
      ))}
    </div>
  )
}

export function DayHead({ column, people, colourOf, variant = "week", onOpenDay }: { column: GridColumn; people: readonly Person[]; colourOf: (id: string) => number; variant?: "week" | "day"; /** the Week's day opens that day */ onOpenDay?: (day: string) => void }) {
  const chip = column.caption ?? column.count
  const label = (
    <span className={cn("type-admin-label shrink-0 font-semibold", column.today ? "text-primary-dark" : "text-navy")}>
      {column.label}
      {column.today && <span className="sr-only">, today</span>}
    </span>
  )
  const chipEl = chip && <span data-slot="day-count" className={cn("type-admin-dense truncate tabular-nums", chip === "Full" ? "font-semibold text-warning-ink" : "text-muted-foreground")}>{chip}</span>
  if (variant === "week") {
    const lines = dayDetailLines(column, people)
    const trigger = onOpenDay ? (
      <button type="button" aria-label={`${column.label}${column.today ? ", today" : ""}${chip ? `, ${chip}` : ""}. Open the day`} onClick={() => onOpenDay(column.day)} className="inline-flex min-h-8 cursor-pointer items-baseline justify-center gap-2 rounded-md px-2 transition-colors duration-(--motion-fast) hover:bg-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
        {label}
        {chipEl}
      </button>
    ) : (
      <span className="inline-flex min-h-8 items-baseline gap-2 px-2">{label}{chipEl}</span>
    )
    return (
      <div data-slot="day-head" data-variant="week" className="flex min-w-0 flex-col">
      <div className="flex min-w-0 items-center justify-center px-1 pb-0.5 pt-1.5">
        {lines.length ? (
          <HoverCard openDelay={250} closeDelay={80}>
            <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
            <HoverCardContent data-slot="day-detail" side="bottom" align="center" sideOffset={28} className="type-admin-body w-auto max-w-72 p-3">
              <ul className="space-y-1 text-navy">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
            </HoverCardContent>
          </HoverCard>
        ) : trigger}
      </div>
      <PersonSubRow people={people} colourOf={colourOf} />
      </div>
    )
  }
  return (
    <div data-slot="day-head" data-variant="day" className="flex min-w-0 flex-col items-stretch gap-1 px-1 pb-2 pt-2">
      <div className="flex min-w-0 items-baseline justify-center gap-2">
        {label}
        {chipEl}
      </div>
      {column.towns && <span className="type-admin-dense truncate text-center text-muted-foreground">{column.towns}</span>}
      <div className="flex">
        {people.map((p) => {
          const stat = column.stats?.[p.id]
          return (
            <span key={p.id} className="type-admin-dense flex min-w-0 flex-1 items-start justify-center gap-1.5 px-0.5 text-center text-muted-foreground">
              <span aria-hidden className={cn("mt-[0.3em] size-1.5 shrink-0 rounded-full", personStyle(colourOf(p.id)).dot)} />
              <span className="min-w-0">
                <span className="font-semibold text-navy">{firstNameOf(p.name)}</span>
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
    <div aria-hidden data-slot="hour-gutter" className={cn("type-admin-dense relative bg-background text-right tabular-nums text-muted-foreground", GUTTER, className)} style={{ height: minutesToPx((range.end - range.start) * 60, hourPx) }}>
      {hours.map((h, i) => (
        <span key={h} className="absolute right-2 -translate-y-1/2 leading-none" style={{ top: i === 0 ? 8 : i * hourPx }}>
          {hourWords(h)}
        </span>
      ))}
      {nowMinutes !== undefined && nowMinutes >= range.start * 60 && nowMinutes <= range.end * 60 && (
        <span data-slot="now-dot" className="absolute -right-[3px] size-1.5 -translate-y-1/2 rounded-full bg-destructive" style={{ top: minutesToPx(nowMinutes - range.start * 60, hourPx) }} />
      )}
    </div>
  )
}
