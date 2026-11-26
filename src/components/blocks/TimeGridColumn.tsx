"use client"

import { useRef, useState, type ReactNode } from "react"
import { useDraggable } from "@dnd-kit/react"
import { Plus } from "lucide-react"
import { hoursOf } from "@/lib/admin/people"
import type { Person } from "@/lib/admin/types"
import { cn } from "@/lib/utils"
import { TimeBlock } from "./TimeBlock"
import { TimeOffBand } from "./TimeOffBand"
import { colKey, type Preview } from "./time-grid-dnd"
import { clockToMinutes, clockWords, minuteAt, minutesToPx, packLanes, snap, timeOffLabel, type GridBlock, type HourRange, type TimeOff } from "./time-grid-model"
import { personStyle, rowLines } from "./time-grid-style"
import type { CreateAtEvent, TimeOffDragEvent } from "./time-grid-types"

// One person's column inside one day of the clock: the row lines, the tint outside their hours (and all day when they do not work it), time off,
// the blocks packed side by side, the dotted old place of a proposal, the ghost of a drag in flight, the now line. The empty hours answer the
// pointer: a faint "+" under it (a click calls `onCreateAt`) and, dragged across, a time-off span (`onTimeOffDrag`). Keyboard users add a job
// and time off from the day header. Registers its element so the drag can read where the pointer is. Pure props apart from the drag hook.

export interface TimeGridColumnProps {
  day: string
  person: Person
  personIndex: number
  range: HourRange
  hourPx: number
  working: boolean
  blocks: readonly GridBlock[]
  timeOff: readonly TimeOff[]
  /** where a proposal came from, drawn as a dotted outline */
  oldPlaces?: readonly GridBlock[]
  /** the minutes of driving to a block from the stop before it, by block id: a quiet line in the gap between two timed stops, where there is room */
  drives?: ReadonlyMap<string, number>
  conflicts: ReadonlyMap<string, string>
  preview?: Preview | null
  nowMinutes?: number
  selectedId?: string
  hoverId?: string
  dragId?: string | null
  resizingId?: string
  /** false on a phone: no drag, no hover plus */
  interactive?: boolean
  touch?: boolean
  compact?: boolean
  register?: (key: string, el: HTMLElement | null) => void
  onSelect?: (id: string) => void
  onHover?: (id: string | null) => void
  onCreateAt?: (at: CreateAtEvent) => void
  onTimeOffDrag?: (span: TimeOffDragEvent) => void
  /** a band's label was pressed: the host opens that time off to edit it */
  onTimeOffClick?: (id: string) => void
  onResizeStart?: (b: GridBlock, e: React.PointerEvent<HTMLElement>) => void
  className?: string
}

function DragBlock({ block, children }: { block: GridBlock; children: (p: { rootRef: (el: HTMLDivElement | null) => void; handleRef: (el: HTMLButtonElement | null) => void; dragging: boolean }) => ReactNode }) {
  const { ref, handleRef, isDragSource } = useDraggable({ id: block.id, data: { kind: "block" }, disabled: block.done })
  return <>{children({ rootRef: ref, handleRef, dragging: isDragSource })}</>
}

/** The gaps between two consecutive timed stops that are tall enough to carry "12 min drive": where it fits, never across an overlap. */
function driveGaps(blocks: readonly GridBlock[], drives: ReadonlyMap<string, number>, range: HourRange, hourPx: number): { id: string; minutes: number; top: number; height: number }[] {
  const timed = blocks.filter((b): b is GridBlock & { start: number } => b.start !== null && !b.planned).sort((a, b) => a.start - b.start)
  const out: { id: string; minutes: number; top: number; height: number }[] = []
  for (let i = 1; i < timed.length; i++) {
    const prev = timed[i - 1]!
    const cur = timed[i]!
    const minutes = drives.get(cur.id)
    const from = prev.start + prev.minutes
    const height = minutesToPx(cur.start - from, hourPx)
    if (!minutes || cur.start <= from || height < 14) continue
    if (timed.some((o) => o !== prev && o !== cur && o.start < cur.start && o.start + o.minutes > from)) continue
    out.push({ id: cur.id, minutes, top: minutesToPx(from - range.start * 60, hourPx), height })
  }
  return out
}

