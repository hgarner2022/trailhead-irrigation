/**
 * The pure parts of DayMap: the bounds of the six towns, the shaded area
 * around a truck's stops, the stop description for the map's accessible
 * name, and how a truck's colour is read from the tokens. Kept out of the
 * map file so they run in jsdom, where the map itself cannot.
 */
import type { Town, Visit } from "@/lib/admin/types"
import { KIND_WORDS } from "@/lib/admin/format"

export type Point = readonly [lng: number, lat: number]

const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

/** The convex hull of the points, counter-clockwise, first point not repeated; fewer than three distinct points come back as they are. */
export function hullOf(points: readonly Point[]): Point[] {
  const sorted = [...new Map(points.map((p) => [`${p[0]},${p[1]}`, p])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (sorted.length < 3) return sorted
  const half = (input: Point[]) => {
    const out: Point[] = []
    for (const p of input) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop()
      out.push(p)
    }
    out.pop()
    return out
  }
  return [...half(sorted), ...half([...sorted].reverse())]
}

/** The six towns' centres, the frame the map opens on. */
export const TOWN_CENTRES: Record<Town, Point> = {
  Erie: [-105.05, 40.05],
  Longmont: [-105.102, 40.167],
  Louisville: [-105.132, 39.978],
  Lafayette: [-105.09, 39.994],
  Firestone: [-104.936, 40.113],
  Broomfield: [-105.087, 39.92],
}

/** [[west, south], [east, north]] around every town centre. */
export function townBounds(): [[number, number], [number, number]] {
  const points = Object.values(TOWN_CENTRES)
  const lngs = points.map((p) => p[0])
  const lats = points.map((p) => p[1])
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]]
}

/** A visit with a point. */
export type Stop = Visit & { lat: number; lng: number }
export const hasPoint = (v: Visit): v is Stop => typeof v.lat === "number" && typeof v.lng === "number"

/** About half a kilometre in degrees at this latitude, the ring drawn around each stop before the hull. */
const RING = 0.005
const RING_POINTS = 8

/**
 * The area shaded around a truck's stops: the convex hull of a small ring
 * around each point, so one or two stops still get a patch rather than a
 * line. Closed (the first point repeated) for GeoJSON; empty with no stops.
 */
export function shadeOf(stops: readonly Stop[]): Point[] {
  if (stops.length === 0) return []
  const ringed = stops.flatMap((s) =>
    Array.from({ length: RING_POINTS }, (_, i): Point => {
      const angle = (i / RING_POINTS) * 2 * Math.PI
      // Longitude degrees are shorter than latitude degrees at 40° north; the cosine keeps the ring round.
      return [s.lng + (RING * Math.cos(angle)) / Math.cos((s.lat * Math.PI) / 180), s.lat + RING * Math.sin(angle)]
    }),
  )
  const hull = hullOf(ringed)
  return [...hull, hull[0]]
}

/** "Map of 4 stops: 1 Percy, Erie, blowout; 2 Alicia, Firestone, blowout." The map's accessible name. */
export function stopsDescription(stops: readonly Visit[]): string {
  if (stops.length === 0) return "Map with no stops"
  const list = stops.map((s, i) => `${s.stopOrder ?? i + 1} ${s.clientName}, ${s.town}, ${KIND_WORDS[s.kind]}`).join("; ")
  return `Map of ${stops.length} stop${stops.length === 1 ? "" : "s"}: ${list}.`
}

/** One line for a stop's popup: "Percy · Erie · blowout". */
export function stopLine(stop: Visit): string {
  return `${stop.clientName} · ${stop.town} · ${KIND_WORDS[stop.kind]}`
}

/** The background class each truck's markers and shade take, by the truck's position in the list; a fourth truck wraps. */
export const TRUCK_CLASSES = ["bg-primary", "bg-navy", "bg-positive"] as const
export const truckClass = (index: number): (typeof TRUCK_CLASSES)[number] => TRUCK_CLASSES[index % TRUCK_CLASSES.length]

/**
 * The colour a token class resolves to, read from a probe element so the map
 * (which needs a colour string, not a class) never carries a hex of its own:
 * the tokens stay in globals.css and the gate stays clean. Empty when the
 * stylesheet is not loaded, as in jsdom.
 */
export function readTokenColour(container: HTMLElement, className: string): string {
  const probe = container.ownerDocument.createElement("span")
  probe.className = className
  probe.style.position = "absolute"
  container.append(probe)
  const colour = getComputedStyle(probe).backgroundColor
  probe.remove()
  return colour === "rgba(0, 0, 0, 0)" ? "" : colour
}
