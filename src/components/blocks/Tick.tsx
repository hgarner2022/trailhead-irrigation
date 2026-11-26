import { cn } from "@/lib/utils"

// THE one tick of the customer's screens (Hannah, Nov 25 2026, of the orange badge on the chosen service: "I just hate the check, it looks tacky"; the research and the pictures are in
// docs/review/2026-11-26-check-redesign). A tick only ever says "this is included", "this is done" or "this is saved". It is a thin line in ink: a quiet navy by default, or the colour of the
// words it sits beside (`text-current`). It is never inside a filled disc, never green or orange, and it never pulses. "You chose this" is not a tick at all: a chosen option is filled navy
// (option-styles.ts), and the service card's ring gains its dot (ServiceCard). `draw` strokes it in once (`.draw-check`, base.css) where it answers a press; it is simply there under
// prefers-reduced-motion. Always decorative: the words beside it carry the meaning.

export interface TickProps {
  /** strokes the tick in once, in answer to something the customer just did */
  draw?: boolean
  className?: string
}

export function Tick({ draw = false, className }: TickProps) {
  return (
    <svg data-slot="tick" aria-hidden viewBox="0 0 16 16" className={cn("size-4 shrink-0 text-navy/60", draw && "draw-check", className)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  )
}
