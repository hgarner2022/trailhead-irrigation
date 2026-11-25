import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// A visit whose customer has not been told about a move (docs/plans/2026-11-25-scheduler-design.md, 7.8). Two looks. `mark` is the small bell on a block or a row, named "Customer not told" for a
// screen reader (the dashed left edge is the block's own, drawn by TimeBlock). `notice` is the one line in the visit's panel, "Customer not told", with Notify and Don't tell. The state is read
// from events by the screen; this block only draws it. Pure render apart from the two buttons' callbacks.

export interface NotToldProps {
  variant?: "mark" | "notice"
  /** the notice's buttons */
  onNotify?: () => void
  onDontTell?: () => void
  className?: string
}

export function NotTold({ variant = "mark", onNotify, onDontTell, className }: NotToldProps) {
  if (variant === "mark")
    return (
      <span role="img" aria-label="Customer not told" data-slot="not-told-mark" className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-warning/14 text-warning-ink", className)}>
        <Bell className="size-3" aria-hidden />
      </span>
    )
  return (
    <div data-slot="not-told-notice" className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-warning/40 bg-warning/14 px-3 py-1 text-sm text-warning-ink", className)}>
      <Bell className="size-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 font-medium">Customer not told</p>
      <div className="flex flex-wrap gap-1">
        <Button type="button" size="sm" variant="ghost" className="min-h-11 font-semibold text-warning-ink hover:bg-warning/14 hover:text-warning-ink" onClick={onNotify}>
          Notify
        </Button>
        <Button type="button" size="sm" variant="ghost" className="min-h-11 text-warning-ink hover:bg-warning/14 hover:text-warning-ink" onClick={onDontTell}>
          Don't tell
        </Button>
      </div>
    </div>
  )
}
