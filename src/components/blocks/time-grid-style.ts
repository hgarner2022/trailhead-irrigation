import { personClass } from "./day-map-helpers"

/**
 * What a person's colour means on the clock. `personClass(index)` (the one colour list the map and the Schedule share) gives
 * the solid class; each entry here is its soft fill for a block (navy text on it is over 9:1), the fill a step stronger under the
 * pointer (the block is the `group`), the solid left edge, the avatar ring, the hatch of time off and the wash of a column a drag is over. Whole class names so
 * Tailwind finds them. Five people are told apart; a sixth wraps, as everywhere else.
 */
interface PersonStyle { dot: string; tint: string; hover: string; /** the hovered fill, for a block lit from the map or the list */ hot: string; bar: string; ring: string; hatch: string; wash: string; ghost: string }
const BY_CLASS: Record<ReturnType<typeof personClass>, Omit<PersonStyle, "dot">> = {
  "bg-primary": { tint: "bg-primary/14", hover: "group-hover:bg-primary/22", hot: "bg-primary/22", bar: "border-l-primary", ring: "ring-primary", hatch: "[--hatch:var(--color-primary)]", wash: "bg-primary/5", ghost: "border-primary" },
  "bg-navy": { tint: "bg-navy/10", hover: "group-hover:bg-navy/16", hot: "bg-navy/16", bar: "border-l-navy", ring: "ring-navy", hatch: "[--hatch:var(--color-navy)]", wash: "bg-navy/5", ghost: "border-navy" },
  "bg-positive": { tint: "bg-positive/12", hover: "group-hover:bg-positive/20", hot: "bg-positive/20", bar: "border-l-positive", ring: "ring-positive", hatch: "[--hatch:var(--color-positive)]", wash: "bg-positive/5", ghost: "border-positive" },
  "bg-person-4": { tint: "bg-person-4/12", hover: "group-hover:bg-person-4/20", hot: "bg-person-4/20", bar: "border-l-person-4", ring: "ring-person-4", hatch: "[--hatch:var(--color-person-4)]", wash: "bg-person-4/5", ghost: "border-person-4" },
  "bg-person-5": { tint: "bg-person-5/12", hover: "group-hover:bg-person-5/20", hot: "bg-person-5/20", bar: "border-l-person-5", ring: "ring-person-5", hatch: "[--hatch:var(--color-person-5)]", wash: "bg-person-5/5", ghost: "border-person-5" },
}
export const personStyle = (index: number): PersonStyle => {
  const dot = personClass(index)
  return { dot, ...BY_CLASS[dot] }
}

/** The soft hatch of time off, over the person's colour: thin lines, wide gaps, so it reads as "not here" and never as content. */
export const HATCH_STYLE = { backgroundImage: "repeating-linear-gradient(135deg, color-mix(in oklab, var(--hatch) 13%, transparent) 0 2px, transparent 2px 9px)" } as const

/** Row lines: a hairline on the hour and nothing on the half hour, drawn once per column as a background, so the visits are what the eye lands on. */
export const rowLines = (hourPx: number) => ({
  backgroundImage: "linear-gradient(to bottom, color-mix(in oklab, var(--color-border) 75%, transparent) 0 1px, transparent 1px)",
  backgroundSize: `100% ${hourPx}px`,
})
