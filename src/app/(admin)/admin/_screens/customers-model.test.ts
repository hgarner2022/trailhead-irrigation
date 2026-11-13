import { describe, it, expect } from "vitest"
import type { Client, Pass, Visit } from "@/lib/admin/types"
import { customerRow, customerRows, customersContext } from "./customers-model"

const TODAY = "2026-11-12T19:56:30Z"
const client: Client = { id: "c1", firstName: "Andrea", town: "Erie", jobberUrl: "https://secure.getjobber.com/clients/1", hasPass: true, lastVisitAt: "2026-10-22T18:00:00Z" }
const pass: Pass = {
  id: "p1",
  number: "TH-2027-0001",
  season: 2027,
  clientId: "c1",
  firstName: "Andrea",
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
  stripeUrl: "https://dashboard.stripe.com/customers/cus_1",
  jobberUrl: "https://secure.getjobber.com/clients/1",
  consent: { marketingOptIn: true, marketingChannels: ["email"], source: "checkout", recordedAt: "2026-11-12T19:00:00Z" },
}
const visit = (startAt: string, kind: Visit["kind"] = "blowout", status: Visit["status"] = "scheduled"): Visit => ({ id: startAt, clientId: "c1", clientName: "Andrea", town: "Erie", kind, status, startAt, isPass: false, jobberUrl: "" })

describe("customerRow", () => {
  it("reads a booked visit on the calendar first, with its day in Mountain time", () => {
    const row = customerRow(client, [pass], [visit("2026-10-22T18:00:00Z", "blowout", "completed"), visit("2027-05-04T05:30:00Z", "turn-on")], TODAY)
    expect(row.nextState).toBe("booked")
    expect(row.next).toBe("Turn-on, May 3")
    expect(row.nextKey).toBe("2027-05-04")
    expect(row.pass).toBe("active")
  })

  it("names the pass visit still to schedule, with the customer's preference", () => {
    const row = customerRow(client, [pass], [], TODAY)
    expect(row.nextState).toBe("to-schedule")
    expect(row.next).toBe("Turn-on, early May")
    expect(row.nextKey).toBe("2027-05-01")
    const inspection = customerRow(client, [{ ...pass, visits: [{ ...pass.visits[0], completedAt: "2027-05-03T17:00:00Z" }, ...pass.visits.slice(1)] }], [], TODAY)
    expect(inspection.next).toBe("Inspection, July")
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

  it("does not count a cancelled pass's visits as to schedule", () => {
    const row = customerRow(client, [{ ...pass, status: "cancelled" }], [], TODAY)
    expect(row.pass).toBe("cancelled")
    expect(row.nextState).toBe("none")
  })
})

describe("customersContext", () => {
  it("counts customers, passes, to schedule and booked", () => {
    const rows = customerRows({ clients: [client, { ...client, id: "c2", firstName: "Ben", hasPass: false }], passes: [pass], visits: [{ ...visit("2027-04-20T15:00:00Z", "repair"), clientId: "c2" }] }, TODAY)
    expect(customersContext(rows)).toBe("2 customers, 1 with a pass. 1 to schedule, 1 booked ahead.")
    expect(customersContext([])).toBe("No customers yet.")
  })
})
