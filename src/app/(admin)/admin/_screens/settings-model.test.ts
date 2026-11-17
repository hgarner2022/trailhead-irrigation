import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, ServiceItem } from "@/lib/admin/types"
import { SERVICE_LIST } from "@/lib/services"
import {
  setServiceField, addArea, createKey, revokeKey, secretFor, sampleFor, SAMPLE_KEYS, channelWord, clip, daysWords, fillMessage, messageName, moveTownInOrder, setAreaName, setBuffer,
  setMessage, setWindow, toggleAreaTown, type SettingsState,
} from "./settings-model"
import { addPerson, removePerson, setCapacity, setPersonName, setPersonRole, setPersonText, setSeason, toggleWorkingDay } from "./settings-people"

const data = snapshot as AdminData
const state: SettingsState = { settings: data.settings, changes: [], keys: SAMPLE_KEYS, services: SERVICE_LIST as ServiceItem[] }
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

describe("people", () => {
  it("renames a person and logs it", () => {
    const next = setPersonName(state, "person_truck-2", "Blowout truck", actor)
    expect(next.settings.people[1].name).toBe("Blowout truck")
    expect(last(next)).toMatchObject({ who: "Hannah", at: actor.at, field: "Tech Two name", from: "Tech Two", to: "Blowout truck" })
    expect(next.changes).toHaveLength(1)
    expect(setPersonName(state, "person_truck-2", "Tech Two", actor)).toBe(state)
    expect(setPersonName(state, "nope", "X", actor)).toBe(state)
  })

  it("toggles a working day both ways", () => {
    const off = toggleWorkingDay(state, "person_truck-2", "sat", actor)
    expect(off.settings.people[1].workingDays).toEqual(["mon", "tue", "wed", "thu", "fri"])
    expect(last(off)).toMatchObject({ field: "Tech Two working days", from: "Mon to Sat", to: "Mon to Fri" })
    const on = toggleWorkingDay(off, "person_truck-2", "sun", actor)
    expect(on.settings.people[1].workingDays).toEqual(["mon", "tue", "wed", "thu", "fri", "sun"])
    expect(last(on).to).toBe("Mon, Tue, Wed, Thu, Fri, Sun")
    expect(on.changes).toHaveLength(2)
  })

  it("keeps the last working day on", () => {
    const monday = (["tue", "wed", "thu", "fri", "sat"] as const).reduce((s, day) => toggleWorkingDay(s, "person_truck-2", day, actor), state)
    expect(monday.settings.people[1].workingDays).toEqual(["mon"])
    expect(toggleWorkingDay(monday, "person_truck-2", "mon", actor)).toBe(monday)
  })

  it("sets a capacity and refuses a fraction or a negative", () => {
    const next = setCapacity(state, "person_truck-1", "blowout", 12, actor)
    expect(next.settings.people[0].capacityByKind.blowout).toBe(12)
    expect(next.settings.people[0].capacityByKind.repair).toBe(4)
    expect(last(next)).toMatchObject({ field: "Ryan Garner blowouts per day", from: "10", to: "12" })
    expect(setCapacity(state, "person_truck-1", "blowout", 1.5, actor)).toBe(state)
    expect(setCapacity(state, "person_truck-1", "blowout", -1, actor)).toBe(state)
    expect(setCapacity(state, "person_truck-1", "blowout", 10, actor)).toBe(state)
  })

  it("adds a blank tech after the others, with no truck until one is typed", () => {
    const next = addPerson(state, actor)
    expect(next.settings.people).toHaveLength(3)
    expect(next.settings.people[2]).toMatchObject({ name: "New person", initials: "NP", role: "tech", workingDays: ["mon", "tue", "wed", "thu", "fri"], capacityByKind: { "turn-on": 0, inspection: 0, blowout: 0, repair: 0, other: 0 } })
    expect(next.settings.people[2].truck).toBeUndefined()
    expect(last(next)).toMatchObject({ field: "People", from: "2", to: "3" })
    expect(addPerson(next, actor).settings.people).toHaveLength(4)
  })

  it("gives a renamed person the initials of the new name", () => {
    const added = addPerson(state, actor)
    const id = added.settings.people[2].id
    const named = setPersonName(added, id, "Ada Lovelace", actor)
    expect(named.settings.people[2]).toMatchObject({ name: "Ada Lovelace", initials: "AL" })
    expect(setPersonName(named, id, "Ada", actor).settings.people[2].initials).toBe("AD")
    expect(setPersonName(named, id, "x".repeat(81), actor)).toBe(named)
  })

  it("sets the role in a word and keeps the last owner an owner", () => {
    const admin = setPersonRole(state, "person_truck-2", "admin", actor)
    expect(admin.settings.people[1].role).toBe("admin")
    expect(last(admin)).toMatchObject({ field: "Tech Two role", from: "Tech", to: "Admin" })
    expect(setPersonRole(state, "person_truck-1", "tech", actor)).toBe(state)
    const two = setPersonRole(state, "person_truck-2", "owner", actor)
    expect(setPersonRole(two, "person_truck-1", "tech", actor).settings.people[0].role).toBe("tech")
    expect(setPersonRole(state, "person_truck-2", "tech", actor)).toBe(state)
  })

  it("sets and clears the contact and the truck, logging None for a blank", () => {
    const email = setPersonText(state, "person_truck-2", "email", " sam@example.com ", actor)
    expect(email.settings.people[1].email).toBe("sam@example.com")
    expect(last(email)).toMatchObject({ field: "Tech Two email", from: "None", to: "sam@example.com" })
    const cleared = setPersonText(email, "person_truck-2", "email", "", actor)
    expect("email" in cleared.settings.people[1]).toBe(false)
    expect(last(cleared)).toMatchObject({ field: "Tech Two email", from: "sam@example.com", to: "None" })
    const noTruck = setPersonText(state, "person_truck-2", "truck", "", actor)
    expect(noTruck.settings.people[1].truck).toBeUndefined()
    expect(last(noTruck)).toMatchObject({ field: "Tech Two truck", from: "Truck 2", to: "None" })
    expect(setPersonText(state, "person_truck-2", "phone", "", actor)).toBe(state)
  })

  it("refuses an email that is not shaped like one, and a value longer than the API takes", () => {
    expect(setPersonText(state, "person_truck-2", "email", "sam@", actor)).toBe(state)
    expect(setPersonText(state, "person_truck-2", "email", "sam example.com", actor)).toBe(state)
    expect(setPersonText(state, "person_truck-2", "truck", "T".repeat(41), actor)).toBe(state)
    expect(setPersonText(state, "person_truck-2", "truck", "T".repeat(40), actor).settings.people[1].truck).toBe("T".repeat(40))
    expect(setPersonText(state, "person_truck-2", "phone", "5".repeat(41), actor)).toBe(state)
    expect(setPersonText(state, "person_truck-2", "jobberUserId", "j".repeat(81), actor)).toBe(state)
  })

  it("sets a season that is real and in order, and a blank means all year", () => {
    const from = setSeason(state, "person_truck-2", "seasonStart", "2027-04-01", actor)
    expect(from.settings.people[1].seasonStart).toBe("2027-04-01")
    expect(last(from)).toMatchObject({ field: "Tech Two season from", from: "All year", to: "2027-04-01" })
    const to = setSeason(from, "person_truck-2", "seasonEnd", "2027-10-31", actor)
    expect(to.settings.people[1].seasonEnd).toBe("2027-10-31")
    expect(setSeason(to, "person_truck-2", "seasonEnd", "2027-03-31", actor)).toBe(to)
    expect(setSeason(to, "person_truck-2", "seasonStart", "2027-11-01", actor)).toBe(to)
    expect(setSeason(state, "person_truck-2", "seasonStart", "2027-02-30", actor)).toBe(state)
    const cleared = setSeason(to, "person_truck-2", "seasonStart", "", actor)
    expect(cleared.settings.people[1].seasonStart).toBeUndefined()
    expect(last(cleared)).toMatchObject({ field: "Tech Two season from", to: "All year" })
  })
})

