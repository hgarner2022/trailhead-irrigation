// Path maths for the StatTile sparkline: a 100 by 24 viewBox, the last
// MAX_POINTS values stepped evenly from x 0, y scaled to a shared max so the
// current and previous lines compare. The step comes from the longer series
// (`span`), so a partial year ends short of the right edge instead of being
// stretched to it and index n of both lines shares one x. One point draws as
// a flat line and no points draws nothing, so the polyline never sees NaN.

export const MAX_POINTS = 24
const TOP = 1
const BOTTOM = 23

/** The y for a value against the shared max; the baseline when there is no max. */
const yFor = (value: number, max: number) => (max > 0 ? BOTTOM - ((BOTTOM - TOP) * value) / max : BOTTOM)

/** SVG polyline points, as "x,y x,y"; "" for an empty series. `span` is the longer series' length, defaulting to this one's. */
export function pointsFor(values: number[], max: number, span = values.length): string {
  const tail = values.slice(-MAX_POINTS)
  if (tail.length === 0) return ""
  if (tail.length === 1) {
    const y = yFor(tail[0], max)
    return `0,${y} 100,${y}`
  }
  const step = 100 / (Math.max(2, Math.min(MAX_POINTS, span), tail.length) - 1)
  return tail.map((v, i) => `${Math.round(i * step * 100) / 100},${Math.round(yFor(v, max) * 100) / 100}`).join(" ")
}

/** The longer series' length, so both lines share one step. */
export function sparkSpan(current: number[], previous?: number[]): number {
  return Math.min(MAX_POINTS, Math.max(current.length, previous?.length ?? 0))
}

/** The highest value across both series, so they share one scale. */
export function sparkMax(current: number[], previous?: number[]): number {
  return Math.max(0, ...current.slice(-MAX_POINTS), ...(previous ?? []).slice(-MAX_POINTS))
}
