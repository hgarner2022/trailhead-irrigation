import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { clampCapacity, firstWeek, isOverCapacity, octoberContext, passesInWeek } from "./october-model"

const data = snapshot as AdminData
const weeks = data.blowoutWeeks

describe("passesInWeek", () => {
  it("lists the active passes reserved for that Monday and leaves the cancelled one out", () => {
    const names = (week: string) => passesInWeek(data.passes, week).map((p) => p.firstName)
    expect(names("2027-10-04")).toEqual(["Andrea", "Katie"])
    expect(names("2027-10-11")).toEqual(["Reese", "Alyson", "Blake"])
    expect(names("2027-10-25")).toEqual(["Audrey", "Lori", "Sarah"])
    expect(names("2027-11-01")).toEqual([])
  })
})

describe("octoberContext", () => {
  it("names the season and the capacity", () => {
    expect(octoberContext(weeks)).toBe("Blowout weeks for 2027. 20 spots a week.")
  })

  it("gives a range when the weeks differ", () => {
    expect(octoberContext([weeks[0], { ...weeks[1], capacity: 25 }])).toBe("Blowout weeks for 2027. 20 to 25 spots a week.")
  })

  it("reads No blowout weeks yet with none", () => {
    expect(octoberContext([])).toBe("No blowout weeks yet.")
  })

  it("says which weeks are over capacity", () => {
    const over = { ...weeks[0], capacity: 1 }
    expect(octoberContext([over, weeks[1], weeks[2], weeks[3]])).toBe("Blowout weeks for 2027. 1 to 20 spots a week. Week of Oct 4 is over capacity.")
    expect(octoberContext([over, { ...weeks[1], capacity: 1 }])).toBe("Blowout weeks for 2027. 1 spots a week. Week of Oct 4 is over capacity. Week of Oct 11 is over capacity.")
  })
})

describe("capacity guard", () => {
  it("clamps a typed capacity to a whole number no lower than zero", () => {
    expect(clampCapacity(24)).toBe(24)
    expect(clampCapacity(-3)).toBe(0)
    expect(clampCapacity(7.9)).toBe(7)
    expect(clampCapacity(Number.NaN)).toBe(0)
    expect(clampCapacity(Number.POSITIVE_INFINITY)).toBe(0)
  })

  it("flags a week with more taken than it has room for, and not a full one", () => {
    expect(isOverCapacity({ ...weeks[0], capacity: 1 })).toBe(true)
    expect(isOverCapacity({ ...weeks[0], taken: 20 })).toBe(false)
    expect(isOverCapacity(weeks[0])).toBe(false)
  })
})

describe("firstWeek", () => {
  it("is the earliest Monday whatever the order", () => {
    expect(firstWeek(weeks)).toBe("2027-10-04")
    expect(firstWeek([...weeks].reverse())).toBe("2027-10-04")
    expect(firstWeek([])).toBeUndefined()
  })
})
