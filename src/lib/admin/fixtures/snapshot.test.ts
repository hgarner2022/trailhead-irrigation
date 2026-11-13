import { it, expect } from "vitest"
import snapshot from "./snapshot.json"
import type { AdminData } from "../types"

const TOWNS = ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"]
const PREFERENCES = ["earlier", "recommended", "later"]

it("snapshot matches the AdminData shape and has data in every collection", () => {
  const d = snapshot as AdminData
  for (const key of ["clients", "visits", "quotes", "invoices", "passes", "monthTotals", "attention"] as const) {
    expect(d[key].length, key).toBeGreaterThan(0)
  }
  expect(d.visits.every((v) => d.clients.some((c) => c.id === v.clientId))).toBe(true)
  expect(d.passes.every((p) => d.clients.some((c) => c.id === p.clientId && c.hasPass))).toBe(true)
  expect(d.clients.every((c) => TOWNS.includes(c.town))).toBe(true)
  expect(d.passes).toHaveLength(12)
  expect(d.passes.every((p) => p.visits.length === 3)).toBe(true)
  expect(d.passes.every((p) => p.visits.map((v) => v.window).join(",") === "May,July,October")).toBe(true)
  expect("blowoutWeeks" in d).toBe(false)
  expect(d.passes.some((p) => "blowoutWeek" in p)).toBe(false)
})

it("every pass carries a timing preference for both visits, spread across the three values", () => {
  const d = snapshot as AdminData
  for (const key of ["turnOnPreference", "blowoutPreference"] as const) {
    expect(d.passes.every((p) => PREFERENCES.includes(p[key]))).toBe(true)
    expect(new Set(d.passes.map((p) => p[key])).size, key).toBe(3)
  }
})

it("every pass holder has a consent with the terms accepted, and marketing is split", () => {
  const d = snapshot as AdminData
  for (const pass of d.passes) {
    const client = d.clients.find((c) => c.id === pass.clientId)
    expect(pass.consent?.termsAcceptedAt, pass.id).toBeTruthy()
    expect(pass.consent?.termsVersion).toBe("2026-11")
    expect(pass.consent?.source).toBe("checkout")
    expect(pass.consent?.marketingOptIn).toBe((pass.consent?.marketingChannels.length ?? 0) > 0)
    expect(client?.consent).toEqual(pass.consent)
  }
  expect(d.passes.some((p) => p.consent?.marketingOptIn)).toBe(true)
  expect(d.passes.some((p) => !p.consent?.marketingOptIn)).toBe(true)
  expect(JSON.stringify(d)).not.toMatch(/@|\(\d{3}\) ?\d{3}-\d{4}|\d{3}-\d{3}-\d{4}/)   // no emails, no phones
  expect(d.monthTotals.some((m) => m.year === 2026 && m.month === 10)).toBe(true)
})
