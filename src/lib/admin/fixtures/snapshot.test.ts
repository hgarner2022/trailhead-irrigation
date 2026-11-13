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
  // Twelve sold passes and one unpaid attempt (pending), whose customer has no pass yet.
  expect(d.passes.every((p) => d.clients.some((c) => c.id === p.clientId && (c.hasPass || p.status === "pending")))).toBe(true)
  expect(d.passes.filter((p) => p.status === "pending")).toHaveLength(1)
  expect(d.clients.every((c) => TOWNS.includes(c.town))).toBe(true)
  expect(d.passes).toHaveLength(13)
  // Five passes took the July add-on; seven bought the two visits, and the pending attempt holds two.
  expect(d.passes.filter((p) => p.visits.length === 3)).toHaveLength(5)
  expect(d.passes.filter((p) => p.visits.length === 2)).toHaveLength(8)
  expect(d.passes.every((p) => ["May,July,October", "May,October"].includes(p.visits.map((v) => v.window).join(",")))).toBe(true)
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
  for (const pass of d.passes.filter((p) => p.status !== "pending")) {
    const client = d.clients.find((c) => c.id === pass.clientId)
    expect(pass.consent?.termsAcceptedAt, pass.id).toBeTruthy()
    expect(pass.consent?.termsVersion).toBe("2026-11")
    expect(pass.consent?.source).toBe("checkout")
    expect(pass.consent?.marketingOptIn).toBe((pass.consent?.marketingChannels.length ?? 0) > 0)
    expect(client?.consent).toEqual(pass.consent)
  }
  expect(d.passes.every((p) => p.lastName), "every pass names its customer in full").toBe(true)
  expect(d.clients.every((c) => c.lastName), "every customer has a last name").toBe(true)
  expect(d.passes.some((p) => p.consent?.marketingOptIn)).toBe(true)
  expect(d.passes.some((p) => !p.consent?.marketingOptIn)).toBe(true)
  expect(JSON.stringify(d)).not.toMatch(/@|\(\d{3}\) ?\d{3}-\d{4}|\d{3}-\d{3}-\d{4}/)   // no emails, no phones
  expect(d.monthTotals.some((m) => m.year === 2026 && m.month === 10)).toBe(true)
})

const TOWN_CENTRES: Record<string, [number, number]> = {
  Erie: [40.05, -105.05],
  Longmont: [40.167, -105.102],
  Louisville: [39.978, -105.132],
  Lafayette: [39.994, -105.09],
  Firestone: [40.113, -104.936],
  Broomfield: [39.92, -105.087],
}
const denverDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso))

it("settings carry two trucks, three areas, three 2027 windows, the orders, the buffers and six messages", () => {
  const { settings: s } = snapshot as AdminData
  expect(s.trucks.map((t) => t.name)).toEqual(["Truck 1", "Truck 2"])
  expect(s.trucks[0].workingDays).toEqual(["mon", "tue", "wed", "thu", "fri"])
  expect(s.trucks[1].workingDays).toEqual(["mon", "tue", "wed", "thu", "fri", "sat"])
  for (const truck of s.trucks) {
    expect(Object.keys(truck.capacityByKind).sort()).toEqual(["blowout", "inspection", "other", "repair", "turn-on"])
    expect(Object.values(truck.capacityByKind).every((n) => Number.isInteger(n) && n > 0)).toBe(true)
  }
  expect(s.areas.map((a) => a.towns)).toEqual([["Erie", "Firestone"], ["Longmont"], ["Louisville", "Lafayette", "Broomfield"]])
  expect(s.areas.flatMap((a) => a.towns).sort()).toEqual([...TOWNS].sort())
  expect(s.windows).toEqual([
    { kind: "turn-on", opensOn: "2027-04-26", closesOn: "2027-05-31", leadWeeks: 4 },
    { kind: "inspection", opensOn: "2027-07-01", closesOn: "2027-07-31", leadWeeks: 4 },
    { kind: "blowout", opensOn: "2027-10-01", closesOn: "2027-10-31", leadWeeks: 4 },
  ])
  expect(s.bufferPercentEarly).toBe(20)
  expect(s.bufferPercentLate).toBe(12)
  expect(s.fallTownOrder).toEqual(["Firestone", "Erie", "Longmont", "Broomfield", "Louisville", "Lafayette"])
  expect(s.springTownOrder).toEqual([...s.fallTownOrder].reverse())
  expect(s.messages.map((m) => m.key)).toEqual(["purchase-confirmation", "date-set", "day-before", "on-the-way", "receipt", "renewal"])
  for (const m of s.messages) {
    expect(["email", "sms"]).toContain(m.channel)
    expect(m.body.length).toBeGreaterThan(20)
    expect(m.body).not.toMatch(/—|Yes!/)
    if (m.channel === "email") expect(m.subject).toBeTruthy()
    else expect(m.subject).toBeUndefined()
  }
  expect(s.messages.some((m) => !m.enabled)).toBe(true)
})

it("four settings changes, each with who, when, field, from and to", () => {
  const d = snapshot as AdminData
  expect(d.settingsChanges).toHaveLength(4)
  for (const c of d.settingsChanges) {
    expect(c.id).toBeTruthy()
    expect(c.at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(c.who).toBeTruthy()
    expect(c.field).toBeTruthy()
    expect(c.from).not.toBe(c.to)
  }
})

it("every dated 2026 visit rides a truck with a stop order and a point near its town", () => {
  const d = snapshot as AdminData
  const truckIds = d.settings.trucks.map((t) => t.id)
  const dated = d.visits.filter((v) => v.startAt?.startsWith("2026") && v.status !== "cancelled")
  expect(dated.length).toBeGreaterThan(400)
  const perDay = new Map<string, number[]>()
  for (const v of dated) {
    expect(truckIds, v.id).toContain(v.truckId)
    const [lat, lng] = TOWN_CENTRES[v.town]
    expect(Math.abs((v.lat ?? 99) - lat), v.id).toBeLessThan(0.02)
    expect(Math.abs((v.lng ?? 99) - lng), v.id).toBeLessThan(0.02)
    const key = `${v.truckId}|${denverDay(v.startAt!)}`
    perDay.set(key, [...(perDay.get(key) ?? []), v.stopOrder!])
  }
  for (const [key, orders] of perDay) expect([...orders].sort((a, b) => a - b), key).toEqual(orders.map((_, i) => i + 1))
  const october = dated.filter((v) => denverDay(v.startAt!).startsWith("2026-10"))
  expect(new Set(october.map((v) => v.truckId)).size).toBe(2)
  const notOctober = dated.filter((v) => !denverDay(v.startAt!).startsWith("2026-10"))
  expect(notOctober.every((v) => v.truckId === truckIds[0])).toBe(true)
  expect(d.visits.filter((v) => !v.startAt?.startsWith("2026")).every((v) => v.truckId === undefined)).toBe(true)
})

it("two November visits carry a Jobber exception and nothing waits for approval", () => {
  const d = snapshot as AdminData
  expect(d.visits.some((v) => "proposed" in v || "firm" in v)).toBe(false)
  const exceptions = d.visits.filter((v) => v.exception)
  expect(exceptions).toHaveLength(2)
  for (const v of exceptions) {
    expect(v.exception?.kind).toBe("moved-in-jobber")
    expect(v.exception?.note).toBeTruthy()
    expect(denverDay(v.startAt!).startsWith("2026-11")).toBe(true)
  }
  expect(d.passes.filter((p) => p.needsCustomerHome)).toHaveLength(2)
})
