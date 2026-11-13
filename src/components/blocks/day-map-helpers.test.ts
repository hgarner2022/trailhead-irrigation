import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, Visit } from "@/lib/admin/types"
import { hasPoint, hullOf, readTokenColour, shadeOf, stopLine, stopsDescription, townBounds, truckClass, type Stop } from "./day-map-helpers"

const data = snapshot as AdminData
const friday = data.visits.filter((v) => v.startAt?.startsWith("2026-11-13")).filter(hasPoint)

describe("townBounds", () => {
  it("frames the six towns, west and south first", () => {
    expect(townBounds()).toEqual([[-105.132, 39.92], [-104.936, 40.167]])
  })
})

describe("shadeOf", () => {
  it("draws a closed patch around one stop", () => {
    const [stop] = friday
    const shade = shadeOf([stop])
    expect(shade.length).toBeGreaterThan(4)
    expect(shade[0]).toEqual(shade[shade.length - 1])
    for (const [lng, lat] of shade) {
      expect(Math.abs(lat - stop.lat)).toBeLessThanOrEqual(0.0051)
      expect(Math.abs(lng - stop.lng)).toBeLessThanOrEqual(0.0066)
    }
  })

  it("wraps every stop of a day and nothing else", () => {
    const shade = shadeOf(friday)
    const lats = shade.map((p) => p[1])
    const lngs = shade.map((p) => p[0])
    for (const s of friday) {
      expect(s.lat).toBeGreaterThan(Math.min(...lats))
      expect(s.lat).toBeLessThan(Math.max(...lats))
      expect(s.lng).toBeGreaterThan(Math.min(...lngs))
      expect(s.lng).toBeLessThan(Math.max(...lngs))
    }
    expect(Math.max(...lats) - Math.max(...friday.map((s) => s.lat))).toBeLessThanOrEqual(0.0051)
  })

  it("is empty with no stops", () => {
    expect(shadeOf([])).toEqual([])
  })
})

describe("stops in words", () => {
  it("names every stop in order for the map's accessible name", () => {
    expect(stopsDescription(friday)).toBe("Map of 4 stops: 1 David, Firestone, blowout; 2 Ricky, Firestone, blowout; 3 Joel, Lafayette, blowout; 4 Brian, Erie, blowout.")
    expect(stopsDescription([friday[0]])).toMatch(/^Map of 1 stop: 1 David/)
    expect(stopsDescription([])).toBe("Map with no stops")
    const other: Visit = { ...friday[0], kind: "other", stopOrder: undefined }
    expect(stopsDescription([other])).toBe("Map of 1 stop: 1 David, Firestone, visit.")
  })

  it("writes a stop's popup line", () => {
    expect(stopLine(friday[2])).toBe("Joel · Lafayette · blowout")
  })
})

describe("colours", () => {
  it("gives each truck a token class and wraps after three", () => {
    expect([0, 1, 2, 3].map(truckClass)).toEqual(["bg-primary", "bg-navy", "bg-positive", "bg-primary"])
  })

  it("reads a token colour from a probe and leaves nothing behind", () => {
    const container = document.createElement("div")
    document.body.append(container)
    const style = document.createElement("style")
    style.textContent = ".bg-navy { background-color: rgb(43, 53, 68); }"
    document.head.append(style)
    expect(readTokenColour(container, "bg-navy")).toBe("rgb(43, 53, 68)")
    expect(readTokenColour(container, "bg-nothing")).toBe("")
    expect(container.children).toHaveLength(0)
    style.remove()
    container.remove()
  })

  it("tells a stop with a point from one without", () => {
    const stop: Stop = friday[0]
    expect(hasPoint(stop)).toBe(true)
    expect(hasPoint({ ...stop, lat: undefined })).toBe(false)
  })
})

describe("hullOf", () => {
  it("wraps the outer points counter-clockwise and drops the inner ones", () => {
    const hull = hullOf([[0, 0], [2, 0], [2, 2], [0, 2], [1, 1], [1, 0.5]])
    expect(hull).toEqual([[0, 0], [2, 0], [2, 2], [0, 2]])
  })

  it("returns one or two points as they are and drops duplicates", () => {
    expect(hullOf([[1, 1]])).toEqual([[1, 1]])
    expect(hullOf([[1, 1], [1, 1], [2, 2]])).toEqual([[1, 1], [2, 2]])
    expect(hullOf([])).toEqual([])
  })

  it("keeps collinear ends only", () => {
    expect(hullOf([[0, 0], [1, 1], [2, 2], [3, 3]])).toEqual([[0, 0], [3, 3]])
  })
})
