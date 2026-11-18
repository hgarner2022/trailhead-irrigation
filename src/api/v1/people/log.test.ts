// @vitest-environment node
import { describe, expect, it, vi } from "vitest"
import type { PersonRow } from "./handlers"

vi.mock("server-only", () => ({}))
import { personLeaves } from "./log"

const row = (over: Partial<PersonRow> = {}): PersonRow =>
  ({
    id: "p1", organizationId: "o", name: "Hannahn.garner", initials: "HA", email: "h@example.com", phone: null, role: "admin", truck: null, jobberUserId: null, calendarFeedUrl: null,
    workingDays: ["mon", "tue"], capacityByKind: { "turn-on": 8, inspection: 8, blowout: 10, repair: 4, other: 2 }, seasonStart: null, seasonEnd: null, active: true, legacyTruckId: null,
    createdAt: new Date(0), updatedAt: new Date(0), ...over,
  }) as PersonRow

describe("personLeaves", () => {
  it("is empty when nothing changed", () => {
    expect(personLeaves(row(), row())).toEqual([])
  })
  it("names a rename after the old name, the way the screen's own log does", () => {
    expect(personLeaves(row(), row({ name: "Hannah Garner", initials: "HG" }))).toEqual([{ field: "Hannahn.garner name", from: "Hannahn.garner", to: "Hannah Garner" }])
  })
  it("says each changed field once, in words", () => {
    const leaves = personLeaves(row(), row({ role: "owner", truck: "Truck 3", workingDays: ["mon", "tue", "wed"], capacityByKind: { "turn-on": 9, inspection: 8, blowout: 10, repair: 4, other: 2 }, seasonStart: "2027-04-01" }))
    expect(leaves).toEqual([
      { field: "Hannahn.garner role", from: "Admin", to: "Owner" },
      { field: "Hannahn.garner truck", from: "None", to: "Truck 3" },
      { field: "Hannahn.garner working days", from: "Mon, Tue", to: "Mon, Tue, Wed" },
      { field: "Hannahn.garner turn-ons per day", from: "8", to: "9" },
      { field: "Hannahn.garner season from", from: "All year", to: "2027-04-01" },
    ])
  })
})
