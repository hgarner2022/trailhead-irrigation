import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// The one heading for a part of an app screen (docs/DESIGN.md, "The recipe"). `section` is a record panel's heading, an h3 in the
// display face at 18px, navy, with a quiet Edit or Add link at its right; `card` is the title of a card on a screen, an h2 under the
// page's h1 at 24px. Merges the panel heading and the card title so a heading is one component with two sizes. Pure render, server component.

export interface SectionHeadingProps {
  children: ReactNode
  /** an id for aria-labelledby on the section or card */
  id?: string
  /** 3 for a section of a panel (default), 2 for the title of a card, so the order stays h1, h2, h3 */
  level?: 2 | 3
  size?: "section" | "card"
  /** a quiet link or button at the right of the heading: Edit, Add a note */
  action?: ReactNode
  className?: string
}

const SIZE = { section: "text-lg leading-tight", card: "text-2xl font-semibold leading-none" } as const

export function SectionHeading({ children, id, level = 3, size = level === 2 ? "card" : "section", action, className }: SectionHeadingProps) {
  const Tag = level === 2 ? "h2" : "h3"
  const heading = (
    <Tag id={id} data-slot="section-heading" data-size={size} className={cn("font-display text-navy", SIZE[size], className)}>
      {children}
    </Tag>
  )
  if (!action) return heading
  return (
    <div data-slot="section-heading-row" className="flex items-baseline justify-between gap-3">
      {heading}
      <span className="shrink-0 text-sm">{action}</span>
    </div>
  )
}
