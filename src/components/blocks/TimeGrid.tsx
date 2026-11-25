"use client"

import { cloneElement, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import { DragDropProvider, DragOverlay, useDragDropManager, useDraggable } from "@dnd-kit/react"
import { firstNameOf } from "@/lib/admin/people"
import { worksOn } from "@/lib/admin/calendar"
import { cn } from "@/lib/utils"
import { AnytimeStrip } from "./AnytimeStrip"
import { TimeBlock } from "./TimeBlock"
import { TimeGridColumn } from "./TimeGridColumn"
import { DayHead, GUTTER, HourGutter } from "./TimeGridHeader"
import { TimeGridPhone } from "./TimeGridPhone"
import { useBlockActions } from "./time-grid-actions"
import { useGridDnd, useGridSensors } from "./time-grid-dnd"
import { HOUR_PX, conflictMap, resizeResult, visibleRange, type GridBlock } from "./time-grid-model"
import type { TimeGridProps } from "./time-grid-types"

// The clock (docs/plans/2026-11-25-scheduler-design.md, 7.1 to 7.3, 7.10, 7.13): days across, hours down, each day split by person, 56 px an
// hour, a sticky day head and hour gutter inside one scrolling area, an Any time strip under the head, time off, a now line on today. Week
// passes seven days; Day passes one (and `showPersonNames`). Drag a block to another day, time or person; drag its bottom edge for its length;
// drag a chip between the strip and the clock; drop a row from the Unscheduled panel on it (`onDropExternal`). Every drag has a way without
// dragging: Tab to a block, Space lifts it, the arrows move it 15 minutes or one column, Enter drops, Escape cancels; and each block's menu
// has Move, Set a time or Make it Any time, and 15 minutes shorter or longer. Below `md` the Week is a day strip and one day's column
// (TimeGridPhone) with no drag. The grid moves nothing itself: it reports `onMove`, `onResize` and `onCreateAt`, and the screen decides.

const StepCtx = createContext<(w: number) => void>(() => {})

/** Wrap the grid and anything that drags onto it (the Unscheduled rows) in one provider; the grid makes its own when it finds none. */
export function TimeGridDndProvider({ children }: { children: ReactNode }) {
  const [stepX, setStepX] = useState(88)
  const sensors = useGridSensors(stepX)
  return (
    <StepCtx.Provider value={setStepX}>
      <DragDropProvider sensors={sensors}>{children}</DragDropProvider>
    </StepCtx.Provider>
  )
}

const PHONE_QUERY = "(max-width: 767px)"
function useIsPhone(): boolean {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(PHONE_QUERY); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb) },
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  )
}

export function TimeGrid(props: TimeGridProps) {
  const phone = useIsPhone()
  const inProvider = useDragDropManager() !== null
  if (phone) return <TimeGridPhone {...props} />
  const grid = <TimeGridDesktop {...props} />
  return inProvider ? grid : <TimeGridDndProvider>{grid}</TimeGridDndProvider>
}

