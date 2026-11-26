import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { TrailIcon, type TrailIconName } from "./TrailIcon"

// What a list, grid or panel shows when it has nothing to show: a short
// title, one line that says what to do next, and at most one action
// (docs/DESIGN.md, Tables). The optional icon sits in a stone circle above
// the title. A plain block with no live region: a caller that swaps it in
// after a filter change wraps it in its own. Pure render, server component.
//
// The customer's screens (the account, the pay page) pass `scene` in place of
// `icon`: one of the Trailhead drawings (TrailIcon), which draws itself once,
// over a title and line set by ROLE on the customer type scale. `size` says
// where it stands: "md" a whole list or card that is empty (the default),
// "sm" one quiet row inside a section that has its own heading (the drawing at
// the left), "page" a page that cannot be opened (the page's h1, left aligned).
// The admin's use (no scene) is unchanged.

export interface EmptyStateProps {
  title: string
  /** one sentence that says what happens next or what to do; left out when the title and the action say it all */
  line?: string
  action?: ReactNode
  icon?: LucideIcon
  /** a Trailhead drawing in place of the icon: the customer's zero states */
  scene?: TrailIconName
  /** with a scene: a whole empty list or card (md), a row inside a section (sm), a page that cannot be opened (page) */
  size?: "sm" | "md" | "page"
  /** the title's tag; a paragraph unless the screen needs a heading here */
  titleAs?: "p" | "h1" | "h2" | "h3"
  className?: string
}

const TITLE = { sm: "type-body text-foreground", md: "type-heading text-navy", page: "type-title text-navy" } as const

export function EmptyState({ title, line, action, icon: Icon, scene, size = "md", titleAs: Title = "p", className }: EmptyStateProps) {
  if (scene && size === "sm") {
    return (
      <div data-slot="empty-state" data-size="sm" className={cn("flex items-center gap-4", className)}>
        <TrailIcon name={scene} className="size-14 shrink-0" />
        <div className="min-w-0">
          <Title className={TITLE.sm}>{title}</Title>
          {line && <p className="type-meta text-muted-foreground">{line}</p>}
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    )
  }
  if (scene) {
    const page = size === "page"
    return (
      <div data-slot="empty-state" data-size={size} className={cn("flex flex-col", page ? "items-start" : "items-center px-4 py-10 text-center", className)}>
        <TrailIcon name={scene} className="mb-4" />
        <Title className={TITLE[size]}>{title}</Title>
        {line && <p className={cn("max-w-sm type-body", page ? "mt-3 text-foreground" : "mt-2 text-muted-foreground")}>{line}</p>}
        {action && <div className={cn("mt-6", page && "w-full")}>{action}</div>}
      </div>
    )
  }
  return (
    <div data-slot="empty-state" className={cn("flex flex-col items-center px-4 py-12 text-center", className)}>
      {Icon && (
        <span data-slot="empty-state-icon" className="mb-4 flex size-10 items-center justify-center rounded-full bg-stone text-muted-foreground">
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <Title className="font-display text-xl text-navy">{title}</Title>
      {line && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{line}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
