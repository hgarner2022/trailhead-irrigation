import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// What a list, grid or panel shows when it has nothing to show: a short
// title, one line that says what to do next, and at most one action
// (docs/DESIGN.md, Tables). The optional icon sits in a stone circle above
// the title. A plain block with no live region: a caller that swaps it in
// after a filter change wraps it in its own. Pure render, server component.

export interface EmptyStateProps {
  title: string
  /** one sentence that says what happens next or what to do */
  line: string
  action?: ReactNode
  icon?: LucideIcon
  className?: string
}

export function EmptyState({ title, line, action, icon: Icon, className }: EmptyStateProps) {
  return (
    <div data-slot="empty-state" className={cn("flex flex-col items-center px-4 py-12 text-center", className)}>
      {Icon && (
        <span data-slot="empty-state-icon" className="mb-4 flex size-10 items-center justify-center rounded-full bg-stone text-muted-foreground">
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <p className="font-display text-xl text-navy">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{line}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
