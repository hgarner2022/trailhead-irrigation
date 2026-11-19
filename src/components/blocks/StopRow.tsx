"use client"

import type { DragEvent } from "react"
import { Check, Lock, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { areaBorder } from "./area-colours"
import { StatusPill } from "./StatusPill"

// One stop in a person's day on the Schedule's Day view (docs/plans/2026-11-18-admin-holistic-design.md, 5.2): its number in that person's
// route (the pin on the map carries the same number), its time ("9:00", or "Any time" for a stop with no time; a booked time carries a small lock because
// it is fixed), the customer and town over the service, and the area's colour on the left like every week block. A stop is one 44px
// button that opens the visit, and it can be dragged to another person's list or another day, which the screen turns into a Move.
// Pure render apart from the click and the drag; the screen owns what they do. Client component.

export interface StopRowProps {
  id: string
  /** 1-based place in the person's day */
  number: number
  /** "9:00 am" or "Any time" */
  time: string
  /** the time was promised at booking and does not move when the day is ordered */
  booked?: boolean
  name: string
  town: string
  service: string
  /** the area's place in the colour list; -1 for the quiet bar */
  areaIndex: number
  selected?: boolean
  /** moved by someone other than the app (the week's warning mark) */
  moved?: boolean
  /** Ryan moved it and asked the customer to reply YES: the neutral "Waiting on customer" pill */
  waiting?: boolean
  /** the visit is done: drawn lighter with a check */
  done?: boolean
  /** "Done early" or "Done late": the done day is not the scheduled day */
  doneNote?: string
  draggable?: boolean
  onOpen: (id: string) => void
  className?: string
}

export function StopRow({ id, number, time, booked, name, town, service, areaIndex, selected, moved, waiting, done, doneNote, draggable, onOpen, className }: StopRowProps) {
  const onDragStart = (event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData("text/plain", id)
    event.dataTransfer.effectAllowed = "move"
  }
  return (
    <li data-slot="stop-row" className={cn("border-l-4 bg-card", areaBorder(areaIndex), done && "bg-stone/60 text-muted-foreground", selected && "ring-2 ring-inset ring-primary/50", className)}>
      <button
        type="button"
        draggable={draggable}
        onDragStart={draggable ? onDragStart : undefined}
        onClick={() => onOpen(id)}
        className={cn("flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50", draggable && "cursor-grab")}
      >
        <span data-slot="stop-number" className="w-5 shrink-0 text-sm font-semibold tabular-nums text-navy">
          <span className="sr-only">Stop </span>
          {number}
        </span>
        <span data-slot="stop-time" className="flex w-24 shrink-0 items-center gap-1 text-sm tabular-nums text-muted-foreground">
          {time}
          {booked && (
            <>
              <Lock className="size-3 shrink-0" aria-hidden />
              <span className="sr-only">, booked time</span>
            </>
          )}
        </span>
        <span className="min-w-0 flex-1 text-sm">
          <span className="block truncate text-foreground">
            {name}
            <span className="text-muted-foreground"> · {town}</span>
          </span>
          <span className="block truncate text-xs text-muted-foreground">{doneNote ? `${service} · ${doneNote}` : service}</span>
        </span>
        {done && (
          <>
            <Check data-slot="done-mark" className="size-4 shrink-0 text-success" aria-hidden />
            <span className="sr-only">, done</span>
          </>
        )}
        {waiting && <StatusPill status="waiting" data-pill="waiting" className="shrink-0" />}
        {moved && (
          <>
            <TriangleAlert className="size-4 shrink-0 text-warning" aria-hidden />
            <span className="sr-only">, moved</span>
          </>
        )}
      </button>
    </li>
  )
}
