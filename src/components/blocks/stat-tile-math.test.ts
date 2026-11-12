import { describe, it, expect } from "vitest"
import { pointsFor, sparkMax } from "./stat-tile-math"

describe("pointsFor", () => {
  it("returns no points for an empty array", () => {
    expect(pointsFor([], 10)).toBe("")
  })

  it("draws a single value as a flat line across the full width", () => {
    const points = pointsFor([5], 10)
    expect(points).not.toContain("NaN")
    const pairs = points.split(" ").map((p) => p.split(",").map(Number))
    expect(pairs).toHaveLength(2)
    expect(pairs[0][0]).toBe(0)
    expect(pairs[1][0]).toBe(100)
    expect(pairs[0][1]).toBe(pairs[1][1])
  })

  it("spreads points evenly from 0 to 100 and scales the highest value to the top", () => {
    const pairs = pointsFor([0, 5, 10], 10).split(" ").map((p) => p.split(",").map(Number))
    expect(pairs.map((p) => p[0])).toEqual([0, 50, 100])
    expect(pairs[0][1]).toBeGreaterThan(pairs[2][1])
    expect(pairs[2][1]).toBeGreaterThanOrEqual(1)
    expect(pairs[0][1]).toBeLessThanOrEqual(23)
  })

  it("keeps every point on the baseline when the max is zero", () => {
    const pairs = pointsFor([0, 0], 0).split(" ").map((p) => p.split(",").map(Number))
    expect(pairs.map((p) => p[1])).toEqual([23, 23])
    expect(pointsFor([0, 0], 0)).not.toContain("NaN")
  })

  it("keeps only the last 24 points", () => {
    const values = Array.from({ length: 30 }, (_, i) => i)
    const pairs = pointsFor(values, 29).split(" ")
    expect(pairs).toHaveLength(24)
  })
})

describe("sparkMax", () => {
  it("is the highest value across both series", () => {
    expect(sparkMax([1, 2, 3], [4, 1])).toBe(4)
  })

  it("is zero with nothing to compare", () => {
    expect(sparkMax([], undefined)).toBe(0)
  })
})
