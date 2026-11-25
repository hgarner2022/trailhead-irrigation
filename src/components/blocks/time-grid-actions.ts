import { useCallback } from "react"
import type { BlockAction } from "./TimeBlock"
import { clamp, conflictFor, minutesToPx, resizeResult, type GridBlock, type HourRange, type TimeOff } from "./time-grid-model"
import type { TimeGridProps } from "./time-grid-types"

/**
 * What a block's menu does, shared by the desktop grid and the phone's day (docs/plans/2026-11-25-scheduler-design.md, 7.13). 15 minutes
 * shorter or longer and Make it Any time call the same callbacks a drag does; Set a time puts the visit at the first free 15 minutes of the
 * person's day; Move goes to the screen, which opens its Move dialog.
 */
export function useBlockActions(o: { all: readonly GridBlock[]; planned: readonly GridBlock[]; timeOff: readonly TimeOff[]; names: (id: string) => string; range: HourRange; hourPx: number; props: Pick<TimeGridProps, "onResize" | "onMove" | "onAction"> }) {
  const { all, planned, timeOff, names, range, hourPx, props } = o
  return useCallback((id: string, action: BlockAction) => {
    const b = all.find((x) => x.id === id)
    if (!b) return
    if (action === "shorter") props.onResize?.({ id, minutes: Math.max(15, b.minutes - 15) })
    else if (action === "longer") props.onResize?.({ id, minutes: resizeResult(b, minutesToPx(15, hourPx), range, hourPx) })
    else if (action === "any-time") props.onMove?.({ id, day: b.day, personId: b.personId, start: null, conflict: null })
    else if (action === "set-time") {
      const others = [...all, ...planned].filter((x) => x.id !== id)
      let start = range.start * 60
      while (start + b.minutes <= range.end * 60 && conflictFor({ id, day: b.day, personId: b.personId, start, minutes: b.minutes }, others, timeOff, names)) start += 15
      props.onMove?.({ id, day: b.day, personId: b.personId, start: clamp(start, range.start * 60, range.end * 60 - b.minutes), conflict: null })
    } else props.onAction?.(id, action)
  }, [all, planned, timeOff, names, range, hourPx, props])
}
