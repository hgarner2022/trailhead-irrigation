import { describe, expect, it } from "vitest"
import { passInspection, passPreferences, passStatus } from "./facts"

const job = (over: Partial<Parameters<typeof passStatus>[0]> = {}) => ({ soldOn: "2026-05-01" as string | null, cancelledAt: null as Date | null, season: 2026 as number | null, ...over })

describe("passStatus", () => {
  it("is active for a sold job in the season", () => {
    expect(passStatus(job(), "2026-06-01")).toBe("active")
  })
  it("is pending while the job has no sold day", () => {
    expect(passStatus(job({ soldOn: null }), "2026-06-01")).toBe("pending")
  })
  it("is canceled when the job has a cancelledAt, sold or not", () => {
    expect(passStatus(job({ cancelledAt: new Date() }), "2026-06-01")).toBe("cancelled")
    expect(passStatus(job({ soldOn: null, cancelledAt: new Date() }), "2026-06-01")).toBe("cancelled")
  })
  it("is canceled before it is pending or lapsed", () => {
    expect(passStatus(job({ soldOn: null, cancelledAt: new Date(), season: 2020 }), "2026-06-01")).toBe("cancelled")
  })
  it("is lapsed once the season is over", () => {
    expect(passStatus(job({ season: 2025 }), "2026-06-01")).toBe("lapsed")
  })
  it("stays active after November 1 of its own year, so the renewal offer still has an active pass to hang on", () => {
    expect(passStatus(job(), "2026-11-17")).toBe("active")
  })
})

describe("passInspection", () => {
  it("is true for a live line named for the inspection or priced from an inspection band", () => {
    expect(passInspection([{ name: "Mid-season inspection", serviceId: null, cancelledAt: null }])).toBe(true)
    expect(passInspection([{ name: "Other", serviceId: "inspection-6", cancelledAt: null }])).toBe(true)
  })
  it("is false when the line is canceled or there is none", () => {
    expect(passInspection([{ name: "Mid-season inspection", serviceId: null, cancelledAt: new Date() }])).toBe(false)
    expect(passInspection([{ name: "Spring turn-on", serviceId: "turn-on-6", cancelledAt: null }])).toBe(false)
    expect(passInspection([])).toBe(false)
  })
})

describe("passPreferences", () => {
  it("reads the turn-on and blowout visits", () => {
    expect(passPreferences([{ kind: "turn-on", preference: "earlier" }, { kind: "blowout", preference: "later" }, { kind: "inspection", preference: "earlier" }])).toEqual({ turnOnPreference: "earlier", blowoutPreference: "later" })
  })
  it("defaults to recommended", () => {
    expect(passPreferences([{ kind: "turn-on", preference: null }])).toEqual({ turnOnPreference: "recommended", blowoutPreference: "recommended" })
  })
})
