import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

// THE section heading. Every section h2 on the site goes through this
// (Hannah, Nov 5 2026: consistency), so the size, colour and eyebrow are
// the same everywhere: eyebrow (text-xs uppercase, orange) → h2 (3xl/4xl,
// display face via the global h2 rule) → description. `tone="dark"` is the
// navy-section version. The only h2s that bypass it are the two display
// moments: the hero tagline and "Go find your trail." on the closing strip.
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
  /** `dark` for navy sections: white heading, light-orange eyebrow, white/80 description. */
  tone?: "light" | "dark"
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
  tone = "light",
  className,
}: SectionHeaderProps) {
  const dark = tone === "dark"
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
        <p className={cn("text-xs font-semibold uppercase tracking-widest", dark ? "text-primary-light" : "text-primary")}>
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
          className={cn("text-3xl md:text-4xl font-bold", dark ? "text-white" : "text-foreground")}
        >
          {title}
        </h2>
      )}
      {description && (
        // mx-auto only when centered. Hardcoding it left the description
        // centered under a left-aligned title on every align="left" usage.
        <p
          className={cn(
            "max-w-2xl",
            dark ? "text-white/80" : "text-muted-foreground",
            align === "center" && "mx-auto"
          )}
        >
          {description}
        </p>
      )}
    </div>
  )
}
