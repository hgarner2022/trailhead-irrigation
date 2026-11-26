"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Accessibility, AutoScroller, PointerActivationConstraints } from "@dnd-kit/dom"
import { KeyboardSensor, PointerSensor, useDragDropManager, useDragDropMonitor } from "@dnd-kit/react"
import { clockWords, conflictFor, minuteAt, moveResult, type GridBlock, type HourRange, type MoveResult, type TimeOff } from "./time-grid-model"
import { weekdayName } from "@/lib/admin/calendar"
import type { ExternalDrop, MoveEvent } from "./time-grid-types"

// The drag half of the clock, on @dnd-kit/react 0.5 (docs: dndkit.com/react). The library moves things and reports the pointer; everything
// about WHERE a drop lands is ours: each person's column registers its element, and the pointer position decides the day, the person and
// the minute (snapped to 15) from those rects, so the same arithmetic serves a mouse, a finger and the keyboard sensor (which moves a
// virtual pointer by one 15 minute row or one column per arrow). A drag that ends outside the grid, or is canceled, does nothing.
// Resize is NOT here: dnd-kit moves things between targets and has no edge-resize, so TimeGrid does it with plain pointer events.

export const colKey = (day: string, personId: string) => `${day}|${personId}`
export const ROW_STEP_PX = 16 // 15 minutes at 64 px an hour (HOUR_PX)

export interface Preview extends MoveResult { id: string; conflict: string | null; external: boolean }
type Entity = { id: string | number; data: Record<string, unknown>; element?: Element }
interface Ev { operation: { source?: Entity | null; position: { current: { x: number; y: number } } }; canceled?: boolean }

export interface DndOptions {
  blocks: readonly GridBlock[]
  timeOff: readonly TimeOff[]
  range: HourRange
  hourPx: number
  names: (personId: string) => string
  cols: React.RefObject<Map<string, HTMLElement>>
  scroller: React.RefObject<HTMLElement | null>
  onMove?: (e: MoveEvent) => void
  onDropExternal?: (e: ExternalDrop) => void
}

/** The sensors for the provider: a mouse needs 5 px, a finger a 250 ms hold; the keyboard lifts with Space and drops with Enter or Space. */
export function useGridSensors(stepX: number) {
  return [
    PointerSensor.configure({ activationConstraints: (event) => (event.pointerType === "touch" ? [new PointerActivationConstraints.Delay({ value: 250, tolerance: 8 })] : [new PointerActivationConstraints.Distance({ value: 5 })]) }),
    KeyboardSensor.configure({
      offset: { x: Math.max(24, stepX), y: ROW_STEP_PX },
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Enter", "Space"], up: ["ArrowUp"], down: ["ArrowDown"], left: ["ArrowLeft"], right: ["ArrowRight"] },
    }),
  ]
}

/** What a screen reader hears while a visit is carried by the keyboard (the library's own default reads "draggable item v7"). Our live region in the grid says the rest. */
export const KEYBOARD_HELP = "Press Space to lift this visit. The arrow keys move it 15 minutes up or down, or one column left or right. Press Enter to drop it, Escape to cancel."

/**
 * The provider's plugins: the library's defaults without its auto-scroller (it scrolls every scrollable ancestor, the page included; the grid scrolls only itself, see `autoScroll`) and
 * with our own words for the keyboard path.
 */
export const gridPlugins = (defaults: readonly unknown[]) =>
  defaults
    .filter((p) => p !== AutoScroller)
    .map((p) => (p === Accessibility ? Accessibility.configure({ screenReaderInstructions: { draggable: KEYBOARD_HELP }, announcements: { dragstart: () => undefined, dragend: () => undefined } }) : p)) as never

const EDGE_PX = 56
const MAX_STEP_PX = 18
/** The sticky hour gutter's width: a drag near it scrolls the days sideways. */
const GUTTER_PX = 56
const ramp = (d: number) => (d < EDGE_PX ? Math.ceil(MAX_STEP_PX * ((EDGE_PX - Math.max(0, d)) / EDGE_PX) ** 2) : 0)

/**
 * Auto-scroll for a drag in flight: when the pointer is inside the grid and near its top (under the sticky head), bottom, left (beside the hour gutter) or right edge, the grid scrolls
 * itself toward that edge, faster the nearer the pointer is. Returns whether it moved. Only the grid scrolls; the page never does.
 */
export function autoScroll(el: HTMLElement, x: number, y: number): boolean {
  const r = el.getBoundingClientRect()
  if (x < r.left || x > r.right || y < r.top || y > r.bottom) return false
  const head = el.querySelector('[data-slot="time-grid-head"]')?.getBoundingClientRect().height ?? 0
  const dx = ramp(r.right - x) - ramp(x - (r.left + GUTTER_PX))
  const dy = ramp(r.bottom - y) - ramp(y - (r.top + head))
  const before = [el.scrollLeft, el.scrollTop]
  if (dx) el.scrollLeft += dx
  if (dy) el.scrollTop += dy
  return el.scrollLeft !== before[0] || el.scrollTop !== before[1]
}

/** What is said aloud for a place: "Thursday, Nov 19, Ryan, 8:45 to 9:45 am", plus the clash. */
export function placeWords(p: Preview, names: (personId: string) => string): string {
  const [, m, d] = p.day.split("-")
  const date = `${weekdayName(p.day)}, ${new Date(2000, Number(m) - 1, 1).toLocaleString("en-US", { month: "short" })} ${Number(d)}`
  return `${date}, ${names(p.personId)}, ${p.start === null ? "Any time" : p.label}${p.conflict ? `. ${p.conflict}` : ""}`
}

