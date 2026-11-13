import { describe, expect, it } from "vitest"
import type { z } from "zod"
import type { PassDetail } from "@/api/v1/passes/schemas"
import { passFromApi } from "./pass-from-api"

const visit = (over: Record<string, unknown>) => ({ id: "v", passId: "p", bookingId: null, customerId: "c", firstName: "Andrea", town: "Erie", kind: "turn-on", status: "unscheduled", window: "May", amount: 145, preference: null, awaitingPick: false, truckId: null, truckName: null, scheduledOn: null, startTime: null, durationMinutes: null, stopOrder: null, confirmedAt: null, completedOn: null, chargedAt: null, exception: null, jobberRequestUrl: null, lat: null, lng: null, ...over })
const detail = (over: Record<string, unknown> = {}) =>
  ({ id: "p", number: "TH-2027-0001", season: 2027, customerId: "c", propertyId: "pr", firstName: "Andrea", town: "Erie", zones: 8, inspection: false, status: "active", turnOnPreference: "recommended", blowoutPreference: "later", needsCustomerHome: false, cardBrand: "visa", cardLast4: "4242", cardExpires: "2028-08", cardFailedAt: null, cancelledAt: null, createdAt: "2027-01-01T00:00:00Z", charges: [], consent: null, price: 260, visits: [], ...over }) as unknown as z.infer<typeof PassDetail>

describe("passFromApi", () => {
  it("orders the visits, drops cancelled and skipped ones and carries date and truck", () => {
    const pass = passFromApi(detail({ visits: [visit({ id: "b", kind: "blowout", window: "October" }), visit({ id: "i", kind: "inspection", status: "skipped" }), visit({ id: "t", status: "scheduled", scheduledOn: "2027-05-04", startTime: "08:00", truckName: "Truck 1" })] }))
    expect(pass.visits.map((v) => v.kind)).toEqual(["turn-on", "blowout"])
    expect(pass.visits[0]).toMatchObject({ truckName: "Truck 1", window: "May" })
    expect(pass.visits[0]!.scheduledAt).toBe("2027-05-04T14:00:00Z")
    expect(pass).toMatchObject({ clientId: "c", cardLast4: "4242", status: "active", blowoutPreference: "later" })
  })
  it("maps cancelled and failed-card state", () => {
    const pass = passFromApi(detail({ status: "cancelled", cardFailedAt: "2027-06-01T00:00:00Z", needsCustomerHome: true }))
    expect(pass).toMatchObject({ status: "cancelled", cardFailedAt: "2027-06-01T00:00:00Z", needsCustomerHome: true })
  })
})
