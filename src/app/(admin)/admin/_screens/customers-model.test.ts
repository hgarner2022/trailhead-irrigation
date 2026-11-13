import { describe, it, expect } from "vitest"
import type { Client, Pass, Visit } from "@/lib/admin/types"
import { consentEntries, customerRow, customerRows, customersContext } from "./customers-model"

const TODAY = "2026-11-12T19:56:30Z"
const client: Client = {
  id: "c1",
  firstName: "Andrea",
  lastName: "Anderson",
  email: "andrea@example.com",
  phone: "+19705550123",
  address: "12 Briggs St",
  town: "Erie",
  jobberUrl: "",
  hasPass: true,
  lastVisitAt: "2026-10-22T18:00:00Z",
}
const pass: Pass = {
  id: "p1",
  number: "TH-2027-0001",
  season: 2027,
  clientId: "c1",
  firstName: "Andrea",
  lastName: "Anderson",
  town: "Erie",
  zones: 8,
  turnOnPreference: "earlier",
  blowoutPreference: "recommended",
  status: "active",
  visits: [
    { kind: "turn-on", window: "May", amount: 145 },
    { kind: "inspection", window: "July", amount: 145 },
    { kind: "blowout", window: "October", amount: 95 },
  ],
  stripeUrl: "",
  jobberUrl: "",
  accessNote: "Gate code 4471.",
  consent: { marketingOptIn: true, marketingChannels: ["email"], source: "checkout", recordedAt: "2026-11-12T19:00:00Z" },
}
const visit = (startAt: string, kind: Visit["kind"] = "blowout", status: Visit["status"] = "scheduled"): Visit => ({ id: startAt, clientId: "c1", clientName: "Andrea", town: "Erie", kind, status, startAt, isPass: false, jobberUrl: "" })

describe("customerRow", () => {
  it("reads the normal data: full name, street, town, email, phone and the access note", () => {
    const row = customerRow(client, [pass], [], TODAY)
    expect(row).toMatchObject({ name: "Andrea Anderson", firstName: "Andrea", address: "12 Briggs St", town: "Erie", email: "andrea@example.com", phone: "+19705550123", accessNote: "Gate code 4471.", season: 2027, pass: "active" })
  })

  it("reads the first name alone where no last name is on record, and leaves contact out when the caller may not see it", () => {
    const row = customerRow({ id: "c2", firstName: "Ben", town: "Erie", jobberUrl: "", hasPass: false }, [], [], TODAY)
    expect(row.name).toBe("Ben")
    expect(row).not.toHaveProperty("email")
    expect(row).not.toHaveProperty("phone")
    expect(row).not.toHaveProperty("address")
  })

  it("reads a booked visit on the calendar first, as its day in Mountain time", () => {
    const row = customerRow(client, [pass], [visit("2026-10-22T18:00:00Z", "blowout", "completed"), visit("2027-05-04T05:30:00Z", "turn-on")], TODAY)
    expect(row.nextState).toBe("booked")
    expect(row.next).toBe("May 3")
    expect(row.nextKey).toBe("2027-05-03")
    expect(row.pass).toBe("active")
  })

  it("reads the day off the pass visit row, never off a preference", () => {
    const dated: Pass = { ...pass, visits: [{ ...pass.visits[0], scheduledOn: "2027-04-26", scheduledAt: "2027-04-26T14:00:00Z", startTime: "08:00" }, ...pass.visits.slice(1)] }
    const row = customerRow(client, [dated], [], TODAY)
    expect(row).toMatchObject({ nextState: "booked", next: "Apr 26", nextKey: "2027-04-26" })
  })

  it("says Needs a day for an active pass whose job has none", () => {
    const row = customerRow(client, [pass], [], TODAY)
    expect(row.nextState).toBe("to-schedule")
    expect(row.next).toBe("Needs a day")
    expect(row.nextKey).toBeUndefined()
  })

  it("says nothing ahead for a customer with no pass and nothing booked, and skips past visits", () => {
    const row = customerRow({ ...client, hasPass: false }, [], [visit("2026-10-22T18:00:00Z")], TODAY)
    expect(row.nextState).toBe("none")
    expect(row.next).toBe("Nothing ahead")
    expect(row.nextKey).toBeUndefined()
    expect(row.pass).toBe("none")
  })

  it("reads the marketing consent, and not asked when there is none", () => {
    expect(customerRow(client, [pass], [], TODAY).marketing).toBe("not-asked")
    expect(customerRow({ ...client, consent: pass.consent }, [pass], [], TODAY).marketing).toBe("yes")
    expect(customerRow({ ...client, consent: { ...pass.consent!, marketingOptIn: false, marketingChannels: [] } }, [pass], [], TODAY).marketing).toBe("no")
  })

  it("does not count a cancelled pass's visits, or a pending pass's, as needing a day", () => {
    const cancelled = customerRow(client, [{ ...pass, status: "cancelled" }], [], TODAY)
    expect(cancelled.pass).toBe("cancelled")
    expect(cancelled.nextState).toBe("none")
    const pending = customerRow(client, [{ ...pass, status: "pending" }], [], TODAY)
    expect(pending.pass).toBe("pending")
    expect(pending.nextState).toBe("none")
  })
})

describe("consentEntries", () => {
  const first = { termsAcceptedAt: "2026-11-02T15:10:00Z", termsVersion: "2026-11", marketingOptIn: true, marketingChannels: ["email" as const, "sms" as const], source: "checkout" as const, recordedAt: "2026-11-02T15:10:00Z" }
  const optOut = { marketingOptIn: false, marketingChannels: [], source: "admin" as const, recordedAt: "2026-11-09T18:00:00Z" }

  it("lists every record, as the client holds them, with its day, where it came from and what it says", () => {
    expect(consentEntries({ consent: optOut, consentHistory: [optOut, first] })).toEqual([
      { day: "Nov 9", source: "Admin", line: "Marketing: no." },
      { day: "Nov 2", source: "Checkout", line: "Terms 2026-11 accepted Nov 2. Marketing: email and text." },
    ])
  })

  it("falls back to the current record, and to nothing", () => {
    expect(consentEntries({ consent: first })).toHaveLength(1)
    expect(consentEntries({})).toEqual([])
  })
})

describe("customersContext", () => {
  it("counts customers, passes, those needing a day and those scheduled", () => {
    const rows = customerRows({ clients: [client, { ...client, id: "c2", firstName: "Ben", hasPass: false }], passes: [pass], visits: [{ ...visit("2027-04-20T15:00:00Z", "repair"), clientId: "c2" }] }, TODAY)
    expect(customersContext(rows)).toBe("2 customers, 1 with a pass. 1 need a day, 1 scheduled ahead.")
    expect(customersContext([])).toBe("No customers yet.")
  })
})
