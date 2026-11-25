import { cn } from "@/lib/utils"

// The "On file" mark (Hannah, Nov 23 2026): a quiet chip with a check that draws itself in once, shown where something we already hold is in use: the picked address that is a property we know, and the zones
// or the access answer that started from what we hold. It says nothing about who. The check is a 220 ms stroke (`.draw-check`, base.css) and is simply drawn under prefers-reduced-motion. Pure props.

export function OnFileMark({ className }: { className?: string }) {
  return (
    <span data-slot="on-file-mark" className={cn("inline-flex items-center gap-1.5 rounded-full border border-border bg-cream py-0.5 pl-2 pr-2.5 text-sm font-semibold text-navy", className)}>
      <svg aria-hidden viewBox="2.4 3.4 11.2 9.2" className="draw-check h-3 w-3.5 shrink-0 text-success" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 8.5l3 3 6-7" />
      </svg>
      On file
    </span>
  )
}
