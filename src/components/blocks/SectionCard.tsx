import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { SectionHeading } from "./SectionHeading"

// The surface every group of information on an admin page sits on (docs/DESIGN.md, "The recipe"; the rules are in
// docs/plans/2026-11-19-admin-page-layout-research.md): a white card with a hairline and a small shadow on the cream canvas, a title bar
// (the display-face heading, a quiet action at its right) with a hairline under it, then the body at 20px. `flush` lets a list or a grid run
// edge to edge; with no title the card is a plain surface (a grid). Pure render, server component.

export interface SectionCardProps {
  title?: string
  /** an id for the heading, so the card is a labelled region */
  id?: string
  /** a quiet link or button at the right of the title bar: Edit, Add a note */
  action?: ReactNode
  /** the body has no padding: a list or a grid fills the card */
  flush?: boolean
  children: ReactNode
  className?: string
}

export function SectionCard({ title, id, action, flush, children, className }: SectionCardProps) {
  return (
    <section data-slot="section-card" aria-labelledby={title ? id : undefined} className={cn("overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm", className)}>
      {title && (
        <div data-slot="section-card-bar" className="border-b border-border px-5 py-3">
          <SectionHeading level={2} size="card" id={id} action={action}>
            {title}
          </SectionHeading>
        </div>
      )}
      <div data-slot="section-card-body" className={flush ? undefined : "px-5 py-4"}>
        {children}
      </div>
    </section>
  )
}
