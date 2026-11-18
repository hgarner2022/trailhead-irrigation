import { describe, expect, it } from "vitest"
import { DEFAULT_BILLING } from "@/lib/settings/defaults"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { parsePercent, setBilling } from "./settings-billing"
import type { Actor, SettingsState } from "./settings-model"

const actor: Actor = { who: "Hannah", at: "2026-11-17T12:00:00Z" }
const state = (): SettingsState => ({ settings: { ...(snapshot as AdminData).settings, billing: DEFAULT_BILLING }, changes: [], keys: [], services: [] })

describe("setBilling", () => {
  it("changes the due days and logs it in words", () => {
    const next = setBilling(state(), "dueDays", 30, actor)
    expect(next.settings.billing.dueDays).toBe(30)
    expect(next.changes).toMatchObject([{ field: "Bills are due in", from: "14 days", to: "30 days", who: "Hannah" }])
  })
  it("refuses days that are not whole, below zero or above 120, and a value that did not change", () => {
    const s = state()
    expect(setBilling(s, "dueDays", 1.5, actor)).toBe(s)
    expect(setBilling(s, "dueDays", -1, actor)).toBe(s)
    expect(setBilling(s, "dueDays", 121, actor)).toBe(s)
    expect(setBilling(s, "dueDays", "", actor)).toBe(s)
    expect(setBilling(s, "dueDays", 14, actor)).toBe(s)
    expect(setBilling(s, "dueDays", "0", actor).settings.billing.dueDays).toBe(0)
  })
  it("turns sales tax on and off, logging On and Off", () => {
    const on = setBilling(state(), "collectsSalesTax", true, actor)
    expect(on.settings.billing.collectsSalesTax).toBe(true)
    expect(on.changes[0]).toMatchObject({ field: "Collect Colorado sales tax", from: "Off", to: "On" })
    expect(setBilling(on, "collectsSalesTax", "yes", actor)).toBe(on)
  })
  it("takes a percent with up to two decimals between 0 and 20", () => {
    expect(setBilling(state(), "salesTaxPercent", "8.8", actor).settings.billing.salesTaxPercent).toBe(8.8)
    const s = state()
    expect(setBilling(s, "salesTaxPercent", "8.875", actor)).toBe(s)
    expect(setBilling(s, "salesTaxPercent", "21", actor)).toBe(s)
    expect(setBilling(s, "salesTaxPercent", "", actor)).toBe(s)
    expect(setBilling(s, "salesTaxPercent", "-3", actor)).toBe(s)
  })
})

describe("parsePercent", () => {
  it("reads digits and an optional percent sign", () => {
    expect(parsePercent("8.8")).toBe(8.8)
    expect(parsePercent(" 8 % ")).toBe(8)
    expect(parsePercent("08")).toBe(8)
    expect(parsePercent("abc")).toBeUndefined()
    expect(parsePercent("1,5")).toBeUndefined()
  })
})
