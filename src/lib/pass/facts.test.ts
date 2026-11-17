import { describe, expect, it } from "vitest"
import { passInspection, passPreferences, passStatus } from "./facts"

const job = (over: Partial<Parameters<typeof passStatus>[0]> = {}) => ({ status: "active" as const, cancelledAt: null, season: 2026, ...over })

describe("passStatus", () => {
  it("is active for an active job in the season", () => {
    expect(passStatus(job(), [], "2026-06-01")).toBe("active")
  })
  it("is pending for a pending job", () => {
    expect(passStatus(job({ status: "pending" }), [], "2026-06-01")).toBe("pending")
  })
  it("is cancelled when the job has a cancelledAt or the cancelled status", () => {
    expect(passStatus(job({ cancelledAt: new Date() }), [], "2026-06-01")).toBe("cancelled")
    expect(passStatus(job({ status: "cancelled" }), [], "2026-06-01")).toBe("cancelled")
  })
  it("is cancelled before it is pending or lapsed", () => {
    expect(passStatus(job({ status: "pending", cancelledAt: new Date(), season: 2020 }), [], "2026-06-01")).toBe("cancelled")
  })
  it("is lapsed once the season is over", () => {
    expect(passStatus(job({ status: "done", season: 2025 }), [{ status: "completed", completedOn: "2025-10-01" }], "2026-06-01")).toBe("lapsed")
    expect(passStatus(job({ season: 2025 }), [], "2026-06-01")).toBe("lapsed")
  })
  it("stays active after November 1 of its own year, so the renewal offer still has an active pass to hang on", () => {
    expect(passStatus(job(), [], "2026-11-17")).toBe("active")
  })
})

describe("passInspection", () => {
  it("is true for a live line named for the inspection or priced from an inspection band", () => {
    expect(passInspection([{ name: "Mid-season inspection", serviceId: null, cancelledAt: null }])).toBe(true)
    expect(passInspection([{ name: "Other", serviceId: "inspection-6", cancelledAt: null }])).toBe(true)
  })
  it("is false when the line is cancelled or there is none", () => {
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
