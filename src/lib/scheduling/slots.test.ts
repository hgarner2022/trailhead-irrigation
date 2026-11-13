import { describe, expect, it } from "vitest"
import { openSlots, type OpenSlotsInput } from "./slots"
import type { SchedArea, SchedTruck } from "./types"

const trucks: SchedTruck[] = [
  { id: "t1", name: "Truck 1", workingDays: ["mon", "tue", "wed", "thu", "fri"], capacityByKind: { "turn-on": 8, inspection: 6, blowout: 14, repair: 4, other: 2 } },
]
const areas: SchedArea[] = [
  { id: "north", name: "Erie and Firestone", towns: ["Erie", "Firestone"] },
  { id: "lm", name: "Longmont", towns: ["Longmont"] },
]
const settings = { windows: [], bufferPercentEarly: 0, bufferPercentLate: 0 }
// 2027-05-10 is a Monday.
const base: OpenSlotsInput = { service: { kind: "blowout", slotMinutes: 30 }, town: "Erie", trucks, areas, settings, from: "2027-05-10", to: "2027-05-10", taken: [], blocks: [] }
const days = (slots: { day: string }[]) => [...new Set(slots.map((s) => s.day))]
const fullDay = Array.from({ length: 14 }, () => ({ truckId: "t1", day: "2027-05-10", kind: "blowout", town: "Erie" as const, minutes: 30 }))

describe("openSlots", () => {
  it("lays starts on a 30-minute grid from 7:00 to 17:00, the last one ending at 17:00", () => {
    const s = openSlots(base)
    expect(s[0]).toMatchObject({ day: "2027-05-10", start: "07:00", truckId: "t1" })
    expect(s.at(-1)!.start).toBe("16:30")
    expect(s).toHaveLength(20)
  })
  it("fits the service's length: a 90-minute visit's last start is 15:30", () => {
    expect(openSlots({ ...base, service: { kind: "inspection", slotMinutes: 90 } }).at(-1)!.start).toBe("15:30")
  })
  it("skips days the truck does not work", () => {
    expect(days(openSlots({ ...base, from: "2027-05-08", to: "2027-05-09" }))).toEqual([])
  })
  it("offers nothing on a full day and the next day instead", () => {
    const out = openSlots({ ...base, to: "2027-05-11", taken: fullDay })
    expect(days(out)).toEqual(["2027-05-11"])
  })
  it("keeps a town outside the day's area off that day, and marks an area day", () => {
    const taken = [{ truckId: "t1", day: "2027-05-10", kind: "blowout", town: "Longmont" as const, minutes: 30 }]
    expect(openSlots({ ...base, taken })).toEqual([])
    const same = openSlots({ ...base, taken: [{ ...taken[0]!, town: "Firestone" }] })
    expect(same.length).toBeGreaterThan(0)
    expect(same.every((x) => x.areaDay)).toBe(true)
    expect(same[0]!.start).toBe("07:30")
  })
  it("shortens the day around a block and closes it for an all-day block", () => {
    // 9:00 to 11:00 Mountain on May 10 (UTC-6 in May).
    const blocks = [{ truckId: "t1", startAt: "2027-05-10T15:00:00Z", endAt: "2027-05-10T17:00:00Z", title: "Dentist" }]
    const starts = openSlots({ ...base, blocks }).map((x) => x.start)
    expect(starts).not.toContain("09:00")
    expect(starts).not.toContain("10:30")
    expect(starts).toContain("08:30")
    expect(starts).toContain("11:00")
    const allDay = [{ truckId: "t1", startAt: "2027-05-10T06:00:00Z", endAt: "2027-05-11T06:00:00Z", title: "Out" }]
    expect(openSlots({ ...base, blocks: allDay })).toEqual([])
  })
  it("counts the visits the blocks leave: a half-blocked day holds half", () => {
    const half = [{ truckId: "t1", startAt: "2027-05-10T13:00:00Z", endAt: "2027-05-10T18:00:00Z", title: "Half" }]
    const seven = fullDay.slice(0, 7)
    expect(openSlots({ ...base, blocks: half, taken: seven })).toEqual([])
    expect(openSlots({ ...base, blocks: half, taken: seven.slice(0, 6) }).length).toBeGreaterThan(0)
  })
  it("never offers a day before the floor or outside the window", () => {
    const w = { opensOn: "2027-05-12", closesOn: "2027-05-13" }
    expect(days(openSlots({ ...base, to: "2027-05-20", window: w }))).toEqual(["2027-05-12", "2027-05-13"])
    expect(days(openSlots({ ...base, from: "2027-05-13", to: "2027-05-20", window: w }))).toEqual(["2027-05-13"])
  })
  it("subtracts the buffer: a truck holding back 25 percent offers fewer blowouts", () => {
    const taken = fullDay.slice(0, 10)
    expect(openSlots({ ...base, taken, settings: { ...settings, bufferPercentLate: 25 } })).toEqual([])
    expect(openSlots({ ...base, taken }).length).toBeGreaterThan(0)
  })
})
