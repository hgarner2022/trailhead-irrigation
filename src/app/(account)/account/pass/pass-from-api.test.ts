import { describe, expect, it } from "vitest"
import type { z } from "zod"
import type { PassDetail } from "@/api/v1/passes/schemas"
import { passFromApi } from "./pass-from-api"

const visit = (over: Record<string, unknown>) => ({ id: "v", passId: "p", bookingId: null, customerId: "c", firstName: "Andrea", town: "Erie", kind: "turn-on", status: "unscheduled", window: "May", amount: 145, preference: null, awaitingPick: false, personId: null, personName: null, truckId: null, truckName: null, scheduledOn: null, startTime: null, durationMinutes: null, stopOrder: null, confirmedAt: null, completedOn: null, chargedAt: null, exception: null, jobberRequestUrl: null, lat: null, lng: null, ...over })
const detail = (over: Record<string, unknown> = {}) =>
  ({ id: "p", number: "TH-2027-0001", season: 2027, customerId: "c", propertyId: "pr", firstName: "Andrea", town: "Erie", zones: 8, inspection: false, status: "active", turnOnPreference: "recommended", blowoutPreference: "later", needsCustomerHome: false, cardBrand: "visa", cardLast4: "4242", cardExpires: "2028-08", cardFailedAt: null, cancelledAt: null, createdAt: "2027-01-01T00:00:00Z", charges: [], consent: null, price: 260, visits: [], ...over }) as unknown as z.infer<typeof PassDetail>

describe("passFromApi", () => {
  it("orders the visits, drops cancelled and skipped ones and carries the date and who has it", () => {
    const pass = passFromApi(detail({ visits: [visit({ id: "b", kind: "blowout", window: "October" }), visit({ id: "i", kind: "inspection", status: "skipped" }), visit({ id: "t", status: "scheduled", scheduledOn: "2027-05-04", startTime: "08:00", personName: "Ryan Garner" })] }))
    expect(pass.visits.map((v) => v.kind)).toEqual(["turn-on", "blowout"])
    expect(pass.visits[0]).toMatchObject({ personName: "Ryan Garner", truckName: "Ryan Garner", window: "May" })
    expect(pass.visits[0]!.scheduledAt).toBe("2027-05-04T14:00:00Z")
    expect(pass).toMatchObject({ clientId: "c", cardLast4: "4242", status: "active", blowoutPreference: "later" })
  })
  it("carries what the visit's own line includes, and ignores another visit's line or a cancelled one", () => {
    const line = (id: string, visitId: string, description: string, cancelledAt: string | null = null) => ({ id, visitId, name: "Spring turn-on", description, quantity: 1, unitPrice: 145, taxable: false, cancelledAt })
    const pass = passFromApi(detail({ visits: [visit({ id: "t", lineItems: [line("l0", "b", "Blowout text"), line("l1", "t", "Old text", "2027-01-02T00:00:00Z"), line("l2", "t", "Controller programming and a walk of every zone.")] }), visit({ id: "b", kind: "blowout", lineItems: [] })] }))
    expect(pass.visits[0]!.description).toBe("Controller programming and a walk of every zone.")
    expect(pass.visits[1]).not.toHaveProperty("description")
  })
  it("prices a visit by the sum of its own live lines, and falls back to its amount with none", () => {
    const line = (id: string, unitPrice: number, cancelledAt: string | null = null, description: string | null = null) => ({ id, visitId: "t", name: "Spring turn-on", description, quantity: 1, unitPrice, taxable: false, cancelledAt })
    const pass = passFromApi(detail({ visits: [visit({ id: "t", amount: 145, lineItems: [line("l1", 145, null, "First text"), line("l2", 40, null, "Second text"), line("l3", 900, "2027-01-02T00:00:00Z")] }), visit({ id: "b", kind: "blowout", amount: 115, lineItems: [] })] }))
    expect(pass.visits[0]).toMatchObject({ amount: 185, description: "First text" })
    expect(pass.visits[1]!.amount).toBe(115)
  })
  it("maps cancelled and failed-card state", () => {
    const pass = passFromApi(detail({ status: "cancelled", cardFailedAt: "2027-06-01T00:00:00Z", needsCustomerHome: true }))
    expect(pass).toMatchObject({ status: "cancelled", cardFailedAt: "2027-06-01T00:00:00Z", needsCustomerHome: true })
  })
})
