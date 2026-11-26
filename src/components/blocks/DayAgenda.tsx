"use client"

import { Fragment } from "react"
import { Check, Clock3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { blockLabel } from "./TimeBlock"
import { clockWords, timeOffLabel, type GridBlock, type TimeOff } from "./time-grid-model"
import { personStyle } from "./time-grid-style"
import type { ColumnStat } from "./time-grid-types"

// One day on a phone as an agenda (docs/plans/2026-11-26-scheduler-review-research.md, the phone pass): with one person shown a time-ordered list reads better than a narrow clock. The Any time
// visits come first, numbered in the order the day is driven, then the timed visits in order, each row 56 px or more: the time at the left, the street over the service and town, the
// mark of its state at the right, and the quiet "12 min drive" line between rows. Time off is a labelled row and the now marker a thin line between rows. With two or more people the same list is grouped
// under each person's name with their open time and driving. A row is one button that opens the visit (the peek). No drag, no hover. Pure props, client component.

export interface AgendaPerson {
  id: string
  name: string
  /** the first name, the group heading */
  first: string
  /** the colour's place in the whole list */
  colour: number
}

export interface DayAgendaProps {
  day: string
  people: readonly AgendaPerson[]
  /** every visit of the day, timed or not; the Any time ones in the order they are driven */
  blocks: readonly GridBlock[]
  timeOff?: readonly TimeOff[]
  /** each person's open time and driving, from the column */
  stats?: Readonly<Record<string, ColumnStat>>
  drives?: ReadonlyMap<string, number>
  now?: { day: string; minutes: number }
  conflicts?: ReadonlyMap<string, string>
  selectedId?: string
  onSelect?: (id: string) => void
  onTimeOffClick?: (id: string) => void
  className?: string
}

type Item = { kind: "visit"; block: GridBlock; at: number; number?: number } | { kind: "off"; off: TimeOff; at: number }

/** One person's day as rows: Any time first (numbered), then the timed visits and time off by start. */
export function agendaItems(blocks: readonly GridBlock[], timeOff: readonly TimeOff[], personId: string, day: string): Item[] {
  const mine = blocks.filter((b) => b.personId === personId && b.day === day)
  const any = mine.filter((b) => b.start === null).map((block, i): Item => ({ kind: "visit", block, at: -1, number: i + 1 }))
  const timed = mine.filter((b) => b.start !== null).map((block): Item => ({ kind: "visit", block, at: block.start! }))
  const off = timeOff.filter((o) => o.personId === personId && o.day === day).map((o): Item => ({ kind: "off", off: o, at: o.start ?? -1 }))
  return [...any, ...[...timed, ...off].sort((a, b) => a.at - b.at)]
}

export function DayAgenda({ day, people, blocks, timeOff = [], stats, drives, now, conflicts, selectedId, onSelect, onTimeOffClick, className }: DayAgendaProps) {
  const nowAt = now && now.day === day ? now.minutes : null
  return (
    <div data-slot="day-agenda" className={cn("flex min-w-0 flex-col gap-4", className)}>
      {people.map((p) => {
        const items = agendaItems(blocks, timeOff, p.id, day)
        const s = personStyle(p.colour)
        const stat = stats?.[p.id]
        const nowIndex = nowAt === null ? -1 : items.findIndex((it) => it.at >= 0 && it.at > nowAt)
        const nowLast = nowAt !== null && nowIndex === -1 && items.some((it) => it.at >= 0 && it.at <= nowAt)
        const nowLine = <li aria-hidden data-slot="now-line" className="h-0 border-t-2 border-destructive" />
        return (
          <section key={p.id} aria-label={p.name} data-person={p.id}>
            {people.length > 1 && (
              <p data-slot="agenda-person" className="mb-1 flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-semibold text-navy">{p.first}</span>
                {stat && <span className="text-xs text-navy-light">{[stat.open, stat.driving && `${stat.driving} driving`].filter(Boolean).join(", ")}</span>}
              </p>
            )}
            {items.length === 0 ? (
              <p className="rounded-lg border border-border bg-background px-3 py-3 text-sm text-muted-foreground">Nothing booked</p>
            ) : (
              <ol className="overflow-hidden rounded-lg border border-border bg-background">
                {items.map((it, i) => {
                  const drive = it.kind === "visit" && it.block.start !== null ? drives?.get(it.block.id) : undefined
                  return (
                    <Fragment key={it.kind === "visit" ? it.block.id : it.off.id}>
                      {i === nowIndex && nowLine}
                      {drive ? <li aria-hidden data-slot="drive-line" className="border-t border-border/60 bg-stone/40 px-3 py-0.5 text-[11px] text-navy-light">{`${drive} min drive`}</li> : null}
                      {it.kind === "off" ? (
                        <li data-slot="time-off-row" className="border-t border-border/60 first:border-t-0">
                          <button type="button" onClick={onTimeOffClick ? () => onTimeOffClick(it.off.id) : undefined} disabled={!onTimeOffClick} className="flex min-h-14 w-full items-center bg-navy/5 px-3 text-left text-sm text-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50">
                            {timeOffLabel(it.off, p.first)}
                          </button>
                        </li>
                      ) : (
                        <li data-slot="agenda-row" data-id={it.block.id} data-conflict={conflicts?.get(it.block.id) ? "true" : undefined} className={cn("border-t border-border/60 first:border-t-0", "border-l-4", it.block.done ? "border-l-muted bg-stone/60 text-navy-light" : s.bar, selectedId === it.block.id && "ring-2 ring-inset ring-navy", conflicts?.get(it.block.id) && "outline outline-2 -outline-offset-2 outline-destructive")}>
                          <button type="button" data-slot="time-block-button" aria-label={`${it.number ? `Stop ${it.number}, ` : ""}${blockLabel(it.block, conflicts?.get(it.block.id), p.name)}`} aria-pressed={selectedId === it.block.id || undefined} onClick={() => onSelect?.(it.block.id)} className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy">
                            <span aria-hidden className="w-[5.5rem] shrink-0 text-sm tabular-nums text-navy">
                              {it.number ? <span className="mr-1.5 inline-flex size-5 items-center justify-center rounded-full bg-card text-xs font-semibold ring-1 ring-navy/20">{it.number}</span> : null}
                              {it.block.start === null ? "Any time" : clockWords(it.block.start)}
                            </span>
                            <span aria-hidden className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-navy">{it.block.title}</span>
                              <span className="block truncate text-xs text-navy-light">{`${it.block.service}, ${it.block.town}`}</span>
                            </span>
                            {it.block.done && <Check aria-hidden className="size-4 shrink-0 text-positive-deep" />}
                            {it.block.waiting && <Clock3 aria-hidden className="size-4 shrink-0 text-warning-ink" />}
                          </button>
                        </li>
                      )}
                    </Fragment>
                  )
                })}
                {nowLast && nowLine}
              </ol>
            )}
          </section>
        )
      })}
    </div>
  )
}