export function useGridDnd(o: DndOptions) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  // the block that was just dropped lands with a settle and without the glide, so it never visibly slides back from its old place first
  const [settleId, setSettleId] = useState<string | null>(null)
  const [said, setSaid] = useState("")
  const manager = useDragDropManager()
  const grab = useRef(0)
  const frame = useRef(0)
  const byPointer = useRef(false)
  const origin = useRef({ x: 0, y: 0 })
  /** true for a moment after a drop: the click the browser sends when a press is released in place must not open the peek */
  const justDropped = useRef(false)
  const opts = useRef(o)
  useEffect(() => { opts.current = o })

  const place = useCallback((ev: Ev): Preview | null => {
    const { blocks, timeOff, range, hourPx, names, cols, scroller } = opts.current
    const src = ev.operation.source
    if (!src) return null
    const { x, y } = ev.operation.position.current
    const frame = scroller.current?.getBoundingClientRect()
    if (frame && (x < frame.left - 8 || x > frame.right + 8 || y < frame.top - 8 || y > frame.bottom + 8)) return null
    const entries = [...(cols.current ?? [])].map(([key, el]) => ({ key, r: el.getBoundingClientRect() }))
    if (!entries.length) return null
    const hit = entries.find((e) => x >= e.r.left && x < e.r.right) ?? entries.reduce((a, b) => (Math.abs(x - (b.r.left + b.r.right) / 2) < Math.abs(x - (a.r.left + a.r.right) / 2) ? b : a))
    const [day, personId] = hit.key.split("|") as [string, string]
    const own = src.data.kind === "block" ? blocks.find((b) => b.id === src.id) : undefined
    const minutes = own?.minutes ?? (Number(src.data.minutes) || 60)
    const start = y < hit.r.top ? null : minuteAt(y - grab.current - hit.r.top, range, hourPx)
    const res = moveResult({ minutes, start: own?.start ?? null }, { day, personId, start }, range)
    const conflict = conflictFor({ id: String(src.id), day, personId, start: res.start, minutes }, blocks, timeOff, names)
    return { ...res, id: String(src.id), conflict, external: !own }
  }, [])

  const same = (a: Preview | null, b: Preview | null) => a === b || (!!a && !!b && a.day === b.day && a.personId === b.personId && a.start === b.start && a.id === b.id && a.conflict === b.conflict)

  // The library reports a move with the pointer's PREVIOUS position, so a preview drawn from the event trails the pointer by one move (the ghost sat 15 minutes behind the label). Instead one frame
  // loop runs while a drag is in flight and reads the live position, scrolls the grid when the pointer nears an edge, and draws the place under it.
  const tick = useCallback(() => {
    frame.current = requestAnimationFrame(tick)
    const op = manager?.dragOperation
    if (!op?.source) return
    const { x, y } = op.position.current
    const el = opts.current.scroller.current
    if (el && byPointer.current && Math.hypot(x - origin.current.x, y - origin.current.y) > 6) autoScroll(el, x, y)
    const next = place({ operation: op } as unknown as Ev)
    setPreview((prev) => (same(prev, next) ? prev : next))
  }, [manager, place])
  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const titleOf = (id: string | number) => opts.current.blocks.find((b) => b.id === String(id))?.title
  useDragDropMonitor({
    onDragStart: (ev: Ev & { operation: { activatorEvent?: Event } }) => {
      const src = ev.operation.source
      if (!src) return
      const top = src.element?.getBoundingClientRect().top
      grab.current = src.data.kind === "block" && top !== undefined ? ev.operation.position.current.y - top : 10
      byPointer.current = typeof PointerEvent !== "undefined" && ev.operation.activatorEvent instanceof PointerEvent
      origin.current = { ...ev.operation.position.current }
      setDragId(String(src.id))
      const own = opts.current.blocks.find((b) => b.id === String(src.id))
      setSaid(`Lifted ${own ? `${own.title}, ${own.start === null ? "Any time" : clockWords(own.start)}` : String(src.data.label || "visit")}.`)
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(tick)
    },
    onDragEnd: (ev: Ev) => {
      cancelAnimationFrame(frame.current)
      const next = ev.canceled ? null : place(ev)
      const id = ev.operation.source?.id
      setPreview(null)
      setDragId(null)
      justDropped.current = true
      setTimeout(() => { justDropped.current = false }, 80)
      if (!next) return setSaid(`${ev.canceled || id === undefined ? "Canceled" : "Dropped outside the calendar"}. ${id === undefined ? "" : `${titleOf(id) ?? "The visit"} stays where it was.`}`.trim())
      const { id: moved, day, personId, start, conflict, external } = next
      setSettleId(moved)
      setTimeout(() => setSettleId((s) => (s === moved ? null : s)), 400)
      setSaid(`Dropped. ${placeWords(next, opts.current.names)}`)
      if (external) opts.current.onDropExternal?.({ id: moved, day, personId, start, conflict })
      else opts.current.onMove?.({ id: moved, day, personId, start, conflict })
    },
  } as never)

  // the live region follows the place under the carried visit: a pause between presses is enough for it to be read
  useEffect(() => {
    if (preview && dragId) setSaid(placeWords(preview, opts.current.names))
  }, [preview, dragId])

  return { preview, dragId, settleId, said, justDropped }
}