function TimeGridDesktop(props: TimeGridProps) {
  const { people, columns, selectedId, hoverId, showPersonNames, now } = props
  const colours = props.allPeople ?? people
  const colourOf = useCallback((id: string) => Math.max(0, colours.findIndex((p) => p.id === id)), [colours])
  const names = useCallback((id: string) => firstNameOf(people.find((p) => p.id === id)?.name ?? colours.find((p) => p.id === id)?.name) ?? "They", [people, colours])
  const cols = useRef(new Map<string, HTMLElement>())
  const scroller = useRef<HTMLDivElement>(null)
  const setStepX = useContext(StepCtx)
  const [resize, setResize] = useState<{ id: string; minutes: number } | null>(null)

  const timeOff = useMemo(() => props.timeOff ?? [], [props.timeOff])
  const planned = useMemo(() => props.planned ?? [], [props.planned])
  const shown = useMemo(() => new Set(columns.map((c) => c.day)), [columns])
  const resized = useCallback((b: GridBlock) => (resize?.id === b.id ? { ...b, minutes: resize.minutes } : b), [resize])
  const timed = useMemo(() => props.blocks.filter((b) => shown.has(b.day)).map(resized), [props.blocks, shown, resized])
  const anytime = useMemo(() => (props.anytime ?? []).filter((b) => shown.has(b.day)), [props.anytime, shown])
  const range = useMemo(() => visibleRange(people, [...timed, ...planned]), [people, timed, planned])
  const hourPx = HOUR_PX
  const conflicts = useMemo(() => conflictMap(timed, timeOff, names), [timed, timeOff, names])
  const all = useMemo(() => [...timed, ...anytime], [timed, anytime])

  const { preview, dragId } = useGridDnd({ blocks: all, timeOff, range, hourPx, names, cols, scroller, onMove: props.onMove, onDropExternal: props.onDropExternal })

  useEffect(() => {
    const first = [...cols.current.values()][0]
    if (first) setStepX(Math.round(first.getBoundingClientRect().width))
  }, [columns.length, people.length, setStepX])

  const register = useCallback((key: string, el: HTMLElement | null) => { if (el) cols.current.set(key, el); else cols.current.delete(key) }, [])

  const startResize = (b: GridBlock, e: React.PointerEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const y0 = e.clientY
    let last = b.minutes
    const move = (ev: PointerEvent) => { last = resizeResult(b, ev.clientY - y0, range, hourPx); setResize({ id: b.id, minutes: last }) }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      setResize(null)
      if (last !== b.minutes) props.onResize?.({ id: b.id, minutes: last })
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  const act = useBlockActions({ all, planned, timeOff, names, range, hourPx, props })

  const dayWidth = Math.max(people.length * 76, 120)
  return (
    <>
    <div
      ref={scroller}
      role="region"
      tabIndex={0}
      aria-label="Schedule"
      data-slot="time-grid"
      className={cn("relative max-h-[min(44rem,calc(100vh-14rem))] overflow-auto rounded-lg border border-border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50", props.className)}
    >
      <div className="min-w-full" style={{ width: "max-content" }}>
        <div className="sticky top-0 z-20 border-b border-border bg-background">
          <div className="flex">
            <div className={cn("sticky left-0 z-10 border-r border-border bg-background", GUTTER)} />
            {columns.map((c) => (
              <div key={c.day} className="flex-1 border-l border-border/60" style={{ minWidth: dayWidth }}>
                <DayHead column={c} people={people} colourOf={colourOf} names={showPersonNames} />
              </div>
            ))}
          </div>
          <div className="flex border-t border-border/60" data-slot="anytime-row">
            <div className={cn("sticky left-0 z-10 flex items-center justify-end border-r border-border bg-background pr-2 text-xs font-medium text-navy-light", GUTTER)}>Any time</div>
            {columns.map((c) => (
              <div key={c.day} className="flex flex-1 border-l border-border/60" style={{ minWidth: dayWidth }}>
                {people.map((p) => (
                  <div key={p.id} className="min-w-0 flex-1 px-0.5">
                    <AnytimeStrip
                      labelled={false}
                      label={`Any time, ${names(p.id)}, ${c.label}`}
                      blocks={anytime.filter((b) => b.day === c.day && b.personId === p.id)}
                      personIndex={colourOf(p.id)}
                      initials={p.initials}
                      selectedId={selectedId}
                      hoverId={hoverId}
                      draggingId={dragId ?? undefined}
                      onSelect={props.onSelect}
                      onHover={props.onHover}
                      onAction={act}
                      wrap={(b, chip) => <ChipDrag key={b.id} block={b}>{chip}</ChipDrag>}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex">
          <HourGutter range={range} hourPx={hourPx} nowMinutes={now && shown.has(now.day) ? now.minutes : undefined} className="sticky left-0 z-10" />
          {columns.map((c) => (
            <div key={c.day} className="flex flex-1 border-l border-border/60" style={{ minWidth: dayWidth }}>
              {people.map((p) => (
                <TimeGridColumn
                  key={p.id}
                  day={c.day}
                  person={p}
                  personIndex={colourOf(p.id)}
                  range={range}
                  hourPx={hourPx}
                  working={worksOn(p, c.day)}
                  blocks={[...timed, ...planned].filter((b) => b.day === c.day && b.personId === p.id)}
                  timeOff={timeOff.filter((o) => o.day === c.day && o.personId === p.id)}
                  oldPlaces={planned.filter((b) => b.planned?.day === c.day && b.planned.personId === p.id)}
                  conflicts={conflicts}
                  preview={preview}
                  nowMinutes={now?.day === c.day ? now.minutes : undefined}
                  selectedId={selectedId}
                  hoverId={hoverId}
                  dragId={dragId}
                  notToldMark={props.notToldMark}
                  interactive
                  compact={!showPersonNames}
                  register={register}
                  onSelect={props.onSelect}
                  onHover={props.onHover}
                  onAction={act}
                  onCreateAt={props.onCreateAt}
                  onTimeOffDrag={props.onTimeOffDrag}
                  onTimeOffClick={props.onTimeOffClick}
                  onResizeStart={startResize}
                  className="border-l-0 first:border-l-0 [&:not(:first-child)]:border-l"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
      <DragOverlay dropAnimation={null}>
        {(source) => {
          const b = all.find((x) => x.id === String(source.id))
          return b ? (
            <TimeBlock block={b} variant={b.start === null ? "chip" : "block"} personIndex={colourOf(b.personId)} initials={people.find((p) => p.id === b.personId)?.initials} className="size-full shadow-lg ring-2 ring-navy" />
          ) : (
            <div className="rounded-lg bg-navy px-2 py-1 text-xs font-semibold text-white shadow-lg">{String(source.data?.label || "Visit")}</div>
          )
        }}
      </DragOverlay>
      <p aria-live="polite" className="sr-only">{preview ? `${preview.label}${preview.conflict ? `. ${preview.conflict}` : ""}` : ""}</p>
    </>
  )
}

function ChipDrag({ block, children }: { block: GridBlock; children: React.ReactElement }) {
  const { ref, handleRef, isDragSource } = useDraggable({ id: block.id, data: { kind: "block" } })
  return cloneElement(children as React.ReactElement<Record<string, unknown>>, { rootRef: ref, handleRef, dragging: isDragSource })
}
