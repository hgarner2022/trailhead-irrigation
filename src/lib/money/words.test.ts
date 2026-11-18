import { describe, expect, it } from "vitest"
import { isPaid, jobOwed, jobMoney, METHOD_WORDS, paidTotal, visitMoney, type MoneyPayment } from "./words"

const line = (unitPrice: number, cancelledAt: Date | null = null) => ({ quantity: 1, unitPrice, cancelledAt })
const pay = (over: Partial<MoneyPayment> = {}): MoneyPayment => ({ id: "p", visitId: "v1", amount: 145, method: "cash", status: "succeeded", ...over })

describe("paidTotal", () => {
  it("adds the succeeded rows, refunds as negatives, and leaves pending and failed rows out", () => {
    expect(paidTotal([pay({ amount: 145 }), pay({ id: "r", amount: -45, refundsPaymentId: "p" }), pay({ amount: 99, status: "failed" }), pay({ amount: 50, status: "pending" })])).toBe(100)
    expect(paidTotal([])).toBe(0)
  })
})

describe("isPaid", () => {
  it("is paid once the rows reach the price, and not before", () => {
    expect(isPaid([pay({ amount: 145 })], 145)).toBe(true)
    expect(isPaid([pay({ amount: 100 })], 145)).toBe(false)
    expect(isPaid([pay({ amount: 100 }), pay({ id: "q", amount: 45 })], 145)).toBe(true)
    expect(isPaid([pay({ amount: 145 }), pay({ id: "r", amount: -45, refundsPaymentId: "p" })], 145)).toBe(false)
  })
  it("takes any positive payment for a visit nothing has priced, and never for nothing paid", () => {
    expect(isPaid([pay({ amount: 60 })], undefined)).toBe(true)
    expect(isPaid([pay({ amount: 60 })], 0)).toBe(true)
    expect(isPaid([], 0)).toBe(false)
    expect(isPaid([pay({ amount: 145, status: "failed" })], 145)).toBe(false)
  })
})

describe("jobOwed", () => {
  it("is the live lines minus what was paid, never below zero", () => {
    expect(jobOwed([line(145), line(115), line(80, new Date())], [pay({ amount: 145 })])).toBe(115)
    expect(jobOwed([line(145)], [pay({ amount: 200 })])).toBe(0)
  })
  it("owes again after a refund", () => {
    expect(jobOwed([line(145)], [pay(), pay({ id: "r", amount: -145, refundsPaymentId: "p" })])).toBe(145)
  })
})

describe("jobMoney", () => {
  const visits = [{ id: "v1" }, { id: "v2" }, { id: "v3" }]
  const lines = [line(145), line(115), line(115)]
  it("says Paid when nothing is owed", () => {
    expect(jobMoney([line(145)], [pay()], [{ id: "v1" }])).toEqual({ paid: 145, total: 145, owed: 0, words: "Paid" })
  })
  it("says the number owed when nothing is paid or the job has one visit", () => {
    expect(jobMoney([line(145)], [], [{ id: "v1" }])).toMatchObject({ paid: 0, total: 145, owed: 145, words: "$145 owed" })
    expect(jobMoney([line(145)], [pay({ amount: 100 })], [{ id: "v1" }]).words).toBe("$45 owed")
  })
  it("says how many visits are paid when a job has several and some are", () => {
    expect(jobMoney(lines, [pay({ visitId: "v1" })], visits)).toEqual({ paid: 145, total: 375, owed: 230, words: "1 of 3 paid, $230 owed" })
    expect(jobMoney([line(145), line(115), line(145)], [pay({ visitId: "v1" }), pay({ id: "q", visitId: "v2", amount: 115 })], visits).words).toBe("2 of 3 paid, $145 owed")
  })
  it("does not count a cancelled visit, and a refunded visit is not paid", () => {
    const some = [{ id: "v1" }, { id: "v2" }, { id: "v3", cancelled: true }]
    expect(jobMoney([line(145), line(115), line(115, new Date())], [pay({ visitId: "v1" })], some).words).toBe("1 of 2 paid, $115 owed")
    expect(jobMoney(lines, [pay({ visitId: "v1" }), pay({ id: "r", visitId: "v1", amount: -145, refundsPaymentId: "p" })], visits).words).toBe("$375 owed")
  })
  it("says nothing for a job with no price and no payment", () => {
    expect(jobMoney([], [], []).words).toBe("")
  })
})

describe("visitMoney", () => {
  const done = { id: "v1", done: true }
  it("is not-yet until the visit is done, and for a cancelled one", () => {
    expect(visitMoney({ id: "v1", done: false }, [], undefined)).toEqual({ state: "not-yet", label: "" })
    expect(visitMoney({ id: "v1", done: true, cancelled: true }, [], undefined).state).toBe("not-yet")
  })
  it("is paid with how it came", () => {
    expect(visitMoney(done, [pay({ method: "venmo" })], undefined)).toEqual({ state: "paid", label: "Paid, Venmo" })
    expect(visitMoney(done, [pay({ method: "card_on_file" })], undefined).label).toBe("Paid, card")
  })
  it("is owed once done with no payment, failed when the newest row failed, bill-sent when an open invoice covers it", () => {
    expect(visitMoney(done, [], undefined)).toEqual({ state: "owed", label: "Owed" })
    expect(visitMoney(done, [pay({ status: "failed", method: "card_on_file" })], undefined)).toEqual({ state: "failed", label: "Failed" })
    expect(visitMoney({ ...done, cardFailed: true }, [], undefined).state).toBe("failed")
    expect(visitMoney(done, [], { paidOn: null, cancelledAt: null })).toEqual({ state: "bill-sent", label: "Bill sent" })
    expect(visitMoney(done, [], { paidOn: "2027-04-01", cancelledAt: null }).state).toBe("owed")
  })
  it("is owed again after the payment is refunded", () => {
    expect(visitMoney(done, [pay(), pay({ id: "r", amount: -145, refundsPaymentId: "p" })], undefined).state).toBe("owed")
  })
  it("is owed, not paid, while only part of the price has arrived, and paid once the rest does", () => {
    expect(visitMoney({ ...done, price: 145 }, [pay({ amount: 100 })], undefined)).toEqual({ state: "owed", label: "Owed" })
    expect(visitMoney({ ...done, price: 145 }, [pay({ amount: 100 }), pay({ id: "q", amount: 45, method: "check" })], undefined)).toEqual({ state: "paid", label: "Paid, check" })
    expect(visitMoney({ ...done, price: 145 }, [pay({ amount: 100 })], { paidOn: null, cancelledAt: null }).state).toBe("bill-sent")
    expect(visitMoney({ ...done, price: 0 }, [pay({ amount: 60 })], undefined).state).toBe("paid")
  })
  it("still shows the money on a visit paid and then cancelled or skipped, and nothing when nothing was paid", () => {
    expect(visitMoney({ id: "v1", done: false, cancelled: true }, [pay({ method: "check" })], undefined)).toEqual({ state: "paid", label: "Paid, check" })
    expect(visitMoney({ id: "v1", done: true, cancelled: true }, [pay(), pay({ id: "r", amount: -145, refundsPaymentId: "p" })], undefined).state).toBe("not-yet")
  })
})

describe("METHOD_WORDS", () => {
  it("names how money came", () => {
    expect(METHOD_WORDS).toMatchObject({ card_on_file: "card", card_now: "card", check: "check", venmo: "Venmo", cash: "cash", bill: "bill" })
  })
})
