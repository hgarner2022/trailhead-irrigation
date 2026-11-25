import { personClass } from "./day-map-helpers"

/**
 * What a person's colour means on the clock. `personClass(index)` (the one colour list the map and the Schedule share) gives
 * the solid class; each entry here is its soft tint for a block, the left bar, the avatar ring and the hatch of time off.
 * Whole class names so Tailwind finds them. A fourth person wraps, as everywhere else.
 */
interface PersonStyle { dot: string; tint: string; bar: string; ring: string; hatch: string; wash: string }
const BY_CLASS: Record<ReturnType<typeof personClass>, Omit<PersonStyle, "dot">> = {
  "bg-primary": { tint: "bg-primary/15", bar: "border-l-primary", ring: "ring-primary", hatch: "[--hatch:var(--color-primary)]", wash: "bg-primary/5" },
  "bg-navy": { tint: "bg-navy/12", bar: "border-l-navy", ring: "ring-navy", hatch: "[--hatch:var(--color-navy)]", wash: "bg-navy/5" },
  "bg-positive": { tint: "bg-positive/15", bar: "border-l-positive", ring: "ring-positive", hatch: "[--hatch:var(--color-positive)]", wash: "bg-positive/5" },
}
export const personStyle = (index: number): PersonStyle => {
  const dot = personClass(index)
  return { dot, ...BY_CLASS[dot] }
}

/** The 20 percent hatch of time off, over the person's colour. */
export const HATCH_STYLE = { backgroundImage: "repeating-linear-gradient(135deg, color-mix(in oklab, var(--hatch) 22%, transparent) 0 3px, transparent 3px 8px)" } as const

/** Row lines: the hour line stronger, the half hour fainter, drawn once per column as a background. */
export const rowLines = (hourPx: number) => ({
  backgroundImage: "linear-gradient(to bottom, var(--color-border) 0 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--color-border) 45%, transparent) 0 1px, transparent 1px)",
  backgroundSize: `100% ${hourPx}px, 100% ${hourPx / 2}px`,
})
