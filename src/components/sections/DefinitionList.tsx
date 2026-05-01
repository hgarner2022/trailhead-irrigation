import { cn } from "@/lib/utils"

export type DefinitionItem = {
  term: string
  definition: string
}

// Semantic <dl>/<dt>/<dd> definition grid for "What is X?" blocks.
// 40–60 word answers are highly extractable by AI search engines —
// one of the highest-leverage content patterns for AI Overviews.

type DefinitionListProps = {
  items: DefinitionItem[]
  /** Inner card background color. */
  itemBg?: "background" | "cream"
  /** Number of columns at md and up. */
  columns?: 2 | 3
  className?: string
}

export function DefinitionList({
  items,
  itemBg = "cream",
  columns = 2,
  className,
}: DefinitionListProps) {
  const colsClass =
    columns === 3
      ? "md:grid-cols-2 lg:grid-cols-3"
      : "md:grid-cols-2"
  const itemBgClass = itemBg === "cream" ? "bg-cream" : "bg-background"
  return (
    <dl className={cn("grid grid-cols-1 gap-6", colsClass, className)}>
      {items.map((item) => (
        <div
          key={item.term}
          className={cn(
            "border border-border rounded-lg p-6",
            itemBgClass
          )}
        >
          <dt className="font-semibold text-foreground mb-2">{item.term}</dt>
          <dd className="text-muted-foreground leading-relaxed">
            {item.definition}
          </dd>
        </div>
      ))}
    </dl>
  )
}
