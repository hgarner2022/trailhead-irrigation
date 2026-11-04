import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type DefinitionItem = {
  term: string
  definition: ReactNode
  /** Optional line icon shown in a tinted circle beside the term (plain variant). */
  icon?: LucideIcon
}

// Semantic <dl>/<dt>/<dd> definition grid for "What is X?" blocks.
// 40–60 word answers are highly extractable by AI search engines —
// one of the highest-leverage content patterns for AI Overviews.
//
// Two looks: "card" (bordered tiles, the default) and "plain" (no chrome,
// an icon circle beside each term; the section background does the grouping).

type DefinitionListProps = {
  items: DefinitionItem[]
  /** Inner card background color (card variant). */
  itemBg?: "background" | "cream"
  /** Number of columns at md and up. */
  columns?: 1 | 2 | 3
  variant?: "card" | "plain"
  className?: string
}

export function DefinitionList({
  items,
  itemBg = "cream",
  columns = 2,
  variant = "card",
  className,
}: DefinitionListProps) {
  const colsClass =
    columns === 3 ? "md:grid-cols-2 lg:grid-cols-3" : columns === 2 ? "md:grid-cols-2" : ""
  const itemBgClass = itemBg === "cream" ? "bg-cream" : "bg-background"

  if (variant === "plain") {
    return (
      <dl className={cn("grid grid-cols-1 gap-8", colsClass, className)}>
        {items.map((item) => (
          <div key={item.term} className="flex gap-4">
            {item.icon && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream text-primary" aria-hidden="true">
                <item.icon className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0">
              <dt className="font-semibold text-foreground">{item.term}</dt>
              <dd className="text-muted-foreground leading-relaxed mt-1">{item.definition}</dd>
            </div>
          </div>
        ))}
      </dl>
    )
  }

  return (
    <dl className={cn("grid grid-cols-1 gap-6", colsClass, className)}>
      {items.map((item) => (
        <div key={item.term} className={cn("border border-border rounded-lg p-6", itemBgClass)}>
          <dt className="font-semibold text-foreground mb-2">{item.term}</dt>
          <dd className="text-muted-foreground leading-relaxed">{item.definition}</dd>
        </div>
      ))}
    </dl>
  )
}
