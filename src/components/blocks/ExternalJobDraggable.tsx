"use client"

import type { ReactNode } from "react"
import { useDraggable } from "@dnd-kit/react"
import { cn } from "@/lib/utils"

// A row from outside the clock that can be dropped onto it (the Unscheduled panel's rows). It must sit inside the same drag provider as the
// TimeGrid, which `TimeGridDndProvider` (TimeGrid.tsx) makes when the screen wraps both. The drop reaches the grid's `onDropExternal` with the
// id, the day, the person and the snapped start. Dragging is never the only way: the row keeps its own Find a time button
// (docs/plans/2026-11-25-scheduler-design.md, 7.13). `data-unscheduled-id` lets other code find the row.

/** The hook form, for a row that needs the ref itself. `minutes` sizes the ghost on the clock (60 when unknown). */
export function useExternalJobDrag(id: string, opts: { minutes?: number; label?: string; disabled?: boolean } = {}) {
  return useDraggable({ id, disabled: opts.disabled, data: { kind: "external", minutes: opts.minutes ?? 60, label: opts.label ?? "" } })
}

export interface ExternalJobDraggableProps {
  id: string
  minutes?: number
  label?: string
  disabled?: boolean
  children: ReactNode
  className?: string
}

export function ExternalJobDraggable({ id, minutes, label, disabled, children, className }: ExternalJobDraggableProps) {
  const { ref, handleRef, isDragSource } = useExternalJobDrag(id, { minutes, label, disabled })
  return (
    <div ref={ref} data-slot="external-job-draggable" data-unscheduled-id={id} className={cn(isDragSource && "opacity-40", className)}>
      <div ref={handleRef} tabIndex={disabled ? undefined : 0} className="cursor-grab rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing">
        {children}
      </div>
    </div>
  )
}
