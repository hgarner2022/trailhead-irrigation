import { describe, expect, it } from "vitest"
import { matchPeople, peopleSummary } from "./people-menu-model"

const team = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `${["Ryan", "Hannah", "Sam", "Ola", "Wes", "Cora", "Ivy", "Gus", "Mina", "Tom", "Ana", "Dev", "Eli", "Fay", "Jo"][i]} Garner` }))

describe("peopleSummary", () => {
  it("says Everyone when all are shown, however many", () => {
    expect(peopleSummary(team(2), [])).toBe("Everyone")
    expect(peopleSummary(team(15), [])).toBe("Everyone")
  })
  it("names one or two people shown of a larger team, by first name", () => {
    expect(peopleSummary(team(2), ["p1"])).toBe("Ryan")
    expect(peopleSummary(team(5), ["p2", "p3", "p4"])).toBe("Ryan, Hannah")
  })
  it("counts three or more of a larger team", () => {
    expect(peopleSummary(team(5), ["p4"])).toBe("4 of 5")
    expect(peopleSummary(team(12), team(12).slice(3).map((p) => p.id))).toBe("Ryan, Hannah, Sam".split(", ").length + " of 12")
  })
})

describe("matchPeople", () => {
  it("finds a name anywhere in it, ignoring case, and returns everyone for no query", () => {
    expect(matchPeople(team(15), "ha").map((p) => p.name)).toEqual(["Hannah Garner"])
    expect(matchPeople(team(3), "  ").map((p) => p.id)).toEqual(["p0", "p1", "p2"])
  })
})
