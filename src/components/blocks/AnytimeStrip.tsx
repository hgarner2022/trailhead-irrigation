"use client"

import { cn } from "@/lib/utils"
import { TimeBlock, type BlockAction } from "./TimeBlock"
import type { GridBlock } from "./time-grid-model"

// The Any time strip (docs/plans/2026-11-25-scheduler-design.md, 7.5): a visit with a day and no start time sits above the clock as a short chip,
// street, service and length, in the order the day will be driven. Dragging a chip down onto the clock gives it a time; dragging a block up
// into the strip clears it (the grid does both). Empty, the strip collapses to one thin line that says "Any time", so the label is
// always there to drop onto. In the grid the gutter carries the label, so `labelled` is off there. Pure props.

export interface AnytimeStripProps {
  blocks: readonly GridBlock[]
  personIndex?: number
  initials?: string
  selectedId?: string
  hoverId?: string
  /** names the strip for a screen reader: "Any time, Ryan" */
  label?: string
  /** shows the word "Any time" at the left; the grid leaves it to its gutter */
  labelled?: boolean
  touch?: boolean
  /** the id of the chip being dragged, dimmed in place */
  draggingId?: string
  /** how a chip is made draggable; the grid wraps it */
  wrap?: (block: GridBlock, chip: React.ReactElement) => React.ReactNode
  onSelect?: (id: string) => void
  onHover?: (id: string | null) => void
  onAction?: (id: string, action: BlockAction) => void
  className?: string
}

export function AnytimeStrip({ blocks, personIndex = 0, initials, selectedId, hoverId, label = "Any time", labelled = true, touch, draggingId, wrap, onSelect, onHover, onAction, className }: AnytimeStripProps) {
  const empty = blocks.length === 0
  return (
    <div role="group" aria-label={label} data-slot="anytime-strip" data-empty={empty || undefined} className={cn("flex min-w-0 items-center gap-1.5", empty ? "min-h-5" : "flex-wrap py-1", className)}>
      {labelled && <span className={cn("shrink-0 text-xs font-medium text-navy-light", !empty && "mr-1")}>Any time</span>}
      {empty && labelled && <span aria-hidden className="h-px min-w-6 flex-1 bg-border" />}
      {blocks.map((b) => {
        const chip = (
          <TimeBlock key={b.id} block={b} variant="chip" personIndex={personIndex} initials={initials} touch={touch} selected={selectedId === b.id} hovered={hoverId === b.id} dragging={draggingId === b.id} onSelect={onSelect} onHover={onHover} onAction={onAction} className="min-w-0 max-w-full flex-1 basis-32" />
        )
        return wrap ? wrap(b, chip) : chip
      })}
    </div>
  )
}
