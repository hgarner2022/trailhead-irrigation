"use client"

import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { useAdminBar } from "./admin-bar"

// The one header every app screen opens with (docs/DESIGN.md, Aesthetic
// direction): the page title as the h1, an optional line of context beside it
// ("Thursday, November 12. Updated 4 minutes ago.") and the page's actions at
// the right. Inside AdminShell on a laptop it moves up into the 56px top bar,
// title and context on one baseline, actions at the right edge. On a phone
// and outside a shell it renders where it is placed, and the row wraps so the
// actions drop under the title.

export interface PageHeaderProps {
  title: string
  context?: string
  actions?: ReactNode
  className?: string
}

function Title({ title, context }: Pick<PageHeaderProps, "title" | "context">) {
  return (
    <>
      <h1 className="shrink-0 font-display text-[1.75rem] font-semibold leading-none text-navy">{title}</h1>
      {context && (
        <p data-slot="page-context" className="min-w-0 truncate text-sm text-muted-foreground">
          {context}
        </p>
      )}
    </>
  )
}

export function PageHeader({ title, context, actions, className }: PageHeaderProps) {
  const bar = useAdminBar()
  if (bar?.mode === "bar") {
    // The slots exist once the shell has mounted; until then nothing is drawn.
    return (
      <>
        {bar.title && createPortal(<Title title={title} context={context} />, bar.title)}
        {bar.actions && actions ? createPortal(actions, bar.actions) : null}
      </>
    )
  }
  return (
    <header data-slot="page-header" className={cn("mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-[1.75rem] font-semibold leading-none text-navy">{title}</h1>
        {context && (
          <p data-slot="page-context" className="mt-2 text-sm text-muted-foreground">
            {context}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}
