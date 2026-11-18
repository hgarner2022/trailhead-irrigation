import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// The pieces every record panel is made of (docs/DESIGN.md, Uniformity), so the Customer, Visit and Pass panels read as
// one: a section is a heading and then its rows; facts are a two-column list; a row is a title over a detail on the
// left (cut with an ellipsis, the full words in its title) and one pill or amount on the right that never shrinks.
// The panel's own header, padding and footer come from SidePanel. No state, no data.

/** The heading of a section: Barlow Condensed, navy, always followed by its rows with `mt-2`. */
export function PanelHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="font-display text-lg leading-tight text-navy">
      {children}
    </h3>
  )
}

/** A label and its value per line; labels are muted, values medium weight and free to wrap. */
export function PanelFacts({ rows, className }: { rows: [string, ReactNode][]; className?: string }) {
  return (
    <dl className={cn("mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm", className)}>
      {rows.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="min-w-0 break-words font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The list a section's rows go in. */
export function PanelList({ children, className, ...rest }: { children: ReactNode; className?: string } & Record<`data-${string}`, string>) {
  return (
    <ul className={cn("mt-2 divide-y divide-border text-sm", className)} {...rest}>
      {children}
    </ul>
  )
}

/** The classes of a row's clickable box: one height, one gap, one vertical rhythm. */
export const PANEL_ROW = "gap-3 py-1.5"

/** The left of a row: a title over a detail, each on one line with an ellipsis. */
export function PanelRowText({ title, detail, strong }: { title: string; detail?: string; strong?: boolean }) {
  return (
    <span className="block min-w-0 flex-1">
      <span className={cn("block truncate", strong ? "font-semibold" : "font-medium")} title={title}>
        {title}
      </span>
      {detail ? (
        <span className="block truncate text-muted-foreground" title={detail}>
          {detail}
        </span>
      ) : null}
    </span>
  )
}

/** The right of a row: a pill or an amount, which shrinks last (never). */
export function PanelRowEnd({ children }: { children: ReactNode }) {
  return <span className="shrink-0 text-right">{children}</span>
}
