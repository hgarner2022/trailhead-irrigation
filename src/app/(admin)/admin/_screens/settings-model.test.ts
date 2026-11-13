import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import {
  addArea, addTruck, createKey, removeTruck, revokeKey, secretFor, sampleFor, setJobberUser, SAMPLE_KEYS, channelWord, clip, daysWords, fillMessage, messageName, moveTownInOrder, setAreaName, setBuffer, setCapacity, setFirmDays,
  setMessage, setTruckName, setWindow, toggleAreaTown, toggleWorkingDay, type SettingsState,
} from "./settings-model"

const data = snapshot as AdminData
const state: SettingsState = { settings: data.settings, changes: [], keys: SAMPLE_KEYS }
const actor = { who: "Hannah", at: "2026-11-12T19:56:30Z" }
const last = (s: SettingsState) => s.changes[s.changes.length - 1]

describe("words", () => {
  it("writes weekdays as a run or a list", () => {
    expect(daysWords(["mon", "tue", "wed", "thu", "fri"])).toBe("Mon to Fri")
    expect(daysWords(["sat", "mon", "tue", "wed", "thu", "fri"])).toBe("Mon to Sat")
    expect(daysWords(["mon", "wed", "fri"])).toBe("Mon, Wed, Fri")
    expect(daysWords(["mon", "tue"])).toBe("Mon, Tue")
    expect(daysWords([])).toBe("None")
  })

  it("names messages and channels and clips long values", () => {
    expect(messageName("purchase-confirmation")).toBe("Purchase confirmation")
    expect(messageName("on-the-way")).toBe("On the way")
    expect(channelWord("sms")).toBe("Text")
    expect(channelWord("email")).toBe("Email")
    expect(clip("short")).toBe("short")
    expect(clip("x".repeat(80))).toBe(`${"x".repeat(59)}…`)
    expect(clip("x".repeat(60))).toBe("x".repeat(60))
  })
})

describe("trucks", () => {
  it("renames a truck and logs it", () => {
    const next = setTruckName(state, "truck-2", "Blowout truck", actor)
    expect(next.settings.trucks[1].name).toBe("Blowout truck")
    expect(last(next)).toMatchObject({ who: "Hannah", at: actor.at, field: "Truck 2 name", from: "Truck 2", to: "Blowout truck" })
    expect(next.changes).toHaveLength(1)
    expect(setTruckName(state, "truck-2", "Truck 2", actor)).toBe(state)
    expect(setTruckName(state, "nope", "X", actor)).toBe(state)
  })

  it("toggles a working day both ways", () => {
    const off = toggleWorkingDay(state, "truck-2", "sat", actor)
    expect(off.settings.trucks[1].workingDays).toEqual(["mon", "tue", "wed", "thu", "fri"])
    expect(last(off)).toMatchObject({ field: "Truck 2 working days", from: "Mon to Sat", to: "Mon to Fri" })
    const on = toggleWorkingDay(off, "truck-2", "sun", actor)
    expect(on.settings.trucks[1].workingDays).toEqual(["mon", "tue", "wed", "thu", "fri", "sun"])
    expect(last(on).to).toBe("Mon, Tue, Wed, Thu, Fri, Sun")
    expect(on.changes).toHaveLength(2)
  })

  it("sets a capacity and refuses a fraction or a negative", () => {
    const next = setCapacity(state, "truck-1", "blowout", 12, actor)
    expect(next.settings.trucks[0].capacityByKind.blowout).toBe(12)
    expect(next.settings.trucks[0].capacityByKind.repair).toBe(4)
    expect(last(next)).toMatchObject({ field: "Truck 1 blowouts per day", from: "10", to: "12" })
    expect(setCapacity(state, "truck-1", "blowout", 1.5, actor)).toBe(state)
    expect(setCapacity(state, "truck-1", "blowout", -1, actor)).toBe(state)
    expect(setCapacity(state, "truck-1", "blowout", 10, actor)).toBe(state)
  })

  it("adds a blank truck after the others", () => {
    const next = addTruck(state, actor)
    expect(next.settings.trucks).toHaveLength(3)
    expect(next.settings.trucks[2]).toMatchObject({ name: "Truck 3", workingDays: ["mon", "tue", "wed", "thu", "fri"], capacityByKind: { "turn-on": 0, inspection: 0, blowout: 0, repair: 0, other: 0 } })
    expect(last(next)).toMatchObject({ field: "Trucks", from: "2", to: "3" })
    expect(addTruck(next, actor).settings.trucks[3].name).toBe("Truck 4")
  })
})

