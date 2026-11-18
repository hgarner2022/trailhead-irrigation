import { describe, expect, it } from "vitest"
import { portalVisitMoney } from "./visit-money"

const visit = (id: string, over: Partial<{ status: string; completedOn: string | null; price: number }> = {}) => ({ id, status: "completed", completedOn: "2027-03-10", price: 145, ...over })
const pay = (id: string, visitId: string | null, amount: number, over: Record<string, unknown> = {}) => ({ id, visitId, amount, method: "card_on_file", status: "succeeded", ...over })

describe("portalVisitMoney", () => {
  it("is Paid, with the payment that paid it, once the visit's own rows cover its price", () => {
    const out = portalVisitMoney([visit("a")], [pay("p1", "a", 145)], undefined, [])
    expect(out.get("a")).toEqual({ tone: "paid", label: "Paid", paymentIds: ["p1"] })
  })

  it("is '$65 unpaid' on a part-paid done visit, with the payment that went toward it", () => {
    const out = portalVisitMoney([visit("a")], [pay("p1", "a", 80, { method: "check" })], undefined, [])
    expect(out.get("a")).toEqual({ tone: "unpaid", label: "$65 unpaid", paymentIds: ["p1"] })
  })

  it("says Invoice sent, due Dec 1 on the visits an open invoice covers, and Past due since once it is late", () => {
    const covers = { dueOn: "2027-12-01", status: "sent" as const, visitIds: ["a"] }
    expect(portalVisitMoney([visit("a")], [], covers, []).get("a")).toMatchObject({ tone: "invoice-sent", label: "Invoice sent, due Dec 1" })
    expect(portalVisitMoney([visit("a")], [], { ...covers, dueOn: "2027-04-01", status: "overdue" }, []).get("a")).toMatchObject({ tone: "past-due", label: "Past due since Apr 1" })
    // a visit the invoice does not name reads unpaid, not invoiced
    expect(portalVisitMoney([visit("a"), visit("b")], [], covers, []).get("b")).toMatchObject({ tone: "unpaid", label: "$145 unpaid" })
  })

  it("credits a payment made on the job as a whole (a paid invoice) to the oldest done visit first, and gives its receipt to that visit", () => {
    const out = portalVisitMoney([visit("a", { completedOn: "2027-03-10" }), visit("b", { completedOn: "2027-03-20" })], [pay("p1", null, 145, { method: "card_now" })], undefined, [])
    expect(out.get("a")).toEqual({ tone: "paid", label: "Paid", paymentIds: ["p1"] })
    expect(out.get("b")).toMatchObject({ tone: "unpaid", paymentIds: [] })
  })

  it("says nothing for a visit not done and unpaid, and ignores a payment that failed", () => {
    const out = portalVisitMoney([visit("a", { status: "scheduled", completedOn: null }), visit("b")], [pay("p2", "b", 145, { status: "failed" })], undefined, [])
    expect(out.get("a")).toEqual({ tone: "none", label: "", paymentIds: [] })
    expect(out.get("b")).toMatchObject({ tone: "unpaid", label: "$145 unpaid", paymentIds: [] })
  })

  it("keeps Paid on a canceled visit that holds money, and says nothing for one that holds none", () => {
    const out = portalVisitMoney([visit("a", { status: "cancelled", price: 0 }), visit("b", { status: "cancelled", price: 0 })], [pay("p1", "a", 145)], undefined, [])
    expect(out.get("a")).toMatchObject({ tone: "paid" })
    expect(out.get("b")).toEqual({ tone: "none", label: "", paymentIds: [] })
  })
})