describe("areas", () => {
  it("moves a town into an area and out of the one that had it", () => {
    const next = toggleAreaTown(state, "area-longmont", "Firestone", actor)
    expect(next.settings.areas.map((a) => a.towns)).toEqual([["Erie"], ["Longmont", "Firestone"], ["Louisville", "Lafayette", "Broomfield"]])
    expect(last(next)).toMatchObject({ field: "Longmont towns", from: "Longmont", to: "Longmont, Firestone (moved from Erie and Firestone)" })
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
    const sample = { firstName: "Andrea", visit: "turn-on", date: "May 3", who: "Ryan", truck: "Truck 1", nextVisit: "inspection" }
    expect(fillMessage("Hi {firstName}, your {visit} is booked for {date}. {who} will be there on {truck}. Next: {nextVisit}. {other}", sample)).toBe(
      "Hi Andrea, your turn-on is booked for May 3. Ryan will be there on Truck 1. Next: inspection. {other}",
    )
    expect(fillMessage(data.settings.messages[1].body, sample)).not.toMatch(/\{/)
    const dayBefore = data.settings.messages.find((m) => m.key === "day-before")!
    expect(dayBefore.body).toContain("{who}")
    expect(fillMessage(dayBefore.body, sample)).toContain("Ryan will be there")
  })
})

describe("the log", () => {
  it("gives every change its own id and keeps the earlier ones", () => {
    let s = state
    s = setBuffer(s, "early", 25, actor)
    s = setBuffer(s, "early", 30, { who: "Ryan", at: "2026-11-12T20:00:00Z" })
    expect(s.changes.map((c) => [c.who, c.from, c.to])).toEqual([["Hannah", "20%", "25%"], ["Ryan", "25%", "30%"]])
    expect(new Set(s.changes.map((c) => c.id)).size).toBe(2)
  })
})

describe("more people, areas and keys", () => {
  it("sets the Jobber user and removes a person, logging both, and keeps the last owner", () => {
    const user = setPersonText(state, "person_truck-1", "jobberUserId", "jobber-user-9", actor)
    expect(user.settings.people[0].jobberUserId).toBe("jobber-user-9")
    expect(last(user)).toMatchObject({ field: "Ryan Garner Jobber user", from: "jobber-user-1", to: "jobber-user-9" })
    const gone = removePerson(state, "person_truck-2", actor)
    expect(gone.settings.people.map((p) => p.id)).toEqual(["person_truck-1"])
    expect(last(gone)).toMatchObject({ field: "People", from: "2 (Tech Two included)", to: "1 (Tech Two removed)" })
    expect(removePerson(state, "nope", actor)).toBe(state)
    expect(removePerson(state, "person_truck-1", actor)).toBe(state)
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
    expect(sampleFor(data)).toEqual({ firstName: "Andrea", visit: "inspection", date: "April 8", who: "Ryan", truck: "Truck 1", nextVisit: "inspection" })
  })
  it("falls back when there is nothing", () => {
    expect(sampleFor({ ...data, passes: [], visits: [] })).toMatchObject({ firstName: "Alex", visit: "visit", who: "Ryan", truck: "Truck 1" })
  })
})

describe("validation", () => {
  it("refuses a date that is not on the calendar and a window that closes before it opens", () => {
    expect(setWindow(state, "blowout", "opensOn", "2027-02-30", actor)).toBe(state)
    expect(setWindow(state, "blowout", "opensOn", "2027-13-01", actor)).toBe(state)
    expect(setWindow(state, "blowout", "opensOn", "2027-11-01", actor)).toBe(state) // closes Oct 31
    expect(setWindow(state, "blowout", "closesOn", "2027-09-30", actor)).toBe(state) // opens Oct 1
    expect(setWindow(state, "blowout", "opensOn", "2027-10-31", actor).settings.windows[2].opensOn).toBe("2027-10-31")
    expect(setWindow(state, "blowout", "closesOn", "2027-10-01", actor).settings.windows[2].closesOn).toBe("2027-10-01")
  })

  it("caps lead weeks at 12 and capacity at 50", () => {
    expect(setWindow(state, "turn-on", "leadWeeks", 13, actor)).toBe(state)
    expect(setWindow(state, "turn-on", "leadWeeks", 12, actor).settings.windows[0].leadWeeks).toBe(12)
    expect(setCapacity(state, "person_truck-1", "blowout", 51, actor)).toBe(state)
    expect(setCapacity(state, "person_truck-1", "blowout", 50, actor).settings.people[0].capacityByKind.blowout).toBe(50)
    expect(setBuffer(state, "early", 100, actor).settings.bufferPercentEarly).toBe(100)
    expect(setBuffer(state, "early", -1, actor)).toBe(state)
  })

  it("trims names and refuses an empty one", () => {
    expect(setPersonName(state, "person_truck-2", "  Blowout truck  ", actor).settings.people[1].name).toBe("Blowout truck")
    expect(setPersonName(state, "person_truck-2", "   ", actor)).toBe(state)
    expect(setAreaName(state, "area-north", "  North ", actor).settings.areas[0].name).toBe("North")
    expect(setAreaName(state, "area-north", "", actor)).toBe(state)
  })

  it("says where a town came from when it moves between areas", () => {
    const next = toggleAreaTown(state, "area-longmont", "Erie", actor)
    expect(last(next).to).toBe("Longmont, Erie (moved from Erie and Firestone)")
    const plain = toggleAreaTown(next, "area-longmont", "Erie", actor)
    expect(last(plain).to).toBe("Longmont")
  })
})

describe("setServiceField", () => {
  const blowout = () => state.services.find((s) => s.key === "blowout")!
  const turnOn = () => state.services.find((s) => s.key === "turn-on-8")!
  const repair = () => state.services.find((s) => s.key === "repair")!
  const edit = (s: SettingsState, key: string) => s.services.find((x) => x.key === key)!

  it("changes a description, trims it and logs the old and new words", () => {
    const next = setServiceField(state, "blowout", "description", "  A blowout of every zone.  ", actor)
    expect(edit(next, "blowout").description).toBe("A blowout of every zone.")
    expect(last(next)).toMatchObject({ field: `${blowout().name} what's included`, to: "A blowout of every zone." })
    expect(edit(state, "blowout").description).toBe(blowout().description)
  })

  it("clears a description on a blank, and refuses a dollar sign or more than a thousand characters", () => {
    expect(edit(setServiceField(state, "blowout", "description", "   ", actor), "blowout").description).toBeNull()
    expect(setServiceField(state, "blowout", "description", "Only $95 today", actor)).toBe(state)
    expect(setServiceField(state, "blowout", "description", "x".repeat(1001), actor)).toBe(state)
  })

  it("keeps the price in whole dollars and refuses a negative or fractional one", () => {
    expect(edit(setServiceField(state, "repair", "price", "160", actor), "repair").price).toBe(160)
    expect(last(setServiceField(state, "repair", "price", 160, actor)).to).toBe("$160")
    expect(setServiceField(state, "repair", "price", "145.5", actor)).toBe(state)
    expect(setServiceField(state, "repair", "price", -1, actor)).toBe(state)
    expect(setServiceField(state, "repair", "price", "", actor)).toBe(state)
  })

  it("changes the zone rule only on a service that has one", () => {
    expect(edit(setServiceField(state, "turn-on-8", "includedZones", 6, actor), "turn-on-8").includedZones).toBe(6)
    expect(edit(setServiceField(state, "turn-on-8", "extraZonePrice", 12, actor), "turn-on-8").extraZonePrice).toBe(12)
    expect(setServiceField(state, "turn-on-8", "includedZones", 17, actor)).toBe(state)
    expect(setServiceField(state, "repair", "extraZonePrice", 12, actor)).toBe(state)
    expect(setServiceField(state, "repair", "includedZones", 2, actor)).toBe(state)
    expect(turnOn().extraZonePrice).toBeDefined()
    expect(repair().extraZonePrice).toBeUndefined()
  })

  it("takes minutes in quarter hours from 15 to 480", () => {
    expect(edit(setServiceField(state, "repair", "slotMinutes", 90, actor), "repair").slotMinutes).toBe(90)
    expect(setServiceField(state, "repair", "slotMinutes", 100, actor)).toBe(state)
    expect(setServiceField(state, "repair", "slotMinutes", 495, actor)).toBe(state)
  })

  it("turns taxable and active on and off, and logs nothing for no change", () => {
    const off = setServiceField(state, "repair", "active", false, actor)
    expect(edit(off, "repair").active).toBe(false)
    expect(last(off)).toMatchObject({ from: "Yes", to: "No" })
    expect(edit(setServiceField(state, "repair", "taxable", true, actor), "repair").taxable).toBe(true)
    expect(setServiceField(state, "repair", "taxable", false, actor)).toBe(state)
    expect(setServiceField(state, "nope", "active", false, actor)).toBe(state)
  })

  it("leaves a quoted service without a price without one", () => {
    const quoted = { ...repair(), key: "quoted", quoteOnly: true, price: undefined }
    const withQuoted = { ...state, services: [...state.services, quoted] }
    expect(setServiceField(withQuoted, "quoted", "price", 100, actor)).toBe(withQuoted)
  })
})
