"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
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
  // a visit that arrives in this column after the column was first drawn (dropped here from another day, person or the Unscheduled list) settles into place once;
  // the visits a view opens with are simply there
  const known = useRef<Set<string> | null>(null)
  const arrived = (id: string) => known.current !== null && !known.current.has(id)
  useEffect(() => {
    const ids = new Set(blocks.map((b) => b.id))
    // an arrival keeps its mark for the length of the animation, then joins the known
    const t = setTimeout(() => { known.current = ids }, known.current === null ? 0 : 400)
    return () => clearTimeout(t)
  }, [blocks])
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
      className={cn("relative min-w-0 flex-1 border-l border-border/50 transition-colors duration-(--motion-fast) motion-reduce:transition-none", dragPreview && (dragPreview.conflict ? "bg-destructive/5" : s.wash), p.className)}
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
            {hs > top0 && <div className="absolute inset-x-0 top-0 bg-navy/[0.03]" style={{ height: minutesToPx(hs - top0, hourPx) }} />}
            {he < bottom0 && <div className="absolute inset-x-0 bottom-0 bg-navy/[0.03]" style={{ height: minutesToPx(bottom0 - he, hourPx) }} />}
          </>
        ) : (
          <div className="absolute inset-0 bg-navy/[0.03]" />
        )}
        {hot !== null && !span && !p.dragId && p.interactive && (
          <div className="pointer-events-none absolute inset-x-0.5 flex items-center justify-center rounded-md bg-navy/5 text-navy-light" style={{ top: minutesToPx(hot - top0, hourPx), height: minutesToPx(30, hourPx) }}>
            <Plus className="size-3.5" />
          </div>
        )}
      </div>

      {p.timeOff.map((o) => {
        const whole = o.start === null || o.end === null
        return <TimeOffBand key={o.id} label={timeOffLabel(o, person.name.split(" ")[0] ?? person.name)} personIndex={personIndex} wholeDay={whole} touch={p.touch} onOpen={p.onTimeOffClick ? () => p.onTimeOffClick?.(o.id) : undefined} style={whole ? undefined : { top: minutesToPx(Math.max(top0, o.start!) - top0, hourPx), height: minutesToPx(Math.min(bottom0, o.end!) - Math.max(top0, o.start!), hourPx) }} />
      })}
      {span && <TimeOffBand label={`${person.name.split(" ")[0]} off ${clockWords(Math.min(span.a, span.b), true)} to ${clockWords(Math.max(span.a, span.b))}`} personIndex={personIndex} style={{ top: minutesToPx(Math.min(span.a, span.b) - top0, hourPx), height: minutesToPx(Math.abs(span.b - span.a), hourPx) }} />}

      {p.oldPlaces?.map((o) => o.planned && o.planned.start !== null && (
        <div key={`old-${o.id}`} aria-hidden data-slot="planned-from" className="absolute inset-x-0.5 z-[1] rounded-md border border-dashed border-navy/40" style={{ top: minutesToPx(o.planned.start - top0, hourPx), height: minutesToPx(o.minutes, hourPx) }} />
      ))}

      {p.drives && driveGaps(blocks, p.drives, range, hourPx).map((g) => (
        <div key={`drive-${g.id}`} aria-hidden data-slot="drive-line" className="type-admin-dense pointer-events-none absolute left-[5px] right-1 z-[1] flex items-center border-l border-dotted border-navy/35 pl-2 leading-none text-muted-foreground" style={{ top: g.top + 2, height: Math.max(0, g.height - 4) }}>
          <span className="truncate tabular-nums">{`${g.minutes} min drive`}</span>
        </div>
      ))}

      {packLanes(blocks, range, hourPx).map(({ block: b, top, height: h, lane, lanes }) => {
        // Overlapping blocks: in the Week's narrow column they cascade (each a step in from the one before and over it, so every one keeps a readable line and
        // the one under it still shows its start and its edge); in the Day's wide column and on a phone they sit side by side, each whole. The overlap mark stays.
        const cascade = p.compact && !p.touch && lanes > 1
        const style = cascade
          ? { top: top + 1, height: Math.max(h - 2, 12), left: lane * 14 + 2, width: `calc(100% - ${lane * 14 + 3}px)`, zIndex: 2 + lane }
          : { top: top + 1, height: Math.max(h - 2, 12), left: `calc(${(lane * 100) / lanes}% + 2px)`, width: `calc(${100 / lanes}% - 3px)` }
        const common = {
          block: b, personIndex, initials: person.initials, who: person.name, selected: p.selectedId === b.id, hovered: p.hoverId === b.id, conflict: p.conflicts.get(b.id), touch: p.touch, compact: p.compact || (p.touch && lanes > 1), narrow: p.touch && lanes > 1,
          style: { ...style, position: "absolute" as const }, onSelect: p.onSelect, onHover: p.onHover,
          onResizeStart: p.interactive && !b.done && !b.planned ? (e: React.PointerEvent<HTMLElement>) => p.onResizeStart?.(b, e) : undefined,
        }
        return p.interactive && !b.planned ? (
          <DragBlock key={b.id} block={b}>{(d) => <TimeBlock {...common} rootRef={d.rootRef} handleRef={d.handleRef} dragging={d.dragging} className={cn("z-[2] touch-manipulation", arrived(b.id) && "cal-settle", p.resizingId !== b.id && "cal-glide", cascade && lane > 0 && "outline outline-1 outline-background")} />}</DragBlock>
        ) : (
          <TimeBlock key={b.id} {...common} className="z-[2]" />
        )
      })}

      {dragPreview && dragPreview.start !== null && (
        <div data-slot="drop-ghost" aria-hidden className={cn("type-admin-dense pointer-events-none absolute inset-x-0.5 z-[3] overflow-hidden rounded-md border border-dashed px-2 py-0.5 font-semibold tabular-nums", dragPreview.conflict ? "border-destructive bg-destructive/10 text-destructive" : cn("text-navy", s.ghost, s.tint))} style={{ top: minutesToPx(dragPreview.start - top0, hourPx), height: minutesToPx(dragPreview.minutes, hourPx) }}>
          {dragPreview.label}
        </div>
      )}
      {dragPreview && dragPreview.start === null && <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[3] border-t-2 border-navy/50" />}

      {p.nowMinutes !== undefined && p.nowMinutes >= top0 && p.nowMinutes <= bottom0 && (
        <div aria-hidden data-slot="now-line" className="pointer-events-none absolute inset-x-0 z-[1] border-t border-destructive" style={{ top: minutesToPx(p.nowMinutes - top0, hourPx) }} />
      )}
    </div>
  )
}
