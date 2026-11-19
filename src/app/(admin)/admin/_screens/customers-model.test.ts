import { describe, it, expect } from "vitest"
import type { Client, Pass, SoldJob, Visit, Yard } from "@/lib/admin/types"
import { cardOf, customerCardWords, consentEntries, customerRow, customerRows, customersContext, propertiesOf, propertyLines, unpaidOf, yardFromPass } from "./customers-model"

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
  it("reads the normal data: full name, street, town, email, and phone", () => {
    const row = customerRow(client, [pass], [], TODAY)
    expect(row).toMatchObject({ name: "Andrea Anderson", firstName: "Andrea", address: "12 Briggs St", town: "Erie", email: "andrea@example.com", phone: "+19705550123", season: 2027, pass: "active" })
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

  it("says Unscheduled for an active pass whose job has none", () => {
    const row = customerRow(client, [pass], [], TODAY)
    expect(row.nextState).toBe("to-schedule")
    expect(row.next).toBe("Unscheduled")
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

  it("does not count a canceled pass's visits, or a pending pass's, as needing a day", () => {
    const cancelled = customerRow(client, [{ ...pass, status: "cancelled" }], [], TODAY)
    expect(cancelled.pass).toBe("cancelled")
    expect(cancelled.nextState).toBe("none")
    const pending = customerRow(client, [{ ...pass, status: "pending" }], [], TODAY)
    expect(pending.pass).toBe("pending")
    expect(pending.nextState).toBe("none")
  })
})

describe("a customer with a one-off job and no pass", () => {
  const nora: Client = { id: "c9", firstName: "Nora", lastName: "Ortiz", town: "Erie", jobberUrl: "", hasPass: false }
  const repair = (over: Partial<SoldJob> = {}): SoldJob => ({ id: "j-repair", customerId: "c9", kind: "repair", status: "open", source: "office", soldOn: "2026-11-18", visitIds: ["v-repair"], ...over })
  const repairVisit = (over: Partial<Visit> = {}): Visit => ({ id: "v-repair", clientId: "c9", clientName: "Nora Ortiz", town: "Erie", kind: "repair", status: "scheduled", startAt: "2026-11-20T15:00:00Z", scheduledOn: "2026-11-20", isPass: false, jobberUrl: "", jobId: "j-repair", ...over })

  it("reads Job as the open job's name, Next as its day and Scheduled as yes", () => {
    const row = customerRow(nora, [], [repairVisit()], TODAY, [repair()])
    expect(row).toMatchObject({ pass: "none", job: { id: "j-repair", title: "Repair", isPass: false }, nextState: "booked", next: "Nov 20", nextKey: "2026-11-20" })
  })

  it("reads Unscheduled when the one-off job's visit has no day yet", () => {
    const row = customerRow(nora, [], [repairVisit({ status: "unscheduled", startAt: undefined, scheduledOn: undefined })], TODAY, [repair()])
    expect(row).toMatchObject({ job: { title: "Repair" }, nextState: "to-schedule", next: "Unscheduled" })
    expect(customersContext([row])).toBe("1 customers, 0 with a pass. 1 unscheduled, 0 scheduled ahead.")
  })

  it("has no Job once the job is done or canceled, and says Nothing ahead", () => {
    const done = customerRow(nora, [], [repairVisit({ status: "completed" })], TODAY, [repair({ status: "done" })])
    expect(done).toMatchObject({ nextState: "none", next: "Nothing ahead" })
    expect(done.job).toBeUndefined()
    expect(customerRow(nora, [], [], TODAY, [repair({ status: "cancelled" })]).job).toBeUndefined()
  })

  it("names the newest open job when there are several, and a pass by its number", () => {
    const older = repair({ id: "j-old", soldOn: "2026-10-01" })
    const install = repair({ id: "j-install", kind: "install", soldOn: "2026-11-10" })
    expect(customerRow(nora, [], [], TODAY, [older, install]).job).toEqual({ id: "j-install", title: "Installation", isPass: false })
    const passJob = repair({ id: "j-pass", kind: "pass", passNumber: "TH-2027-0001", passId: "p1", soldOn: "2026-11-19" })
    expect(customerRow(client, [pass], [], TODAY, [{ ...passJob, customerId: "c1" }, older]).job).toEqual({ id: "j-pass", title: "Season Pass TH-2027-0001", isPass: true })
    // A pending pass is an unfinished checkout, not a job.
    expect(customerRow(client, [], [], TODAY, [{ ...passJob, customerId: "c1", soldOn: undefined }]).job).toBeUndefined()
  })

  it("counts a one-off beside a pass: the next of any job, and a one-off with no day makes the customer Unscheduled", () => {
    const row = customerRow(client, [pass], [visit("2027-05-04T05:30:00Z", "turn-on")], TODAY, [])
    expect(row.nextState).toBe("booked")
    const waiting = customerRow({ ...client, id: "c9" }, [], [repairVisit({ status: "unscheduled", startAt: undefined })], TODAY, [repair()])
    expect(waiting.nextState).toBe("to-schedule")
  })

  it("customerRows hands each customer their own jobs", () => {
    const rows = customerRows({ clients: [nora, client], passes: [pass], visits: [repairVisit()], jobs: [repair()] }, TODAY)
    expect(rows.map((r) => [r.id, r.job?.title])).toEqual([["c9", "Repair"], ["c1", undefined]])
  })
})

describe("unpaidOf", () => {
  const job = (status: SoldJob["status"], owed: number, words: string) => ({ id: "j", status, money: { paid: 0, total: owed, owed, words } }) as unknown as SoldJob
  it("adds what is owed on done work and leaves out canceled jobs and a pass's charges that are not yet due", () => {
    expect(unpaidOf([job("done", 115, "$115 unpaid"), job("open", 45, "$45 unpaid"), job("cancelled", 145, "$145 unpaid"), job("open", 280, "$280, charged after each visit")])).toBe(160)
    expect(unpaidOf([])).toBe(0)
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
    expect(customersContext(rows)).toBe("2 customers, 1 with a pass. 1 unscheduled, 1 scheduled ahead.")
    expect(customersContext([])).toBe("No customers yet.")
  })
})

describe("propertyLines", () => {
  const full: Yard = {
    zones: 8, controller: "Rachio 3 in the garage", backflowLocation: "north side", gateCode: "4471", mustBeHome: true, accessNote: "Dog loose, close the gate",
    contactName: "Dana", contactPhone: "+19705550123", notes: "Clay soil by the fence",
  }
  it("says each fact that is set, in the order the crew reads them", () => {
    expect(propertyLines(full, { canSeeContact: true })).toEqual([
      "8 zones", "Rachio 3 in the garage", "Backflow north side", "Gate code 4471", "Must be home", "Dog loose, close the gate", "Contact Dana, (970) 555-0123", "Property notes Clay soil by the fence",
    ])
  })
  it("skips what is not set and says Must be home only when it is true", () => {
    expect(propertyLines({ zones: 6, mustBeHome: false }, { canSeeContact: true })).toEqual(["6 zones"])
    expect(propertyLines({ mustBeHome: false }, { canSeeContact: true })).toEqual([])
    expect(propertyLines(undefined, { canSeeContact: true })).toEqual([])
  })
  it("keeps the gate code and the on-site phone from a tech", () => {
    const lines = propertyLines(full, { canSeeContact: false })
    expect(lines).not.toContain("Gate code 4471")
    expect(lines).not.toContain("Dog loose, close the gate")
    expect(lines.join("|")).not.toMatch(/555/)
    expect(lines).toContain("Contact Dana")
  })
})

describe("propertiesOf", () => {
  it("builds the one property from the pass when the customer carries none (the fixtures)", () => {
    expect(yardFromPass(pass)).toEqual({ zones: 8, mustBeHome: false, accessNote: "Gate code 4471." })
    expect(propertiesOf(client, [pass])).toEqual([{ id: "property-c1", town: "Erie", address: "12 Briggs St", zones: 8, mustBeHome: false, accessNote: "Gate code 4471." }])
    expect(propertiesOf({ ...client, id: "c9" }, [pass])).toEqual([])
  })
  it("uses the customer's own properties when the API sent them", () => {
    const own = [{ id: "pr1", town: "Erie" as const, mustBeHome: false }]
    expect(propertiesOf({ ...client, properties: own }, [pass])).toBe(own)
  })
})

describe("the customer's Card line", () => {
  it("says the brand, the last four and the expiry", () => {
    expect(customerCardWords({ brand: "visa", last4: "4242", expires: "2028-08" })).toBe("Visa ending 4242, expires 08/28")
    expect(customerCardWords({ last4: "4242", expires: "2028-08" })).toBe("Ending 4242, expires 08/28")
    expect(customerCardWords({ brand: "amex", last4: "0005" })).toBe("Amex ending 0005")
    expect(customerCardWords(undefined)).toBe("No card on file")
  })
  it("reads the customer's card, else the newest pass's (the fixtures)", () => {
    const own = { last4: "1111", brand: "visa" }
    expect(cardOf({ ...client, card: own }, [{ ...pass, cardLast4: "2222" }])).toBe(own)
    expect(cardOf(client, [{ ...pass, cardLast4: "2222", cardExpires: "2028-08" }])).toEqual({ last4: "2222", expires: "2028-08" })
    expect(cardOf(client, [pass])).toBeUndefined()
  })
  it("never lets a pass speak for a customer the API sent with no card", () => {
    expect(cardOf({ ...client, properties: [] }, [{ ...pass, cardLast4: "2222" }])).toBeUndefined()
  })
})
