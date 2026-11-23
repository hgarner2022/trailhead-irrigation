import { describe, expect, it } from "vitest"
import { SERVICE_LIST } from "@/lib/services"
import type { ServiceItem } from "@/lib/admin/types"
import { asksZones, bandFor, defaultZones, serviceGroupId, serviceGroups, zoneCountOf } from "./new-job-model"

const groups = serviceGroups(SERVICE_LIST as readonly ServiceItem[])
const group = (id: string) => groups.find((g) => g.id === id)!

describe("one entry per service", () => {
  it("folds the zone bands into one entry each, with no band suffix in the name", () => {
    expect(SERVICE_LIST.length).toBe(16)
    expect(groups.length).toBe(11)
    expect(groups.every((g) => !/zones$/.test(g.name))).toBe(true)
    expect(group("turn-on").bands.map((b) => b.key)).toEqual(["turn-on-8", "turn-on-12", "turn-on-16"])
    expect(group("rachio-install").bands.map((b) => b.key)).toEqual(["rachio-install-8", "rachio-install-16"])
    expect(serviceGroupId("turn-on-12")).toBe("turn-on")
    expect(serviceGroupId("repair-large")).toBe("repair-large")
  })

  it("leads with Repair, Spring turn-on, Fall blowout and the inspection, then the rest alphabetically", () => {
    expect(groups.slice(0, 4).map((g) => g.id)).toEqual(["repair", "turn-on", "blowout", "inspection"])
    const rest = groups.slice(4).map((g) => g.name)
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)))
  })
})

describe("the zones box picks the band", () => {
  it.each([
    [1, "turn-on-8"],
    [8, "turn-on-8"],
    [9, "turn-on-12"],
    [12, "turn-on-12"],
    [13, "turn-on-16"],
    [16, "turn-on-16"],
  ])("a turn-on at %i zones is %s", (zones, key) => {
    expect(bandFor(group("turn-on"), zones).key).toBe(key)
  })

  it.each([
    [8, "inspection-8"],
    [9, "inspection-12"],
    [13, "inspection-16"],
  ])("an inspection at %i zones is %s", (zones, key) => {
    expect(bandFor(group("inspection"), zones).key).toBe(key)
  })

  it.each([
    [8, "rachio-install-8"],
    [9, "rachio-install-16"],
    [16, "rachio-install-16"],
  ])("a Rachio install at %i zones is %s", (zones, key) => {
    expect(bandFor(group("rachio-install"), zones).key).toBe(key)
  })

  it("a service with no bands is its own band at any zone count", () => {
    expect(bandFor(group("repair"), 12).key).toBe("repair")
    expect(bandFor(group("blowout"), 16).key).toBe("blowout")
  })

  it("asks for zones only when there are bands or a per-zone rule", () => {
    expect(asksZones(group("turn-on"))).toBe(true)
    expect(asksZones(group("blowout"))).toBe(true)
    expect(asksZones(group("rachio-install"))).toBe(true)
    expect(asksZones(group("repair"))).toBe(false)
  })

  it("starts the box at what the base price covers, and reads a typed count within 1 to 16", () => {
    expect(defaultZones(group("turn-on"))).toBe(8)
    expect(defaultZones(group("blowout"))).toBe(6)
    expect(defaultZones(group("rachio-install"))).toBe(8)
    expect(zoneCountOf("", group("blowout"))).toBe(6)
    expect(zoneCountOf("0", group("blowout"))).toBe(6)
    expect(zoneCountOf("40", group("turn-on"))).toBe(16)
    expect(zoneCountOf("10", group("turn-on"))).toBe(10)
  })
})
