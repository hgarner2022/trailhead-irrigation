import { describe, expect, it } from "vitest"
import { arrivalWindow, customerFacingFirstName, longDay, moneyWord, paymentLine, shortDay, visitPill } from "./words"

describe("arrivalWindow", () => {
  it("says the window in the customer's words", () => {
    expect(arrivalWindow("09:00", 120)).toBe("Arrive between 9 and 11 am")
    expect(arrivalWindow("11:00", null)).toBe("Arrive between 11 am and 1 pm")
    expect(arrivalWindow("13:30", 120)).toBe("Arrive between 1:30 and 3:30 pm")
  })
  it("says nothing before a start time is set", () => {
    expect(arrivalWindow(null)).toBeNull()
  })
})

describe("days", () => {
  it("writes a day long and short", () => {
    expect(longDay("2027-05-05")).toBe("Wednesday, May 5")
    expect(shortDay("2027-04-28")).toBe("Wed, Apr 28")
  })
})

describe("visitPill", () => {
  it("uses the customer's words for every state", () => {
    expect(visitPill({ status: "scheduled" })).toEqual({ status: "scheduled", label: "Booked" })
    expect(visitPill({ status: "completed" }).label).toBe("Done")
    expect(visitPill({ status: "cancelled" }).label).toBe("Canceled")
    expect(visitPill({ status: "skipped" }).label).toBe("Skipped")
    expect(visitPill({ status: "unscheduled", canPick: true }).label).toBe("Pick a day")
    expect(visitPill({ status: "unscheduled", canPick: false }).label).toBe("Day coming soon")
    expect(visitPill({ status: "unscheduled", notDoneReason: "no water on", canPick: true }).label).toBe("Needs a new day")
  })
})

describe("moneyWord", () => {
  it("reads Paid, unpaid, invoice sent and past due", () => {
    expect(moneyWord({ owed: 0, words: "Paid" })).toEqual({ tone: "paid", label: "Paid" })
    expect(moneyWord({ owed: 145, words: "$145 unpaid" })).toEqual({ tone: "unpaid", label: "$145 unpaid" })
    expect(moneyWord({ owed: 115, words: "Invoice sent", invoice: { dueOn: "2027-12-01", status: "sent" } }).label).toBe("Invoice sent, due Dec 1")
    expect(moneyWord({ owed: 115, words: "Invoice sent", invoice: { dueOn: "2027-12-01", status: "overdue" } })).toEqual({ tone: "past-due", label: "Past due since Dec 1" })
    expect(moneyWord({ owed: 0, words: "" }).tone).toBe("none")
  })
})

describe("paymentLine", () => {
  it("names the day, how and the amount", () => {
    expect(paymentLine({ amount: 145, method: "card_on_file", paidOn: "2027-11-03" })).toBe("Paid Nov 3, card $145")
    expect(paymentLine({ amount: 80, method: "check", paidOn: null })).toBe("Paid, check $80")
    expect(paymentLine({ amount: -145, method: "card_on_file", paidOn: "2027-11-05" })).toBe("Refunded Nov 5, card $145")
  })
})

describe("customerFacingFirstName", () => {
  it("is the first name of a person with a first and a last name", () => {
    expect(customerFacingFirstName("Ryan Garner")).toBe("Ryan")
    expect(customerFacingFirstName("  Tech   Two ")).toBe("Tech")
  })
  it("is nothing for a one-word name, so the visit reads without a person", () => {
    expect(customerFacingFirstName("Second")).toBeNull()
    expect(customerFacingFirstName("Ryan")).toBeNull()
  })
  it("is nothing for a label such as a truck, however many words it has", () => {
    expect(customerFacingFirstName("Second truck")).toBeNull()
    expect(customerFacingFirstName("Truck 2")).toBeNull()
    expect(customerFacingFirstName("Crew TRUCK one")).toBeNull()
  })
  it("is nothing for no person or a blank name", () => {
    expect(customerFacingFirstName(null)).toBeNull()
    expect(customerFacingFirstName(undefined)).toBeNull()
    expect(customerFacingFirstName("   ")).toBeNull()
  })
})