describe("areas", () => {
  it("moves a town into an area and out of the one that had it", () => {
    const next = toggleAreaTown(state, "area-longmont", "Firestone", actor)
    expect(next.settings.areas.map((a) => a.towns)).toEqual([["Erie"], ["Longmont", "Firestone"], ["Louisville", "Lafayette", "Broomfield"]])
    expect(last(next)).toMatchObject({ field: "Longmont towns", from: "Longmont", to: "Longmont, Firestone" })
    const out = toggleAreaTown(next, "area-longmont", "Longmont", actor)
    expect(out.settings.areas[1].towns).toEqual(["Firestone"])
    const none = toggleAreaTown(out, "area-longmont", "Firestone", actor)
    expect(none.settings.areas[1].towns).toEqual([])
    expect(last(none).to).toBe("None")
  })

  it("renames an area", () => {
    const next = setAreaName(state, "area-north", "North", actor)
    expect(next.settings.areas[0].name).toBe("North")
    expect(last(next)).toMatchObject({ field: "Erie and Firestone name", to: "North" })
  })

  it("moves a town up or down the season order and stays put at the ends", () => {
    const next = moveTownInOrder(state, "fall", "Longmont", "up", actor)
    expect(next.settings.fallTownOrder).toEqual(["Firestone", "Longmont", "Erie", "Broomfield", "Louisville", "Lafayette"])
    expect(next.settings.springTownOrder).toEqual(state.settings.springTownOrder)
    expect(last(next)).toMatchObject({ field: "Fall order", to: "Firestone, Longmont, Erie, Broomfield, Louisville, Lafayette" })
    expect(moveTownInOrder(state, "fall", "Firestone", "up", actor)).toBe(state)
    expect(moveTownInOrder(state, "spring", "Firestone", "down", actor)).toBe(state)
    const spring = moveTownInOrder(state, "spring", "Lafayette", "down", actor)
    expect(spring.settings.springTownOrder.slice(0, 2)).toEqual(["Louisville", "Lafayette"])
    expect(last(spring).field).toBe("Spring order")
  })
})

describe("capacity and windows", () => {
  it("sets the buffers within 0 to 100", () => {
    const next = setBuffer(state, "early", 25, actor)
    expect(next.settings.bufferPercentEarly).toBe(25)
    expect(last(next)).toMatchObject({ field: "Buffer, first two weeks", from: "20%", to: "25%" })
    expect(setBuffer(state, "late", 101, actor)).toBe(state)
    expect(last(setBuffer(state, "late", 15, actor)).field).toBe("Buffer, after the first two weeks")
  })

  it("sets a window's dates and lead weeks, refusing a bad date", () => {
    const next = setWindow(state, "blowout", "opensOn", "2027-10-04", actor)
    expect(next.settings.windows[2].opensOn).toBe("2027-10-04")
    expect(last(next)).toMatchObject({ field: "Blowout window opens", from: "2027-10-01", to: "2027-10-04" })
    expect(setWindow(state, "blowout", "opensOn", "October 4", actor)).toBe(state)
    const lead = setWindow(state, "turn-on", "leadWeeks", 6, actor)
    expect(lead.settings.windows[0].leadWeeks).toBe(6)
    expect(last(lead)).toMatchObject({ field: "Turn-on window lead weeks", from: "4", to: "6" })
    expect(setWindow(state, "turn-on", "leadWeeks", 2.5, actor)).toBe(state)
  })

  it("sets the firm days ahead", () => {
    const next = setFirmDays(state, 5, actor)
    expect(next.settings.firmDaysAhead).toBe(5)
    expect(last(next)).toMatchObject({ field: "Firm days ahead", from: "7", to: "5" })
    expect(setFirmDays(state, -1, actor)).toBe(state)
  })
})

