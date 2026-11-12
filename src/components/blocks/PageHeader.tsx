import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// The one header every app screen opens with (docs/DESIGN.md, Aesthetic
// direction): the page title as the h1, an optional line of context under it
// ("Thursday, November 12. Updated 4 minutes ago.") and the page's actions on
// the right. The row wraps on a phone so the actions drop under the title.
// Pure render, server component.

export interface PageHeaderProps {
  title: string
  context?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, context, actions, className }: PageHeaderProps) {
  return (
    <header data-slot="page-header" className={cn("mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-semibold text-navy">{title}</h1>
        {context && (
          <p data-slot="page-context" className="mt-1 text-sm text-muted-foreground">
            {context}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}
