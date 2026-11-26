import { cn } from "@/lib/utils"
import { Tick } from "./Tick"

// The "On file" mark (Hannah, Nov 23 2026): a quiet chip with the one thin tick (Tick) that draws itself in once, shown where something we already hold is in use: the picked address that is a property we know, and the zones
// or the access answer that started from what we hold. It says nothing about who. The tick glyph has about 3 px of empty box on each side, so the left padding is smaller than the right: the drawn stroke sits 10 px from either edge. The check is a 220 ms stroke (`.draw-check`, base.css) and is simply drawn under prefers-reduced-motion. Pure props.

export function OnFileMark({ className }: { className?: string }) {
  return (
    <span data-slot="on-file-mark" className={cn("inline-flex items-center gap-1 rounded-full border border-border bg-cream py-0.5 pl-1.5 pr-2.5 text-sm font-semibold text-navy", className)}>
      <Tick draw className="size-3.5" />
      On file
    </span>
  )
}
