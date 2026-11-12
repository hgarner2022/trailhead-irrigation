"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { BlowoutWeek } from "@/lib/admin/types"
import { spotsLeft } from "@/lib/admin/metrics"
import { shortDate } from "./data-grid-columns"

// One blowout week for the October planner: the week named by its Monday,
// the spots still open as the big number, how many are taken, and the towns
// booked so far as chips. A full week turns the number warning and adds a
// Full chip. With `onSelect` the whole card is a pressed button (the
// checkout's week picker); with `editable` the taken line becomes a
// capacity input. The two do not combine: an input cannot live inside a
// button, so an editable card is always a plain card. Client because of
// the input and the click.

export interface WeekCardProps {
  week: BlowoutWeek
  selected?: boolean
  editable?: boolean
  onCapacityChange?: (capacity: number) => void
  onSelect?: () => void
  className?: string
}

const SURFACE = "flex flex-col gap-4 rounded-lg border border-border bg-card p-4 text-left text-card-foreground shadow-sm"

export function WeekCard({ week, selected = false, editable = false, onCapacityChange, onSelect, className }: WeekCardProps) {
  const inputId = useId()
  const left = spotsLeft(week)
  const full = left === 0
  const selectable = !!onSelect && !editable

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-lg leading-tight text-navy">{`Week of ${shortDate(week.weekStart)}`}</p>
        <p className="text-xs text-muted-foreground">{`Season ${week.season}`}</p>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p data-slot="week-spots" className={cn("font-display text-4xl font-semibold leading-none tabular-nums", full ? "text-warning" : "text-navy")}>
            {left}
          </p>
          {full && (
            <Badge variant="outline" className="border-warning/30 bg-background text-warning">
              Full
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">spots left</p>
        {editable ? (
          <div className="mt-3 flex items-center gap-2">
            <Label htmlFor={inputId} className="text-xs text-muted-foreground">
              Capacity
            </Label>
            <Input
              id={inputId}
              type="number"
              min={0}
              value={week.capacity}
              onChange={(event) => onCapacityChange?.(Number(event.target.value))}
              className="h-9 w-20 tabular-nums"
            />
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">{`${week.taken} of ${week.capacity} taken`}</p>
        )}
      </div>
      {week.towns.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {week.towns.map((town) => (
            <li key={town}>
              <Badge data-slot="week-town" variant="outline" className="bg-background">
                {town}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </>
  )

  if (selectable) {
    return (
      <button
        type="button"
        data-slot="week-card"
        data-selected={selected}
        data-full={full || undefined}
        aria-pressed={selected}
        onClick={onSelect}
        className={cn(
          SURFACE,
          "w-full cursor-pointer transition-colors hover:border-navy/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          selected && "ring-2 ring-primary",
          className,
        )}
      >
        {body}
      </button>
    )
  }
  return (
    <Card data-slot="week-card" data-selected={selected} data-full={full || undefined} className={cn(SURFACE, className)}>
      {body}
    </Card>
  )
}
