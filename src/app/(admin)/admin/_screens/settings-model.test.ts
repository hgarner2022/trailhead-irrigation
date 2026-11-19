import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, ServiceItem } from "@/lib/admin/types"
import { SERVICE_LIST } from "@/lib/services"
import {
  setServiceField, createKey, revokeKey, secretFor, SAMPLE_KEYS, clip, daysWords, type SettingsState,
} from "./settings-model"
import { addPerson, removePerson, setCapacity, setHours, setPersonName, setTakesVisits, setPersonRole, setPersonText, setSeason, peopleProblems, toggleWorkingDay } from "./settings-people"

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

  it("clips long values", () => {
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
    expect(last(next)).toMatchObject({ field: "Ryan Garner most blowouts per day", from: "10", to: "12" })
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
    expect(last(noTruck)).toMatchObject({ field: "Tech Two schedule label", from: "Truck 2", to: "None" })
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

describe("hours and takes visits", () => {
  it("shows 09:00 to 17:00 for a person with no saved hours and logs the range", () => {
    const next = setHours(state, "person_truck-2", "hoursStart", "07:30", actor)
    expect(next.settings.people[1].hoursStart).toBe("07:30")
    expect(last(next)).toMatchObject({ field: "Tech Two hours", from: "09:00 to 17:00", to: "07:30 to 17:00" })
    const both = setHours(next, "person_truck-2", "hoursEnd", "15:00", actor)
    expect(last(both)).toMatchObject({ from: "07:30 to 17:00", to: "07:30 to 15:00" })
  })

  it("refuses a time that is not HH:MM, keeps a day that ends before it starts and reports it as a problem", () => {
    expect(setHours(state, "person_truck-2", "hoursStart", "7am", actor)).toBe(state)
    expect(setHours(state, "nope", "hoursEnd", "15:00", actor)).toBe(state)
    expect(peopleProblems(state.settings)).toEqual([])
    for (const [field, v] of [["hoursStart", "17:00"], ["hoursEnd", "09:00"], ["hoursEnd", "08:00"]] as const) {
      const bad = setHours(state, "person_truck-2", field, v, actor)
      expect(bad).not.toBe(state)
      expect(peopleProblems(bad.settings)).toEqual(["Tech Two: End must be after the start"])
      expect(peopleProblems(setHours(bad, "person_truck-2", field, "", actor).settings)).toEqual([])
    }
  })

  it("puts a day back to its default with a blank, logging nothing when it already was", () => {
    const set = setHours(state, "person_truck-2", "hoursEnd", "15:00", actor)
    const back = setHours(set, "person_truck-2", "hoursEnd", "", actor)
    expect(back.settings.people[1].hoursEnd).toBeUndefined()
    expect(setHours(state, "person_truck-2", "hoursEnd", "", actor)).toBe(state)
    // typing the default is no change: nothing is logged
    expect(setHours(state, "person_truck-2", "hoursEnd", "17:00", actor)).toBe(state)
  })

  it("turns Takes visits on with a label of their own name and off by removing it", () => {
    const added = addPerson(state, actor)
    const id = added.settings.people[2].id
    const on = setTakesVisits(added, id, true, actor)
    expect(on.settings.people[2].truck).toBe("New person")
    expect(last(on)).toMatchObject({ field: "New person takes visits", from: "No", to: "Yes" })
    expect(setTakesVisits(on, id, true, actor)).toBe(on)
    const off = setTakesVisits(on, id, false, actor)
    expect(off.settings.people[2].truck).toBeUndefined()
    expect(last(off)).toMatchObject({ from: "Yes", to: "No" })
    expect(setTakesVisits(state, "nope", true, actor)).toBe(state)
  })
})

describe("the log", () => {
  it("gives every change its own id and keeps the earlier ones", () => {
    let s = state
    s = setCapacity(s, "person_truck-1", "repair", 5, actor)
    s = setCapacity(s, "person_truck-1", "repair", 6, { who: "Ryan", at: "2026-11-12T20:00:00Z" })
    expect(s.changes.map((c) => [c.who, c.from, c.to])).toEqual([["Hannah", "4", "5"], ["Ryan", "5", "6"]])
    expect(new Set(s.changes.map((c) => c.id)).size).toBe(2)
  })
})

describe("more people and keys", () => {
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

describe("validation", () => {
  it("caps capacity at 50", () => {
    expect(setCapacity(state, "person_truck-1", "blowout", 51, actor)).toBe(state)
    expect(setCapacity(state, "person_truck-1", "blowout", 50, actor).settings.people[0].capacityByKind.blowout).toBe(50)
  })

  it("trims names and refuses an empty one", () => {
    expect(setPersonName(state, "person_truck-2", "  Blowout truck  ", actor).settings.people[1].name).toBe("Blowout truck")
    expect(setPersonName(state, "person_truck-2", "   ", actor)).toBe(state)
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
