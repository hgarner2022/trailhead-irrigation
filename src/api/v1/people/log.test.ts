// @vitest-environment node
import { describe, expect, it, vi } from "vitest"
import type { PersonRow } from "./handlers"

vi.mock("server-only", () => ({}))
import { personLeaves } from "./log"

const row = (over: Partial<PersonRow> = {}): PersonRow =>
  ({
    id: "p1", organizationId: "o", name: "Hannahn.garner", initials: "HA", email: "h@example.com", phone: null, role: "admin", truck: null, jobberUserId: null, calendarFeedUrl: null,
    workingDays: ["mon", "tue"], capacityByKind: { "turn-on": 8, inspection: 8, blowout: 10, repair: 4, other: 2 }, seasonStart: null, seasonEnd: null, hoursStart: null, hoursEnd: null, active: true,
    createdAt: new Date(0), updatedAt: new Date(0), ...over,
  }) as PersonRow

describe("personLeaves", () => {
  it("is empty when nothing changed", () => {
    expect(personLeaves(row(), row())).toEqual([])
  })
  it("names a rename after the old name, the way the screen's own log does", () => {
    expect(personLeaves(row(), row({ name: "Hannah Garner", initials: "HG" }))).toEqual([{ field: "Hannahn.garner name", from: "Hannahn.garner", to: "Hannah Garner" }])
  })
  it("says a schedule label edited in place as the label, and the hours as a range with the 09:00 to 17:00 default", () => {
    expect(personLeaves(row({ truck: "Truck 1" }), row({ truck: "Truck 9" }))).toEqual([{ field: "Hannahn.garner schedule label", from: "Truck 1", to: "Truck 9" }])
    expect(personLeaves(row(), row({ hoursStart: "07:30" }))).toEqual([{ field: "Hannahn.garner hours", from: "09:00 to 17:00", to: "07:30 to 17:00" }])
    expect(personLeaves(row({ hoursEnd: "17:00" }), row())).toEqual([])
  })
  it("says each changed field once, in words", () => {
    const leaves = personLeaves(row(), row({ role: "owner", truck: "Truck 3", workingDays: ["mon", "tue", "wed"], capacityByKind: { "turn-on": 9, inspection: 8, blowout: 10, repair: 4, other: 2 }, seasonStart: "2027-04-01" }))
    expect(leaves).toEqual([
      { field: "Hannahn.garner role", from: "Admin", to: "Owner" },
      { field: "Hannahn.garner takes visits", from: "No", to: "Yes" },
      { field: "Hannahn.garner working days", from: "Mon, Tue", to: "Mon, Tue, Wed" },
      { field: "Hannahn.garner most turn-ons per day", from: "8", to: "9" },
      { field: "Hannahn.garner season from", from: "All year", to: "2027-04-01" },
    ])
  })
})
