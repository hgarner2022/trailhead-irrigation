import { describe, expect, it } from "vitest"
import { jobTotal, lineForVisitKind, linesForPass, lineTotal, type Line } from "./lines"
import { SEASON_PASS_VISITS, visitPrice } from "@/lib/season-pass"
import { SERVICES } from "@/lib/services"

const line = (over: Partial<Line> = {}): Line => ({ name: "Repair", quantity: 1, unitPrice: 145, taxable: false, ...over })

describe("linesForPass", () => {
  it("makes three untaxed lines for a pass with the inspection, named for the visit and priced per zone", () => {
    const lines = linesForPass(8, true)
    expect(lines.map((l) => l.name)).toEqual(["Spring turn-on", "Mid-season inspection", "Fall blowout"])
    expect(lines.map((l) => l.unitPrice)).toEqual(SEASON_PASS_VISITS.map((v) => visitPrice(v, 8)))
    expect(lines.map((l) => l.unitPrice)).toEqual([145, 145, 115])
    expect(lines.every((l) => l.taxable === false && l.quantity === 1 && !l.cancelledAt)).toBe(true)
  })

  it("makes two lines without the inspection, each carrying its visit kind and the service band for the zones", () => {
    const lines = linesForPass(12, false)
    expect(lines.map((l) => l.visitKind)).toEqual(["turn-on", "blowout"])
    expect(lines.map((l) => l.serviceKey)).toEqual(["turn-on-12", "blowout"])
    expect(lines.map((l) => l.description)).toEqual([SERVICES["turn-on-12"]!.description, SERVICES.blowout.description])
    expect(jobTotal(lines)).toBe(185 + 155)
  })
})

describe("lineForVisitKind", () => {
  it("names a repair, an installation and the pass visits in the backfill's words", () => {
    expect(lineForVisitKind("repair", 145)).toMatchObject({ name: "Repair", unitPrice: 145, quantity: 1, taxable: false, visitKind: "repair" })
    expect(lineForVisitKind("install", 4200).name).toBe("Installation")
    expect(lineForVisitKind("blowout", 95).name).toBe("Fall blowout")
    expect(lineForVisitKind("other", 50).name).toBe("Other")
  })

  it("has no service, and so no description, for a banded kind with no zones or zones no band fits", () => {
    expect(lineForVisitKind("turn-on", 145)).toMatchObject({ name: "Spring turn-on", unitPrice: 145, visitKind: "turn-on" })
    expect(lineForVisitKind("turn-on", 145).serviceKey).toBeUndefined()
    expect(lineForVisitKind("turn-on", 145).description).toBeUndefined()
    expect(lineForVisitKind("inspection", 145, 20).serviceKey).toBeUndefined()
    expect(lineForVisitKind("rachio-install", 250)).toMatchObject({ name: "Rachio controller install" })
    expect(lineForVisitKind("rachio-install", 250).serviceKey).toBeUndefined()
    expect(lineForVisitKind("rachio-install", 250, 8).serviceKey).toBe("rachio-install-8")
    expect(lineForVisitKind("turn-on", 145, 12).serviceKey).toBe("turn-on-12")
    expect(linesForPass(20, false).map((l) => l.serviceKey)).toEqual([undefined, undefined])
    expect(linesForPass(20, false).map((l) => l.description)).toEqual([undefined, undefined])
  })

  it("takes the catalogue name and description for the other kinds", () => {
    const consult = lineForVisitKind("consult", 0)
    expect(consult.name).toBe(SERVICES.consult!.name)
    expect(consult.description).toBe(SERVICES.consult!.description)
    expect(consult.serviceKey).toBe("consult")
    expect(lineForVisitKind("aeration", 120).name).toBe("Core aeration")
  })
})

describe("lineTotal and jobTotal", () => {
  it("multiplies quantity by the unit price", () => {
    expect(lineTotal(line({ quantity: 3, unitPrice: 40 }))).toBe(120)
  })

  it("counts a cancelled line as nothing", () => {
    expect(lineTotal(line({ cancelledAt: new Date("2027-05-01T00:00:00Z") }))).toBe(0)
    expect(jobTotal([line({ unitPrice: 145 }), line({ unitPrice: 95, cancelledAt: new Date() }), line({ unitPrice: 20, quantity: 2 })])).toBe(185)
  })

  it("sums nothing to zero", () => {
    expect(jobTotal([])).toBe(0)
  })
})
