import { describe, expect, it } from "vitest"
import { haversine, orderStops, routeLength } from "./order"

// About 1.1 km per 0.01 degree of latitude; a square of corners a (SW), b (SE), c (NE), d (NW).
const a = { id: "a", lat: 40.0, lng: -105.0 }
const b = { id: "b", lat: 40.0, lng: -104.99 }
const c = { id: "c", lat: 40.01, lng: -104.99 }
const d = { id: "d", lat: 40.01, lng: -105.0 }

describe("orderStops", () => {
  it("walks a square as a loop, never across the diagonal", () => {
    const order = orderStops([c, a, d, b], { lat: 39.999, lng: -105.001 })
    expect(order[0]).toBe("a")
    const route = order.map((id) => [a, b, c, d].find((p) => p.id === id)!)
    expect(routeLength(route)).toBeLessThanOrEqual(routeLength([a, b, c, d]) + 1e-6)
  })

  it("starts at the stop nearest the origin", () => {
    expect(orderStops([a, b, c, d], { lat: 40.02, lng: -104.98 })[0]).toBe("c")
  })

  it("2-opt removes a crossing nearest neighbour leaves behind", () => {
    // From the origin the greedy walk takes p1, p2, p3, p4 and ends with a long return leg; 2-opt shortens it.
    const pts = [
      { id: "p1", lat: 40.0, lng: -105.0 },
      { id: "p2", lat: 40.0, lng: -104.9 },
      { id: "p3", lat: 40.02, lng: -104.9 },
      { id: "p4", lat: 40.0, lng: -104.95 },
      { id: "p5", lat: 40.02, lng: -105.0 },
    ]
    const order = orderStops(pts, { lat: 40.0, lng: -105.01 })
    const length = routeLength(order.map((id) => pts.find((p) => p.id === id)!))
    // the best open route from p1 here is p1 p4 p2 p3 p5 or p1 p5 p3 p2 p4
    expect(length).toBeLessThanOrEqual(routeLength(["p1", "p4", "p2", "p3", "p5"].map((id) => pts.find((p) => p.id === id)!)) + 1e-6)
  })

  it("puts a stop with no coordinates last, in id order", () => {
    const order = orderStops([{ id: "z", lat: null, lng: null }, a, { id: "y", lat: 40, lng: null }, b], { lat: 40, lng: -105 })
    expect(order).toEqual(["a", "b", "y", "z"])
  })

  it("is deterministic whatever order the stops arrive in", () => {
    expect(orderStops([d, c, b, a])).toEqual(orderStops([a, b, c, d]))
  })

  it("handles none and one", () => {
    expect(orderStops([])).toEqual([])
    expect(orderStops([a])).toEqual(["a"])
  })
})