export function TimeGridColumn(p: TimeGridColumnProps) {
  const { day, person, personIndex, range, hourPx, working, blocks, preview } = p
  const s = personStyle(personIndex)
  const hours = hoursOf(person)
  const hs = clockToMinutes(hours.start) ?? 540
  const he = clockToMinutes(hours.end) ?? 1020
  const top0 = range.start * 60
  const bottom0 = range.end * 60
  const height = minutesToPx(bottom0 - top0, hourPx)
  const bg = useRef<HTMLDivElement>(null)
  const [hot, setHot] = useState<number | null>(null)
  const [span, setSpan] = useState<{ a: number; b: number } | null>(null)
  const down = useRef<{ y: number; at: number; moved: boolean } | null>(null)
  const dragPreview = preview && preview.day === day && preview.personId === person.id ? preview : null
  const minuteUnder = (clientY: number) => minuteAt(clientY - (bg.current?.getBoundingClientRect().top ?? 0), range, hourPx)
  const rowStart = (m: number) => Math.min(bottom0 - 30, Math.max(top0, Math.floor(m / 30) * 30))

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.pointerType === "touch") return
    e.currentTarget.setPointerCapture(e.pointerId)
    down.current = { y: e.clientY, at: minuteUnder(e.clientY), moved: false }
  }
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = down.current
    if (!d) return setHot(rowStart(minuteUnder(e.clientY)))
    if (Math.abs(e.clientY - d.y) > 6 && p.onTimeOffDrag) { d.moved = true; setSpan({ a: snap(d.at), b: snap(minuteUnder(e.clientY)) }); setHot(null) }
  }
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = down.current
    down.current = null
    if (!d) return
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    if (d.moved && span) {
      const [a, b] = [Math.min(span.a, span.b), Math.max(span.a, span.b)]
      if (b - a >= 15) p.onTimeOffDrag?.({ day, personId: person.id, start: Math.max(top0, a), end: Math.min(bottom0, b) })
      setSpan(null)
    } else p.onCreateAt?.({ day, personId: person.id, start: rowStart(d.at) })
  }

  return (
    <div
      ref={(el) => p.register?.(colKey(day, person.id), el)}
      data-slot="time-grid-column"
      data-day={day}
      data-person={person.id}
      data-drop={dragPreview ? (dragPreview.conflict ? "conflict" : "ok") : undefined}
      style={{ height }}
      className={cn("relative min-w-0 flex-1 border-l border-border/60", dragPreview && (dragPreview.conflict ? "bg-destructive/5" : s.wash), p.className)}
    >
      <div
        ref={bg}
        aria-hidden
        data-slot="time-grid-surface"
        style={rowLines(hourPx)}
        onPointerDown={p.interactive ? onDown : undefined}
        onPointerMove={p.interactive ? onMove : undefined}
        onPointerUp={p.interactive ? onUp : undefined}
        onPointerLeave={() => setHot(null)}
        className="absolute inset-0 z-0 touch-pan-y"
      >
        {working ? (
          <>
            {hs > top0 && <div className="absolute inset-x-0 top-0 bg-navy/5" style={{ height: minutesToPx(hs - top0, hourPx) }} />}
            {he < bottom0 && <div className="absolute inset-x-0 bottom-0 bg-navy/5" style={{ height: minutesToPx(bottom0 - he, hourPx) }} />}
          </>
        ) : (
          <div className="absolute inset-0 bg-navy/5" />
        )}
        {hot !== null && !span && !p.dragId && p.interactive && (
          <div className="pointer-events-none absolute inset-x-0.5 flex items-center justify-center rounded text-navy-light/70" style={{ top: minutesToPx(hot - top0, hourPx), height: minutesToPx(30, hourPx) }}>
            <Plus className="size-4" />
          </div>
        )}
      </div>

      {p.timeOff.map((o) => {
        const whole = o.start === null || o.end === null
        return <TimeOffBand key={o.id} label={timeOffLabel(o, person.name.split(" ")[0] ?? person.name)} personIndex={personIndex} wholeDay={whole} touch={p.touch} onOpen={p.onTimeOffClick ? () => p.onTimeOffClick?.(o.id) : undefined} style={whole ? undefined : { top: minutesToPx(Math.max(top0, o.start!) - top0, hourPx), height: minutesToPx(Math.min(bottom0, o.end!) - Math.max(top0, o.start!), hourPx) }} />
      })}
      {span && <TimeOffBand label={`${person.name.split(" ")[0]} off ${clockWords(Math.min(span.a, span.b), true)} to ${clockWords(Math.max(span.a, span.b))}`} personIndex={personIndex} style={{ top: minutesToPx(Math.min(span.a, span.b) - top0, hourPx), height: minutesToPx(Math.abs(span.b - span.a), hourPx) }} />}

      {p.oldPlaces?.map((o) => o.planned && o.planned.start !== null && (
        <div key={`old-${o.id}`} aria-hidden data-slot="planned-from" className="absolute inset-x-1 z-[1] rounded-lg border border-dashed border-navy/40" style={{ top: minutesToPx(o.planned.start - top0, hourPx), height: minutesToPx(o.minutes, hourPx) }} />
      ))}

      {p.drives && driveGaps(blocks, p.drives, range, hourPx).map((g) => (
        <div key={`drive-${g.id}`} aria-hidden data-slot="drive-line" className="pointer-events-none absolute inset-x-2 z-[1] flex items-center justify-center border-l border-dashed border-navy/30 text-[11px] leading-none text-navy-light" style={{ top: g.top, height: g.height }}>
          <span className="truncate px-1">{`${g.minutes} min drive`}</span>
        </div>
      ))}

      {packLanes(blocks, range, hourPx).map(({ block: b, top, height: h, lane, lanes }) => {
        // on a phone, blocks that overlap sit side by side in their person's column (the desktop split), each with its time and street on two lines; the overlap outline stays
        const style = { top, height: h, left: `calc(${(lane * 100) / lanes}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }
        const common = {
          block: b, personIndex, initials: person.initials, who: person.name, selected: p.selectedId === b.id, hovered: p.hoverId === b.id, conflict: p.conflicts.get(b.id), touch: p.touch, compact: p.compact || (p.touch && lanes > 1), narrow: p.touch && lanes > 1,
          style: { ...style, position: "absolute" as const }, onSelect: p.onSelect, onHover: p.onHover,
          onResizeStart: p.interactive && !b.done && !b.planned ? (e: React.PointerEvent<HTMLElement>) => p.onResizeStart?.(b, e) : undefined,
        }
        return p.interactive && !b.planned ? (
          <DragBlock key={b.id} block={b}>{(d) => <TimeBlock {...common} rootRef={d.rootRef} handleRef={d.handleRef} dragging={d.dragging} className="z-[2] touch-manipulation" />}</DragBlock>
        ) : (
          <TimeBlock key={b.id} {...common} className="z-[2]" />
        )
      })}

      {dragPreview && dragPreview.start !== null && (
        <div data-slot="drop-ghost" aria-hidden className={cn("pointer-events-none absolute inset-x-1 z-[3] rounded-lg border-2 px-1.5 py-0.5 text-xs font-semibold opacity-55", dragPreview.conflict ? "border-destructive bg-destructive/20 text-destructive" : cn("border-navy text-navy", s.tint))} style={{ top: minutesToPx(dragPreview.start - top0, hourPx), height: minutesToPx(dragPreview.minutes, hourPx) }}>
          {dragPreview.label}
        </div>
      )}
      {dragPreview && dragPreview.start === null && <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[3] border-t-2 border-navy opacity-55" />}

      {p.nowMinutes !== undefined && p.nowMinutes >= top0 && p.nowMinutes <= bottom0 && (
        <div aria-hidden data-slot="now-line" className="pointer-events-none absolute inset-x-0 z-[4] border-t-2 border-destructive" style={{ top: minutesToPx(p.nowMinutes - top0, hourPx) }} />
      )}
    </div>
  )
}
