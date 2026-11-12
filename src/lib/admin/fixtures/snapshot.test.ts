import { it, expect } from "vitest"
import snapshot from "./snapshot.json"
import type { AdminData } from "../types"

const TOWNS = ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"]

it("snapshot matches the AdminData shape and has data in every collection", () => {
  const d = snapshot as AdminData
  for (const key of ["clients", "visits", "quotes", "invoices", "passes", "blowoutWeeks", "monthTotals", "attention"] as const) {
    expect(d[key].length, key).toBeGreaterThan(0)
  }
  expect(d.visits.every((v) => d.clients.some((c) => c.id === v.clientId))).toBe(true)
  expect(d.passes.every((p) => d.clients.some((c) => c.id === p.clientId && c.hasPass))).toBe(true)
  expect(d.clients.every((c) => TOWNS.includes(c.town))).toBe(true)
  expect(d.passes).toHaveLength(12)
  expect(d.passes.every((p) => p.visits.length === 3)).toBe(true)
  expect(JSON.stringify(d)).not.toMatch(/@|\(\d{3}\) ?\d{3}-\d{4}|\d{3}-\d{3}-\d{4}/)   // no emails, no phones
  expect(d.monthTotals.some((m) => m.year === 2026 && m.month === 10)).toBe(true)
})