describe("messages", () => {
  it("switches a template on, edits its subject and body, and logs each", () => {
    const on = setMessage(state, "renewal", "enabled", true, actor)
    expect(on.settings.messages[5].enabled).toBe(true)
    expect(last(on)).toMatchObject({ field: "Renewal (email)", from: "Off", to: "On" })
    const subject = setMessage(on, "renewal", "subject", "Keep your dates", actor)
    expect(last(subject)).toMatchObject({ field: "Renewal subject", from: "Keep your spot for next season", to: "Keep your dates" })
    const body = setMessage(subject, "day-before", "body", "See you tomorrow.", actor)
    expect(body.settings.messages[2].body).toBe("See you tomorrow.")
    expect(last(body).from.length).toBeLessThanOrEqual(60)
    expect(last(body).to).toBe("See you tomorrow.")
    expect(body.changes).toHaveLength(3)
    expect(setMessage(state, "nope", "enabled", true, actor)).toBe(state)
  })

  it("fills a template from the sample and leaves unknown placeholders", () => {
    const sample = { firstName: "Andrea", visit: "turn-on", date: "May 3", truck: "Truck 1", nextVisit: "inspection" }
    expect(fillMessage("Hi {firstName}, your {visit} is booked for {date} on {truck}. Next: {nextVisit}. {other}", sample)).toBe(
      "Hi Andrea, your turn-on is booked for May 3 on Truck 1. Next: inspection. {other}",
    )
    expect(fillMessage(data.settings.messages[1].body, sample)).not.toMatch(/\{/)
  })
})

describe("the log", () => {
  it("gives every change its own id and keeps the earlier ones", () => {
    let s = state
    s = setFirmDays(s, 5, actor)
    s = setFirmDays(s, 6, { who: "Ryan", at: "2026-11-12T20:00:00Z" })
    expect(s.changes.map((c) => [c.who, c.from, c.to])).toEqual([["Hannah", "7", "5"], ["Ryan", "5", "6"]])
    expect(new Set(s.changes.map((c) => c.id)).size).toBe(2)
  })
})

describe("more trucks, areas and keys", () => {
  it("sets the Jobber user and removes a truck, logging both", () => {
    const user = setJobberUser(state, "truck-1", "jobber-user-9", actor)
    expect(user.settings.trucks[0].jobberUserId).toBe("jobber-user-9")
    expect(last(user)).toMatchObject({ field: "Truck 1 Jobber user", from: "jobber-user-1", to: "jobber-user-9" })
    const gone = removeTruck(state, "truck-2", actor)
    expect(gone.settings.trucks.map((t) => t.id)).toEqual(["truck-1"])
    expect(last(gone).field).toBe("Trucks")
    expect(removeTruck(state, "nope", actor)).toBe(state)
  })

  it("adds an empty area", () => {
    const next = addArea(state, actor)
    expect(next.settings.areas).toHaveLength(4)
    expect(next.settings.areas[3]).toMatchObject({ name: "Area 4", towns: [] })
  })

  it("creates a key once and revokes it", () => {
    const made = createKey(state, "  Billing agent ", ["write-passes", "read"], actor)!
    expect(made.secret).toMatch(/^th_live_[a-z0-9]{28}$/)
    expect(made.secret).toBe(secretFor("Billing agent", actor.at))
    const key = made.state.keys[3]
    expect(key).toMatchObject({ name: "Billing agent", scopes: ["read", "write-passes"], lastUsedAt: null })
    expect(key.prefix).toBe(`${made.secret.slice(0, 12)}…`)
    expect(JSON.stringify(made.state)).not.toContain(made.secret)
    expect(last(made.state)).toMatchObject({ field: "API keys", to: "4 (Billing agent created)" })
    expect(createKey(state, "  ", ["read"], actor)).toBeNull()
    expect(createKey(state, "x", [], actor)).toBeNull()
    const revoked = revokeKey(made.state, key.id, actor)
    expect(revoked.keys).toHaveLength(3)
    expect(last(revoked).to).toBe("3 (Billing agent revoked)")
    expect(revokeKey(state, "nope", actor)).toBe(state)
  })
})

describe("sampleFor", () => {
  it("reads the first pass and the first scheduled visit", () => {
    expect(sampleFor(data)).toEqual({ firstName: "Andrea", visit: "inspection", date: "April 8", truck: "Truck 1", nextVisit: "inspection" })
  })
  it("falls back when there is nothing", () => {
    expect(sampleFor({ ...data, passes: [], visits: [] })).toMatchObject({ firstName: "Alex", visit: "visit", truck: "Truck 1" })
  })
})
