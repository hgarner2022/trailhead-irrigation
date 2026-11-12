"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { BlowoutWeek } from "@/lib/admin/types"
import { shortDate } from "@/lib/admin/format"
import { spotsLeft } from "@/lib/admin/metrics"

// One blowout week for the October planner: the week named by its Monday,
// the spots still open as the big number, how many are taken, and the towns
// booked so far as chips. A full week turns the number warning and adds a
// Full chip; it stays pressable, and the checkout screen decides whether to
// disable it. With `onSelect` the whole card is a pressed button (the
// checkout's week picker), so its children are spans only; with `editable`
// the taken line becomes a capacity input. The two do not combine, since an
// input cannot live inside a button, and the types say so. Client because
// of the input and the click.

interface WeekCardBase {
  week: BlowoutWeek
  className?: string
}
export interface PlainWeekCardProps extends WeekCardBase {
  editable?: false
  onCapacityChange?: never
  selected?: never
  onSelect?: never
}
export interface EditableWeekCardProps extends WeekCardBase {
  editable: true
  onCapacityChange?: (capacity: number) => void
  selected?: never
  onSelect?: never
}
export interface SelectableWeekCardProps extends WeekCardBase {
  onSelect: () => void
  selected?: boolean
  editable?: never
  onCapacityChange?: never
}
export type WeekCardProps = PlainWeekCardProps | EditableWeekCardProps | SelectableWeekCardProps

const SURFACE = "flex flex-col gap-4 rounded-lg border border-border bg-card p-4 text-left text-card-foreground shadow-sm"

export function WeekCard(props: WeekCardProps) {
  const { week, className } = props
  const inputId = useId()
  const left = spotsLeft(week)
  const full = left === 0
  const selectable = "onSelect" in props && !!props.onSelect
  const selected = selectable ? !!props.selected : false
  // Inside a button only phrasing content is valid, so the pieces are spans
  // there and paragraphs and a list in the plain card.
  const Block = selectable ? "span" : "p"
  const List = selectable ? "span" : "ul"
  const Item = selectable ? "span" : "li"

  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <Block className="font-display text-lg leading-tight text-navy">{`Week of ${shortDate(week.weekStart)}`}</Block>
        <Block className="text-xs text-muted-foreground">{`Season ${week.season}`}</Block>
      </span>
      <span className="block">
        <span className="flex items-center gap-2">
          <Block data-slot="week-spots" className={cn("font-display text-4xl font-semibold leading-none tabular-nums", full ? "text-warning" : "text-navy")}>
            {left}
          </Block>
          {full && (
            <Badge variant="outline" className="border-warning/30 bg-background text-warning">
              Full
            </Badge>
          )}
        </span>
        <Block className="mt-1 block text-sm text-muted-foreground">spots left</Block>
        {props.editable ? (
          <div className="mt-3 flex items-center gap-2">
            <Label htmlFor={inputId} className="text-xs text-muted-foreground">
              Capacity
            </Label>
            <Input
              id={inputId}
              type="number"
              min={0}
              value={week.capacity}
              onChange={(event) => props.onCapacityChange?.(Number(event.target.value))}
              className="h-9 w-20 tabular-nums"
            />
          </div>
        ) : (
          <Block className="mt-1 block text-xs text-muted-foreground">{`${week.taken} of ${week.capacity} taken`}</Block>
        )}
      </span>
      {week.towns.length > 0 && (
        <List className="flex flex-wrap gap-1.5">
          {week.towns.map((town) => (
            <Item key={town}>
              <Badge data-slot="week-town" variant="outline" className="bg-background">
                {town}
              </Badge>
            </Item>
          ))}
        </List>
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
        aria-disabled={false}
        onClick={props.onSelect}
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
    <Card data-slot="week-card" data-selected={false} data-full={full || undefined} className={cn(SURFACE, className)}>
      {body}
    </Card>
  )
}
