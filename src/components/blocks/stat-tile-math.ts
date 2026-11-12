// Path maths for the StatTile sparkline: a 100 by 24 viewBox, the last
// MAX_POINTS values spread evenly from x 0 to 100, y scaled to a shared max so
// the current and previous lines compare. One point draws as a flat line and
// no points draws nothing, so the polyline never sees NaN.

export const MAX_POINTS = 24
const TOP = 1
const BOTTOM = 23

/** The y for a value against the shared max; the baseline when there is no max. */
const yFor = (value: number, max: number) => (max > 0 ? BOTTOM - ((BOTTOM - TOP) * value) / max : BOTTOM)

/** SVG polyline points, as "x,y x,y"; "" for an empty series. */
export function pointsFor(values: number[], max: number): string {
  const tail = values.slice(-MAX_POINTS)
  if (tail.length === 0) return ""
  if (tail.length === 1) {
    const y = yFor(tail[0], max)
    return `0,${y} 100,${y}`
  }
  const step = 100 / (tail.length - 1)
  return tail.map((v, i) => `${Math.round(i * step * 100) / 100},${Math.round(yFor(v, max) * 100) / 100}`).join(" ")
}

/** The highest value across both series, so they share one scale. */
export function sparkMax(current: number[], previous?: number[]): number {
  return Math.max(0, ...current.slice(-MAX_POINTS), ...(previous ?? []).slice(-MAX_POINTS))
}
