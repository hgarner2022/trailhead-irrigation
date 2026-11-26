"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Popover as PopoverPrimitive } from "radix-ui"

// Where the visit peek opens (docs/DESIGN.md "Schedule calendar", the review of Nov 26 2026): beside the visit that was clicked, like Google Calendar's and Jobber's visit card. It is the product's
// Radix popper behind a non-modal Popover with a virtual anchor: the card sits to the right of the block (to its left when the right has no room), 8 px away, its top on the block's top and
// shifted up or down to stay whole inside the calendar's visible area, so it never covers the block it belongs to. It follows the block while the grid scrolls, the window resizes or the visit
// moves (the position is read every frame while it is open, one card), and a different visit swaps the words in place: the card stays mounted, so it does not enter again. Non-modal on purpose:
// nothing here takes focus, traps it, closes on a click elsewhere or makes the calendar inert. Escape closes it (the host puts focus back on the block). Pure props.

export interface PeekAnchorProps {
  /** the visit the card belongs to: a live lookup of its block, so a block that is re-drawn in another column is still found */
  anchorId: string
  /** where the block is found */
  find: (id: string) => HTMLElement | null
  /** the calendar's visible area: the card stays inside it */
  boundary: HTMLElement | null
  onClose: () => void
  children: ReactNode
}

export const PEEK_GAP = 8
export const PEEK_MAX = 360
export const PEEK_MIN = 280

export interface Box { left: number; right: number; top: number; bottom: number }
export interface PeekPlacement {
  /** the side of the anchor the card opens on */
  side: "left" | "right"
  /** the card's width in px */
  width: number
  /** `beside` rides the block; `over` floats over the calendar's edge on the side away from the block */
  mode: "beside" | "over"
  /** the box the card is placed against: the block itself, or a zero-width strip at the calendar's edge with the block's height */
  anchor: Box
}

/**
 * Where the card goes, from the block and the calendar's visible area (pure, so it is tested without a layout engine). Beside the block when a full 360 px fits on the right, then the left;
 * else the roomier side when it still fits the 280 px minimum, with the card narrowed to it; else floating over the calendar's edge on the roomier side at its minimum 280 px, so it covers as little of the block as it can (never more than the few px that the missing room comes to).
 */
export function peekPlacement(block: Box, area: Box): PeekPlacement {
  const right = area.right - block.right - PEEK_GAP * 2
  const left = block.left - area.left - PEEK_GAP * 2
  if (right >= PEEK_MAX) return { side: "right", width: PEEK_MAX, mode: "beside", anchor: block }
  if (left >= PEEK_MAX) return { side: "left", width: PEEK_MAX, mode: "beside", anchor: block }
  const room = Math.max(right, left)
  if (room >= PEEK_MIN) return { side: right >= left ? "right" : "left", width: Math.floor(room), mode: "beside", anchor: block }
  // neither side has 280 px: the card takes the edge on the roomier side, 280 px wide (the least it can be), so it covers the least of the block it can
  const width = Math.floor(Math.min(PEEK_MIN, area.right - area.left - PEEK_GAP * 2))
  return right >= left
    ? { side: "left", width, mode: "over", anchor: { left: area.right, right: area.right, top: block.top, bottom: block.bottom } }
    : { side: "right", width, mode: "over", anchor: { left: area.left, right: area.left, top: block.top, bottom: block.bottom } }
}

export function PeekAnchor({ anchorId, find, boundary, onClose, children }: PeekAnchorProps) {
  const measure = (): PeekPlacement | null => {
    const el = find(anchorId)
    const area = boundary?.getBoundingClientRect()
    return el && area ? peekPlacement(el.getBoundingClientRect(), area) : null
  }
  const [placement, setPlacement] = useState<PeekPlacement>(() => measure() ?? { side: "right", width: PEEK_MAX, mode: "beside", anchor: { left: 0, right: 0, top: 0, bottom: 0 } })
  // the placement is read every frame while the card is open (scroll, resize, a panel opening) and set only when it changes
  useEffect(() => {
    let frame = 0
    const tick = () => {
      const next = measure()
      if (next) setPlacement((cur) => (cur.side === next.side && cur.width === next.width && cur.mode === next.mode ? cur : next))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorId, find, boundary])
  const mode = placement.mode
  const anchor = useMemo(() => {
    let last: DOMRect | null = null
    return {
      current: {
        getBoundingClientRect: () => {
          const el = find(anchorId)
          const area = boundary?.getBoundingClientRect()
          if (el && area) {
            const b = el.getBoundingClientRect()
            const p = mode === "over" ? peekPlacement(b, area) : null
            last = p && p.mode === "over" ? new DOMRect(p.anchor.left, p.anchor.top, 0, p.anchor.bottom - p.anchor.top) : b
          }
          return last ?? new DOMRect()
        },
      },
    }
  }, [anchorId, find, boundary, mode])
  return (
    <PopoverPrimitive.Root open onOpenChange={(o) => !o && onClose()}>
      <PopoverPrimitive.Anchor virtualRef={anchor} />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          data-slot="peek-anchor"
          role="presentation"
          side={placement.side}
          data-mode={placement.mode}
          style={{ width: placement.width }}
          align="start"
          sideOffset={PEEK_GAP}
          avoidCollisions
          collisionBoundary={boundary ?? undefined}
          collisionPadding={PEEK_GAP}
          sticky="always"
          hideWhenDetached
          updatePositionStrategy="always"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="z-40 flex max-h-(--radix-popover-content-available-height) rounded-lg shadow-xl outline-none"
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
