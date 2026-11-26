"use client"

import { useMemo, type ReactNode } from "react"
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

export function PeekAnchor({ anchorId, find, boundary, onClose, children }: PeekAnchorProps) {
  const anchor = useMemo(() => {
    let last: DOMRect | null = null
    return { current: { getBoundingClientRect: () => { const el = find(anchorId); if (el) last = el.getBoundingClientRect(); return last ?? new DOMRect() } } }
  }, [anchorId, find])
  return (
    <PopoverPrimitive.Root open onOpenChange={(o) => !o && onClose()}>
      <PopoverPrimitive.Anchor virtualRef={anchor} />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          data-slot="peek-anchor"
          role="presentation"
          side="right"
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
          className="z-40 flex max-h-(--radix-popover-content-available-height) w-[360px] rounded-lg shadow-xl outline-none"
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
