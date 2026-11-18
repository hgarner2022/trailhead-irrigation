import type { AreaGroup, Town } from "@/lib/admin/types"
import { areaOf } from "@/lib/admin/calendar"

// One colour per area, by its position in the list; a fourth area wraps. The Schedule's week grid (the bar on each block and
// its legend) and Home's Today rows (the bar on the left of each row) read the same two lists, so a town is the same colour on
// every screen.
export const AREA_BORDERS = ["border-l-primary", "border-l-navy", "border-l-positive"] as const
export const AREA_SWATCHES = ["bg-primary", "bg-navy", "bg-positive"] as const

/** The area's place in the colour lists, or -1 when no area has the town. */
export function areaIndexOf(town: Town, areas: AreaGroup[]): number {
  const area = areaOf(town, areas)
  return area ? areas.indexOf(area) : -1
}

/** The left-border class for an area position; -1 gets the quiet muted bar. */
export const areaBorder = (index: number): string => (index === -1 ? "border-l-muted" : AREA_BORDERS[index % AREA_BORDERS.length])
export const areaSwatch = (index: number): string => AREA_SWATCHES[index % AREA_SWATCHES.length]
