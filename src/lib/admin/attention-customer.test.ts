import { describe, expect, it } from "vitest"
import { attention, type ShapeInput } from "./shape"

const input = (alerts: unknown[]) => ({ now: new Date("2027-04-10T18:00:00Z"), alerts, queueProblems: [], visits: [], dismissals: [], passes: [], customers: [], jobs: [], payments: [], invoices: [] }) as unknown as ShapeInput

describe("Home's row for a customer's own change", () => {
  it("names the visit from the alert key, so the row opens that visit, and carries the alert's words", () => {
    const rows = attention(input([{ kind: "customer-changed", key: "visit-1:cancelled:2027-04-10T15:00:00.000Z", message: "Andrea Smith canceled Spring turn-on, Wed, Apr 28, Erie. The day is free.", passId: "job-1", createdAt: new Date("2027-04-10T15:00:00Z") }]), [])
    expect(rows).toEqual([{ key: "visit-1:cancelled:2027-04-10T15:00:00.000Z", kind: "customer-changed", visitId: "visit-1", message: "Andrea Smith canceled Spring turn-on, Wed, Apr 28, Erie. The day is free.", since: "2027-04-10T15:00:00Z" }])
  })
})

describe("Home's row for paused texts", () => {
  it("keeps its own kind (not a task that needs a retry) and the alert's words", () => {
    const message = "Texts are paused until the number is registered with the carriers (Twilio error 30034). Every text goes by email instead."
    const rows = attention(input([{ kind: "texts-paused", key: "paused", message, passId: null, createdAt: new Date("2027-04-10T15:00:00Z") }]), [])
    expect(rows).toEqual([{ key: "paused", kind: "texts-paused", message, since: "2027-04-10T15:00:00Z" }])
  })
  it("stays off Home once the office dismissed it", () => {
    const i = { ...input([{ kind: "texts-paused", key: "paused", message: "m", passId: null, createdAt: new Date("2027-04-10T15:00:00Z") }]), dismissed: [{ kind: "texts-paused", key: "paused" }] } as unknown as ShapeInput
    expect(attention(i, [])).toEqual([])
describe("Home's row for a text that was not delivered", () => {
  const alert = (key: string) => ({ kind: "text-undelivered", key, message: "Text not delivered: Hannah, date set. Filtered by the carrier.", createdAt: new Date("2027-04-10T15:00:00Z") })
  it("opens the visit when the message had one", () => {
    expect(attention(input([alert("visit-1:c100:m1")]), [])).toEqual([{ key: "visit-1:c100:m1", kind: "text-undelivered", visitId: "visit-1", message: "Text not delivered: Hannah, date set. Filtered by the carrier.", since: "2027-04-10T15:00:00Z" }])
  })
  it("opens the customer when the message had no visit", () => {
    expect(attention(input([alert("-:c100:m2")]), [])).toEqual([{ key: "-:c100:m2", kind: "text-undelivered", customerId: "c100", message: "Text not delivered: Hannah, date set. Filtered by the carrier.", since: "2027-04-10T15:00:00Z" }])
  })
})
