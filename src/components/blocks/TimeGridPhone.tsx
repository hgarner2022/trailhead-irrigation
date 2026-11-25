"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { firstNameOf } from "@/lib/admin/people"
import { worksOn } from "@/lib/admin/calendar"
import { cn } from "@/lib/utils"
import { AnytimeStrip } from "./AnytimeStrip"
import { TimeGridColumn } from "./TimeGridColumn"
import { HourGutter } from "./TimeGridHeader"
import { useBlockActions } from "./time-grid-actions"
import { PHONE_HOUR_PX, conflictMap, visibleRange } from "./time-grid-model"
import type { TimeGridProps } from "./time-grid-types"

// The clock on a phone (docs/plans/2026-11-25-scheduler-design.md, 7.2 and 7.13): a swipeable strip of days, a row of person chips ("All" first),
// then the chosen day for the chosen people on the same clock at 88 px an hour so a 30 minute visit is still a 44 px target. No drag, no hover
// plus: a tap opens the visit (`onSelect`), the menu on each block does the rest (Move, Set a time, Make it Any time, 15 minutes shorter or
// longer), and a swipe across the day goes to the next or the last. Every control is 44 px. Pure props.

const CHIP = "flex min-h-11 shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"

export function TimeGridPhone(props: TimeGridProps) {
  const { people, columns, selectedId, hoverId } = props
  const colours = props.allPeople ?? people
  const colourOf = useCallback((id: string) => Math.max(0, colours.findIndex((p) => p.id === id)), [colours])
  const names = useCallback((id: string) => firstNameOf(colours.find((p) => p.id === id)?.name ?? people.find((p) => p.id === id)?.name) ?? "They", [colours, people])
  const [dayIndex, setDayIndex] = useState(() => Math.max(0, columns.findIndex((c) => c.today)))
  const [who, setWho] = useState<string>("all")
  const swipe = useRef<number | null>(null)
  const column = columns[Math.min(dayIndex, columns.length - 1)]
  const chosen = who === "all" ? people : people.filter((p) => p.id === who)
  const timeOff = useMemo(() => props.timeOff ?? [], [props.timeOff])
  const planned = useMemo(() => props.planned ?? [], [props.planned])
  const timed = useMemo(() => [...props.blocks, ...planned].filter((b) => b.day === column?.day), [props.blocks, planned, column])
  const anytime = useMemo(() => (props.anytime ?? []).filter((b) => b.day === column?.day), [props.anytime, column])
  const range = useMemo(() => visibleRange(chosen, timed), [chosen, timed])
  const conflicts = useMemo(() => conflictMap(props.blocks.filter((b) => b.day === column?.day), timeOff, names), [props.blocks, column, timeOff, names])
  const all = useMemo(() => [...timed, ...anytime], [timed, anytime])
  const act = useBlockActions({ all, planned, timeOff, names, range, hourPx: PHONE_HOUR_PX, props })
  if (!column) return null
  const go = (n: number) => setDayIndex((i) => Math.min(columns.length - 1, Math.max(0, i + n)))

  return (
    <div data-slot="time-grid" data-form="phone" className={cn("min-w-0", props.className)}>
      <div role="group" aria-label="Day" className="-mx-1 flex snap-x gap-1.5 overflow-x-auto px-1 pb-2">
        {columns.map((c, i) => (
          <button key={c.day} type="button" aria-pressed={i === dayIndex} onClick={() => setDayIndex(i)} className={cn(CHIP, "min-w-16 snap-start", i === dayIndex ? "border-navy bg-navy text-white" : "border-border bg-background text-navy")}>
            <span className="font-semibold">{c.label}</span>
            {c.count && <span className={cn("text-xs", i === dayIndex ? "text-white/80" : "text-navy-light")}>{c.count}</span>}
            {c.today && <span className="sr-only">, today</span>}
          </button>
        ))}
        <button type="button" onClick={() => { const i = columns.findIndex((c) => c.today); if (i >= 0) setDayIndex(i); props.onToday?.() }} className={cn(CHIP, "min-w-16 snap-start border-border bg-background text-navy")}>
          Today
        </button>
      </div>
      <div role="group" aria-label="Person" className="flex gap-1.5 overflow-x-auto pb-2">
        {[{ id: "all", name: "All" }, ...people].map((p) => (
          <button key={p.id} type="button" aria-pressed={who === p.id} onClick={() => setWho(p.id)} className={cn(CHIP, "flex-row gap-2", who === p.id ? "border-navy bg-navy text-white" : "border-border bg-background text-navy")}>
            {firstNameOf(p.name)}
          </button>
        ))}
      </div>
      <div className="mb-2 flex items-start gap-2" data-slot="anytime-row">
        <span className="w-14 shrink-0 pt-1 text-xs font-medium text-navy-light">Any time</span>
        <div className="min-w-0 flex-1 space-y-1">
          {chosen.map((p) => (
            <AnytimeStrip key={p.id} touch labelled={false} label={`Any time, ${names(p.id)}`} blocks={anytime.filter((b) => b.personId === p.id)} personIndex={colourOf(p.id)} initials={p.initials} selectedId={selectedId} hoverId={hoverId} onSelect={props.onSelect} onAction={act} />
          ))}
        </div>
      </div>
      <div
        className="flex overflow-hidden rounded-lg border border-border bg-background"
        onTouchStart={(e) => { swipe.current = e.touches[0]?.clientX ?? null }}
        onTouchEnd={(e) => { const x0 = swipe.current; swipe.current = null; const x1 = e.changedTouches[0]?.clientX; if (x0 !== null && x1 !== undefined && Math.abs(x1 - x0) > 70) go(x1 < x0 ? 1 : -1) }}
      >
        <HourGutter range={range} hourPx={PHONE_HOUR_PX} nowMinutes={props.now?.day === column.day ? props.now.minutes : undefined} />
        {chosen.map((p) => (
          <TimeGridColumn
            key={p.id}
            day={column.day}
            person={p}
            personIndex={colourOf(p.id)}
            range={range}
            hourPx={PHONE_HOUR_PX}
            working={worksOn(p, column.day)}
            blocks={timed.filter((b) => b.personId === p.id)}
            timeOff={timeOff.filter((o) => o.day === column.day && o.personId === p.id)}
            conflicts={conflicts}
            nowMinutes={props.now?.day === column.day ? props.now.minutes : undefined}
            selectedId={selectedId}
            hoverId={hoverId}
            notToldMark={props.notToldMark}
            touch
            onTimeOffClick={props.onTimeOffClick}
            onSelect={props.onSelect}
            onAction={act}
          />
        ))}
      </div>
    </div>
  )
}
