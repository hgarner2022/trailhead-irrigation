/**
 * A truck-day's stop order, pure: nearest neighbour from the first stop, then 2-opt passes until no reversal shortens the
 * route. Distances are haversine kilometres. A stop with no coordinates goes last, in id order. The same points give the
 * same order.
 */
export interface StopPoint {
  id: string
  lat: number | null
  lng: number | null
}

export interface LatLng {
  lat: number
  lng: number
}

const RAD = Math.PI / 180

/** Great-circle distance in kilometres. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * RAD
  const dLng = (b.lng - a.lng) * RAD
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** The length of a route through the points, in order, kilometres. */
export function routeLength(points: LatLng[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += haversine(points[i - 1]!, points[i]!)
  return total
}

/** The ids in visiting order. `origin` is where the truck starts (the first area's town centre); without one the first stop is the lowest id. */
export function orderStops(stops: StopPoint[], origin?: LatLng): string[] {
  const located = stops.filter((s): s is StopPoint & LatLng => s.lat !== null && s.lng !== null).sort((a, b) => a.id.localeCompare(b.id))
  const unlocated = stops.filter((s) => s.lat === null || s.lng === null).sort((a, b) => a.id.localeCompare(b.id))
  const left = [...located]
  const route: (StopPoint & LatLng)[] = []
  let here: LatLng | undefined = origin
  while (left.length) {
    let best = 0
    if (here) {
      let bestDistance = Infinity
      left.forEach((s, i) => {
        const d = haversine(here!, s)
        if (d < bestDistance - 1e-9) { bestDistance = d; best = i }
      })
    }
    const [next] = left.splice(best, 1)
    route.push(next!)
    here = next
  }
  // 2-opt on the open route with its first stop kept in place: reverse a stretch when that shortens the route.
  const dist = (i: number, j: number) => haversine(route[i]!, route[j]!)
  let improved = true
  while (improved) {
    improved = false
    for (let i = 1; i < route.length - 1; i++) {
      for (let j = i + 1; j < route.length; j++) {
        const before = dist(i - 1, i) + (j + 1 < route.length ? dist(j, j + 1) : 0)
        const after = dist(i - 1, j) + (j + 1 < route.length ? dist(i, j + 1) : 0)
        if (after < before - 1e-9) {
          route.splice(i, j - i + 1, ...route.slice(i, j + 1).reverse())
          improved = true
        }
      }
    }
  }
  return [...route.map((s) => s.id), ...unlocated.map((s) => s.id)]
}
