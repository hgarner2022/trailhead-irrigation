import { CheckCircle2 } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// The one check list. A green CheckCircle2 beside each line, the same
// gap and colour everywhere (Hannah, Nov 5 2026: consistency). `size="sm"`
// is for lists inside cards; the default is for lists in a section body.

type CheckListProps = {
  items: ReactNode[]
  size?: "default" | "sm"
  className?: string
}

export function CheckList({ items, size = "default", className }: CheckListProps) {
  const sm = size === "sm"
  return (
    <ul className={cn("flex flex-col", sm ? "gap-2 text-sm text-muted-foreground" : "gap-3 text-foreground", className)}>
      {items.map((item, i) => (
        <li key={i} className={cn("flex items-start", sm ? "gap-2" : "gap-3")}>
          <CheckCircle2 className={cn("text-success shrink-0 mt-0.5", sm ? "h-4 w-4" : "h-5 w-5")} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
