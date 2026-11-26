"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { PointerActivationConstraints } from "@dnd-kit/dom"
import { KeyboardSensor, PointerSensor, useDragDropMonitor } from "@dnd-kit/react"
import { conflictFor, minuteAt, moveResult, type GridBlock, type HourRange, type MoveResult, type TimeOff } from "./time-grid-model"
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

export function useGridDnd(o: DndOptions) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const grab = useRef(0)
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

  const same = (a: Preview | null, b: Preview | null) => a === b || (!!a && !!b && a.day === b.day && a.personId === b.personId && a.start === b.start && a.id === b.id)

  useDragDropMonitor({
    onDragStart: (ev: Ev) => {
      const src = ev.operation.source
      if (!src) return
      const top = src.element?.getBoundingClientRect().top
      grab.current = src.data.kind === "block" && top !== undefined ? ev.operation.position.current.y - top : 10
      setDragId(String(src.id))
    },
    onDragMove: (ev: Ev) => setPreview((prev) => { const next = place(ev); return same(prev, next) ? prev : next }),
    onDragEnd: (ev: Ev) => {
      const next = ev.canceled ? null : place(ev)
      setPreview(null)
      setDragId(null)
      if (!next) return
      const { id, day, personId, start, conflict, external } = next
      if (external) opts.current.onDropExternal?.({ id, day, personId, start, conflict })
      else opts.current.onMove?.({ id, day, personId, start, conflict })
    },
  } as never)

  return { preview, dragId }
}
