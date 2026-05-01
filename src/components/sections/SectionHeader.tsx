import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

// Standard "tagline → title → description" stacked block used at the top
// of most page sections. Replaces 6+ copy-pasted variants across the site.
//
// Props are deliberately permissive so it can render any combination:
//   - tagline only
//   - title only
//   - title + description
//   - tagline + title + description
//   - eyebrow string (alt to badge variant of tagline)

type SectionHeaderProps = {
  /** Small uppercase eyebrow text — rendered as a Badge by default. */
  tagline?: string
  /** When true, render tagline as plain primary-colored eyebrow text instead of a Badge. */
  taglineAsEyebrow?: boolean
  /** Main heading. */
  title?: string
  /** Optional id for the heading — used by aria-labelledby on the parent <section>. */
  titleId?: string
  /** Body copy under the title. */
  description?: string
  /** Center-align (default) or left-align. */
  align?: "center" | "left"
  /** className passthrough on the wrapper. */
  className?: string
}

export function SectionHeader({
  tagline,
  taglineAsEyebrow = false,
  title,
  titleId,
  description,
  align = "center",
  className,
}: SectionHeaderProps) {
  const alignClass = align === "center" ? "text-center" : "text-left"
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center",
        alignClass,
        className
      )}
    >
      {tagline && taglineAsEyebrow && (
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {tagline}
        </p>
      )}
      {tagline && !taglineAsEyebrow && (
        <Badge variant="outline" className="w-fit">
          {tagline}
        </Badge>
      )}
      {title && (
        <h2
          id={titleId}
          className="text-3xl md:text-4xl font-bold text-foreground"
        >
          {title}
        </h2>
      )}
      {description && (
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {description}
        </p>
      )}
    </div>
  )
}
