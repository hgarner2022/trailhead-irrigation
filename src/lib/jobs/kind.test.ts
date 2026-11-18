import { describe, expect, it } from "vitest"
import { jobKindOf, kindOfServiceKind } from "./kind"

describe("kindOfServiceKind", () => {
  it("keeps repair and install and calls everything else other", () => {
    expect(kindOfServiceKind("repair")).toBe("repair")
    expect(kindOfServiceKind("install")).toBe("install")
    for (const k of ["turn-on", "inspection", "blowout", "consult", "rachio-install", "aeration", "other", null, undefined]) expect(kindOfServiceKind(k)).toBe("other")
  })
})

describe("jobKindOf", () => {
  it("a job with a season is a Season Pass, whatever its lines say", () => {
    expect(jobKindOf({ season: 2026, lines: [{ serviceKind: "repair" }], visitKinds: ["repair"] })).toBe("pass")
  })
  it("a repair job takes the service kind of its first live line", () => {
    expect(jobKindOf({ season: null, lines: [{ serviceKind: "repair" }], visitKinds: ["repair"] })).toBe("repair")
  })
  it("an installation job reads install", () => {
    expect(jobKindOf({ season: null, lines: [{ serviceKind: "install" }, { serviceKind: "repair" }], visitKinds: ["install"] })).toBe("install")
  })
  it("a cancelled first line is skipped for the next live one", () => {
    expect(jobKindOf({ season: null, lines: [{ serviceKind: "repair", cancelledAt: new Date() }, { serviceKind: "install" }], visitKinds: [] })).toBe("install")
  })
  it("a blowout-only job is other", () => {
    expect(jobKindOf({ season: null, lines: [{ serviceKind: "blowout" }], visitKinds: ["blowout"] })).toBe("other")
  })
  it("a line with no service falls back to the first visit's kind", () => {
    expect(jobKindOf({ season: null, lines: [{ serviceKind: null }], visitKinds: ["install", "repair"] })).toBe("install")
  })
  it("an empty job is other", () => {
    expect(jobKindOf({ season: null, lines: [], visitKinds: [] })).toBe("other")
  })
})
