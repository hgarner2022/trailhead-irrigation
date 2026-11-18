import { describe, expect, it } from "vitest"
import { dayParts, windowPhrase, customerFacingFirstName, longDay, visitDay, visitDayWords, moneyWord, paymentLine, shortDay, visitPill } from "./words"

describe("windowPhrase", () => {
  it("says the window in the customer's words", () => {
    expect(windowPhrase("09:00")).toBe("between 9 and 11 am")
    expect(windowPhrase("11:00")).toBe("between 11 am and 1 pm")
    expect(windowPhrase("13:30")).toBe("between 1:30 and 3:30 pm")
  })
  it("says nothing before a start time is set", () => {
    expect(windowPhrase(null)).toBeNull()
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
    expect(visitPill({ status: "skipped" }).label).toBe("Canceled")
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

describe("visitDay and visitDayWords", () => {
  const done = { status: "completed", scheduledOn: "2027-04-27", completedOn: "2026-11-17" }
  it("reads a done visit by the day it was done, not the day it was scheduled for", () => {
    expect(visitDay(done)).toBe("2026-11-17")
    expect(visitDayWords(done, "2026-11-18")).toBe("Tuesday, November 17")
  })
  it("falls back to the scheduled day for a done visit with no done-on day", () => {
    expect(visitDay({ status: "completed", scheduledOn: "2026-11-03", completedOn: null })).toBe("2026-11-03")
  })
  it("reads a visit that is not done by its scheduled day, and a visit with no day as null", () => {
    expect(visitDay({ status: "scheduled", scheduledOn: "2026-11-20", completedOn: null })).toBe("2026-11-20")
    expect(visitDayWords({ status: "unscheduled", scheduledOn: null, completedOn: null }, "2026-11-18")).toBeNull()
  })
  it("shows the year when the day is in another year than today, and not otherwise", () => {
    expect(visitDayWords({ status: "scheduled", scheduledOn: "2027-04-27", completedOn: null }, "2026-11-18")).toBe("Tuesday, April 27, 2027")
    expect(visitDayWords({ status: "completed", scheduledOn: "2026-11-03", completedOn: "2026-11-03" }, "2027-01-05")).toBe("Tuesday, November 3, 2026")
    expect(visitDayWords({ status: "scheduled", scheduledOn: "2026-11-20", completedOn: null }, "2026-11-18")).toBe("Friday, November 20")
  })
})

describe("dayParts", () => {
  const base = { status: "scheduled", scheduledOn: "2027-05-05", completedOn: null, canceledOn: null, windowTold: false, window: null, personFirstName: null as string | null, canPick: false }
  it("promises the window until the day-before text told it, then gives it with who is coming", () => {
    expect(dayParts(base, "2027-04-20").sentence).toBe("Wednesday, May 5. We'll text your window the day before.")
    expect(dayParts({ ...base, windowTold: true, window: "between 8 and 10 am", personFirstName: "Ryan" }, "2027-04-20")).toMatchObject({ heading: "Wednesday, May 5", detail: "Between 8 and 10 am, with Ryan.", sentence: "Wednesday, May 5, between 8 and 10 am, with Ryan." })
  })
  it("told but with no start time (a visit left at Any time) names the day and who, never promises a window again", () => {
    expect(dayParts({ ...base, windowTold: true, personFirstName: "Ryan" }, "2027-04-20").sentence).toBe("Wednesday, May 5. Ryan will be there that day.")
    expect(dayParts({ ...base, windowTold: true }, "2027-04-20").sentence).toBe("Wednesday, May 5. We'll be there that day.")
  })
})
