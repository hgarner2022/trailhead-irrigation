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
import { useGridDnd, useGridSensors } from "./time-grid-dnd"
import { HOUR_PX, conflictMap, resizeResult, visibleRange, type GridBlock } from "./time-grid-model"
import type { TimeGridProps } from "./time-grid-types"

// The clock (docs/plans/2026-11-25-scheduler-design.md, 7.1 to 7.3, 7.10, 7.13): days across, hours down, each day split by person, 64 px an
// hour, a sticky day head and hour gutter inside one scrolling area, an Any time strip under the head, time off, a now line on today. Week
// passes seven days; Day passes one (and `showPersonNames`). Drag a block to another day, time or person; drag its bottom edge for its length;
// drag a chip between the strip and the clock; drop a row from the Unscheduled panel on it (`onDropExternal`). Every drag has a way without
// dragging: Tab to a block, Space lifts it, the arrows move it 15 minutes or one column, Enter drops, Escape cancels; a click or Enter opens the visit's
// peek, where Edit visit sets the day, time, person and length. Below `md` the Week is a day strip and one day's column
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
  // the head and the gutter sit flat on a hairline; they take a soft shadow only once something has scrolled under them
  const [under, setUnder] = useState({ x: false, y: false })
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const x = e.currentTarget.scrollLeft > 0
    const y = e.currentTarget.scrollTop > 0
    if (x !== under.x || y !== under.y) setUnder({ x, y })
  }

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


  // a person's column never gets too narrow to read a street: the grid scrolls sideways inside itself instead (a panel beside it, five people)
  const dayWidth = Math.max(people.length * (people.length > 3 ? 80 : 92), 140)
  const todayDay = columns.find((c) => c.today)?.day
  useEffect(() => {
    const el = scroller.current
    const head = el?.querySelector<HTMLElement>('[data-today="true"]')
    if (!el || !head || el.scrollWidth <= el.clientWidth) return
    const left = head.offsetLeft - 56
    if (left + head.offsetWidth > el.scrollLeft + el.clientWidth - 56 || left < el.scrollLeft) el.scrollLeft = left
  }, [todayDay, columns.length])
  const dayEdge = (c: { today?: boolean }, i: number) => cn("flex-1", i > 0 && "border-l border-border", c.today && columns.length > 1 && "bg-primary/[0.03]")
  return (
    <>
    <div
      ref={scroller}
      role="region"
      tabIndex={0}
      aria-label="Schedule"
      data-slot="time-grid"
      onScroll={onScroll}
      className={cn("relative max-h-[min(48rem,calc(100dvh-11rem))] overflow-auto rounded-lg border border-border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", props.className)}
    >
      <div className="min-w-full" style={{ width: "max-content" }}>
        <div data-slot="time-grid-head" data-under={under.y || undefined} className={cn("sticky top-0 z-20 border-b border-border bg-background transition-shadow duration-(--motion-fast) motion-reduce:transition-none", under.y && "shadow-sm")}>
          <div className="flex">
            <div className={cn("sticky left-0 z-10 bg-background", GUTTER)} />
            {columns.map((c, i) => (
              <div key={c.day} data-today={c.today || undefined} className={dayEdge(c, i)} style={{ minWidth: dayWidth }}>
                <DayHead column={c} people={people} colourOf={colourOf} variant={showPersonNames ? "day" : "week"} onOpenDay={showPersonNames ? undefined : props.onOpenDay} />
              </div>
            ))}
          </div>
          <div className="flex" data-slot="anytime-row">
            <div className={cn("type-admin-dense sticky left-0 z-10 flex items-center justify-end bg-background pr-2 text-muted-foreground", GUTTER)}>Any time</div>
            {columns.map((c, i) => (
              <div key={c.day} className={cn("flex", dayEdge(c, i))} style={{ minWidth: dayWidth }}>
                {people.map((p) => (
                  <div key={p.id} className="min-w-0 flex-1 px-0.5 pb-0.5">
                    <AnytimeStrip
                      labelled={false}
                      label={`Any time, ${names(p.id)}, ${c.label}`}
                      blocks={anytime.filter((b) => b.day === c.day && b.personId === p.id)}
                      personIndex={colourOf(p.id)}
                      initials={p.initials}
                      who={p.name}
                      selectedId={selectedId}
                      hoverId={hoverId}
                      draggingId={dragId ?? undefined}
                      onSelect={props.onSelect}
                      onHover={props.onHover}
                      wrap={(b, chip) => <ChipDrag key={b.id} block={b}>{chip}</ChipDrag>}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex">
          <HourGutter range={range} hourPx={hourPx} nowMinutes={now && shown.has(now.day) ? now.minutes : undefined} className={cn("sticky left-0 z-10 transition-shadow duration-(--motion-fast) motion-reduce:transition-none", under.x && "shadow-sm")} />
          {columns.map((c, i) => (
            <div key={c.day} className={cn("flex", dayEdge(c, i))} style={{ minWidth: dayWidth }}>
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
                  drives={showPersonNames ? props.drives : undefined}
                  oldPlaces={planned.filter((b) => b.planned?.day === c.day && b.planned.personId === p.id)}
                  conflicts={conflicts}
                  preview={preview}
                  nowMinutes={now?.day === c.day ? now.minutes : undefined}
                  selectedId={selectedId}
                  hoverId={hoverId}
                  dragId={dragId}
                  resizingId={resize?.id}
                  interactive
                  compact={!showPersonNames}
                  register={register}
                  onSelect={props.onSelect}
                  onHover={props.onHover}
                  onCreateAt={props.onCreateAt}
                  onTimeOffDrag={props.onTimeOffDrag}
                  onTimeOffClick={props.onTimeOffClick}
                  onResizeStart={startResize}
                  className="border-l-0 first:border-l-0 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-border/40"
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
            <TimeBlock block={b} variant={b.start === null ? "chip" : "block"} personIndex={colourOf(b.personId)} initials={people.find((p) => p.id === b.personId)?.initials} className="cal-lift size-full shadow-lg ring-1 ring-navy/25" />
          ) : (
            <div className="type-admin-dense cal-lift rounded-md bg-navy px-2 py-1 font-semibold text-white shadow-lg">{String(source.data?.label || "Visit")}</div>
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
