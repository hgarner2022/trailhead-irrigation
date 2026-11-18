import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// One of Today's three groups (owner, 17 Nov 2026): a heading with the count in it, "2 past their window", "3 ahead today",
// "4 done today", then its rows, or "Nothing here" in muted text when the group is empty. Rows are the children, `TodayVisitRow`s.
// The words are the only ones this screen uses for a visit's standing (never Overdue, Active, Remaining or Completed). Pure render.

export type TodayGroupWords = "past" | "ahead" | "done"

/** "1 past its window" / "2 past their window", "3 ahead today", "4 done today". */
export function groupHeading(group: TodayGroupWords, count: number): string {
  if (group === "past") return count === 1 ? "1 past its window" : `${count} past their window`
  return `${count} ${group === "ahead" ? "ahead today" : "done today"}`
}

export interface TodayGroupProps {
  group: TodayGroupWords
  count: number
  children?: ReactNode
  className?: string
}

export function TodayGroup({ group, count, children, className }: TodayGroupProps) {
  const id = `today-group-${group}`
  return (
    <section data-slot="today-group" data-group={group} aria-labelledby={id} className={cn("space-y-2", className)}>
      <h3 id={id} className={cn("text-sm font-medium", group === "past" && count > 0 ? "text-warning" : "text-navy")}>
        {groupHeading(group, count)}
      </h3>
      {count > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">{children}</ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing here</p>
      )}
    </section>
  )
}
