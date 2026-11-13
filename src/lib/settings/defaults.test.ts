import { describe, expect, it } from "vitest"
import { DEFAULT_SETTINGS, DEFAULTS_CONFIRMED, defaultSettings } from "./defaults"

describe("default settings", () => {
  it("are not confirmed until saved", () => expect(DEFAULTS_CONFIRMED).toBe(false))
  it("open each window inside its lead weeks: spring 4, July 4, fall 2, and no firm days or mode", () => {
    expect(DEFAULT_SETTINGS.windows.map((w) => [w.kind, w.leadWeeks])).toEqual([["turn-on", 4], ["inspection", 4], ["blowout", 2]])
    expect(JSON.stringify(DEFAULT_SETTINGS)).not.toMatch(/firm|mode/i)
  })
  it("hold back 25 percent early and 15 percent late", () => {
    expect([DEFAULT_SETTINGS.bufferPercentEarly, DEFAULT_SETTINGS.bufferPercentLate]).toEqual([25, 15])
  })
  it("run the fall towns north first and spring the reverse", () => {
    expect(DEFAULT_SETTINGS.fallTownOrder).toEqual(["Firestone", "Erie", "Longmont", "Broomfield", "Louisville", "Lafayette"])
    expect(DEFAULT_SETTINGS.springTownOrder).toEqual([...DEFAULT_SETTINGS.fallTownOrder].reverse())
  })
  it("put the blowout window October 1 to November 15 of the season", () => {
    expect(defaultSettings(2028).windows[2]).toMatchObject({ opensOn: "2028-10-01", closesOn: "2028-11-15" })
  })
})
