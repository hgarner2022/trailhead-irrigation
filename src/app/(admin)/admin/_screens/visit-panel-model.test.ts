import { describe, expect, it } from "vitest"
import type { AdminData, JobLine, Visit } from "@/lib/admin/types"
import { customerChangeLine, visitCancelled, visitFacts, visitPrice, whenCanceled } from "./visit-panel-model"

const visit = { id: "v1", jobId: "j1", price: 145 } as Visit
const line = (id: string, unitPrice: number, over: Partial<JobLine> = {}): JobLine => ({ id, name: "Repair", quantity: 1, unitPrice, taxable: false, visitId: "v1", ...over })
const data = (lines?: JobLine[]) => ({ jobs: [{ id: "j1", lines }] }) as unknown as Pick<AdminData, "jobs">

describe("visitPrice", () => {
  it("sums the visit's own live lines, not the first one", () => {
    expect(visitPrice(data([line("a", 145), line("b", 40), line("c", 500, { cancelledAt: "2027-01-01T00:00:00Z" })]), visit)).toBe(185)
  })
  it("is 0 when every own line is canceled, and says so", () => {
    const d = data([line("a", 145, { cancelledAt: "2027-01-01T00:00:00Z" })])
    expect(visitPrice(d, visit)).toBe(0)
    expect(visitCancelled(d, visit)).toBe(true)
  })
  it("keeps the legacy price with no line at all, and a real $0 line is not canceled", () => {
    expect(visitPrice(data([]), visit)).toBe(145)
    expect(visitCancelled(data([]), visit)).toBe(false)
    expect(visitPrice(data([line("a", 0)]), visit)).toBe(0)
    expect(visitCancelled(data([line("a", 0)]), visit)).toBe(false)
  })
})

describe("visitFacts money", () => {
  const TODAY = "2026-11-12T19:56:30Z"
  const mk = (id: string, over: Partial<Visit> = {}): Visit => ({ id, clientId: "c", clientName: "Dana Reed", town: "Erie", kind: "repair", status: "completed", isPass: false, jobberUrl: "", jobId: "j1", completedOn: "2026-11-10", scheduledOn: "2026-11-10", price: 145, ...over })
  const row = (visitId: string, amount: number, over: Record<string, unknown> = {}) => ({ id: `pay-${visitId}-${amount}`, jobId: "j1", visitId, amount, method: "check", status: "succeeded", ...over })
  const world = (payments: ReturnType<typeof row>[], visits: Visit[]): AdminData =>
    ({
      clients: [], passes: [], messages: [], visits,
      jobs: [{ id: "j1", customerId: "c", kind: "repair", status: "open", source: "office", visitIds: visits.map((v) => v.id), lines: visits.map((v) => ({ id: `l-${v.id}`, name: "Repair", quantity: 1, unitPrice: 145, taxable: false, visitId: v.id })), payments }],
    }) as unknown as AdminData
  const a = mk("a")
  const b = mk("b", { status: "scheduled", completedOn: undefined, scheduledOn: "2026-11-20" })

  it("says the number owed on a done job nothing has paid", () => {
    expect(visitFacts(world([], [a]), "a", TODAY)).toMatchObject({ money: "$145 unpaid" })
  })
  it("says how many visits are paid and what is left, from the job's payment rows", () => {
    const facts = visitFacts({ ...world([row("a", 145)], [a, b]) }, "a", TODAY)!
    expect(facts.money).toBe("1 of 2 paid, $145 unpaid")
  })
  it("says Paid once the rows cover the job, and the number owed again after a refund", () => {
    expect(visitFacts(world([row("a", 145)], [a]), "a", TODAY)!.money).toBe("Paid")
    expect(visitFacts(world([row("a", 145), row("a", -145, { refundsPaymentId: "pay-a-145" })], [a]), "a", TODAY)!.money).toBe("$145 unpaid")
  })
})

describe("whenCanceled", () => {
  it("says the day a canceled visit had, and just Canceled when it never had one, never Unscheduled", () => {
    expect(whenCanceled({ cancelledWas: "2027-04-30" })).toBe("Canceled, was Fri, Apr 30")
    expect(whenCanceled({})).toBe("Canceled")
  })
})

describe("visitFacts messages", () => {
  it("lists only the messages about that visit, not every message the customer has", () => {
    const v = { id: "a", clientId: "c", clientName: "Dana Reed", town: "Erie", kind: "repair", status: "scheduled", isPass: false, jobberUrl: "", price: 145 } as unknown as Visit
    const msg = (id: string, visitId?: string) => ({ id, clientId: "c", ...(visitId ? { visitId } : {}), channel: "sms", kind: "date-set", body: id, at: "2026-11-10T10:00:00Z", status: "sent" })
    const d = { clients: [], passes: [], visits: [v], jobs: [], messages: [msg("m1", "a"), msg("m2", "other"), msg("m3")] } as unknown as AdminData
    expect(visitFacts(d, "a", "2026-11-12T19:56:30Z")!.messages.map((m) => m.id)).toEqual(["m1"])
  })
})

describe("customerChangeLine (the 24-hour rule as the office reads it)", () => {
  const booked = { scheduledOn: "2027-04-28" } as Visit
  it("says what the customer's account allows until the last minute, then Closed, texts only", () => {
    expect(customerChangeLine(booked, true, "2027-04-20")).toBe("Customer can change online until Mon, Apr 26, 11:59 pm")
    expect(customerChangeLine(booked, true, "2027-04-26")).toBe("Customer can change online until Mon, Apr 26, 11:59 pm")
    expect(customerChangeLine(booked, true, "2027-04-27")).toBe("Closed, texts only")
    expect(customerChangeLine(booked, true, "2027-04-28")).toBe("Closed, texts only")
  })
  it("says nothing for a visit that is not booked", () => {
    expect(customerChangeLine(booked, false, "2027-04-20")).toBeNull()
    expect(customerChangeLine({} as Visit, true, "2027-04-20")).toBeNull()
  })
})
