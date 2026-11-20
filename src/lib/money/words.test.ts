import { describe, expect, it } from "vitest"
import { NO_TAX } from "@/lib/jobs/tax"
import { allocateJobPayments, isPaid, jobOwed, jobMoney, METHOD_WORDS, paidTotal, refundWord, visitMoney, type MoneyPayment } from "./words"

const line = (unitPrice: number, cancelledAt: Date | null = null) => ({ quantity: 1, unitPrice, taxable: false, cancelledAt })
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
    expect(jobOwed([line(145), line(115), line(80, new Date())], [pay({ amount: 145 })], NO_TAX)).toBe(115)
    expect(jobOwed([line(145)], [pay({ amount: 200 })], NO_TAX)).toBe(0)
  })
  it("owes again after a refund", () => {
    expect(jobOwed([line(145)], [pay(), pay({ id: "r", amount: -145, refundsPaymentId: "p" })], NO_TAX)).toBe(145)
  })
})

describe("allocateJobPayments", () => {
  const job = (over: Partial<MoneyPayment> = {}) => pay({ id: "bill", visitId: null, amount: 260, method: "card_now", ...over })
  const done = (id: string, price: number, doneOn: string, over: Record<string, unknown> = {}) => ({ id, done: true, price, doneOn, ...over })
  const amounts = (m: Map<string, MoneyPayment[]>) => Object.fromEntries([...m].map(([id, rows]) => [id, rows.map((r) => r.amount)]))

  it("credits a payment on the job to the done visits, the oldest first, each up to its price", () => {
    const out = allocateJobPayments([job()], [done("late", 115, "2027-05-09"), done("early", 145, "2027-05-02")])
    expect(amounts(out)).toEqual({ early: [145], late: [115] })
    expect(out.get("early")![0]).toMatchObject({ id: "bill@early", visitId: "early", method: "card_now", status: "succeeded" })
  })
  it("takes the visits a paid invoice names first, whatever their age", () => {
    const visits = [done("old", 145, "2027-05-01"), done("named", 145, "2027-06-01")]
    expect(amounts(allocateJobPayments([job({ amount: 145 })], visits, ["named"]))).toEqual({ named: [145] })
    expect(amounts(allocateJobPayments([job({ amount: 145 })], visits))).toEqual({ old: [145] })
  })
  it("leaves out a visit not done, a canceled one, and what its own rows already paid", () => {
    const visits = [done("paid", 145, "2027-05-01"), done("owed", 115, "2027-05-02"), { id: "ahead", done: false, price: 100 }, done("gone", 100, "2027-05-03", { cancelled: true })]
    const own = pay({ id: "own", visitId: "paid", amount: 145 })
    expect(amounts(allocateJobPayments([own, job({ amount: 500 })], visits))).toEqual({ owed: [115] })
  })
  it("never credits more than the payment, and counts a part payment against the oldest visit first", () => {
    expect(amounts(allocateJobPayments([job({ amount: 200 })], [done("a", 145, "2027-05-01"), done("b", 145, "2027-05-02")]))).toEqual({ a: [145], b: [55] })
  })
  it("takes a refund off the payment it names, or off the newest payment when it names none", () => {
    const visits = [done("a", 145, "2027-05-01"), done("b", 145, "2027-05-02")]
    const linked = allocateJobPayments([job({ amount: 290 }), job({ id: "r", amount: -145, refundsPaymentId: "bill" })], visits)
    expect(amounts(linked)).toEqual({ a: [145] })
    const unlinked = allocateJobPayments([job({ id: "p1", amount: 145 }), job({ id: "p2", amount: 145 }), job({ id: "r", amount: -145 })], visits)
    expect(amounts(unlinked)).toEqual({ a: [145] })
    expect(unlinked.get("a")![0]!.id).toBe("p1@a")
  })
  it("ignores a failed or pending payment and credits nothing to a job with no done visit", () => {
    expect(allocateJobPayments([job({ status: "failed" }), job({ id: "q", status: "pending" })], [done("a", 145, "2027-05-01")]).size).toBe(0)
    expect(allocateJobPayments([job()], [{ id: "a", done: false, price: 145 }]).size).toBe(0)
  })
})

describe("jobMoney for a Season Pass", () => {
  const visits = [{ id: "v1", price: 140 }, { id: "v2", price: 140 }]
  const pass = (doneVisitIds: string[]) => ({ doneVisitIds })
  it("is charged after each visit, not unpaid, until a visit is done", () => {
    expect(jobMoney([line(140), line(140)], [], visits, NO_TAX, undefined, [], pass([])).words).toBe("$280, charged after each visit")
  })
  it("reads unpaid once a done visit has not been paid, and charged-after again once it is", () => {
    expect(jobMoney([line(140), line(140)], [], visits.map((v) => ({ ...v, done: v.id === "v1" })), NO_TAX, undefined, [], pass(["v1"])).words).toBe("$280 unpaid")
    expect(jobMoney([line(140), line(140)], [pay({ amount: 140 })], visits.map((v) => ({ ...v, done: v.id === "v1" })), NO_TAX, undefined, [], pass(["v1"])).words).toBe("$140, charged after each visit")
  })
  it("leaves a job that is not a pass as it was, and Paid and Invoice sent as they were", () => {
    expect(jobMoney([line(280)], [], [{ id: "v1" }], NO_TAX).words).toBe("$280 unpaid")
    expect(jobMoney([line(140)], [pay({ amount: 140 })], [{ id: "v1", price: 140 }], NO_TAX, undefined, [], pass(["v1"])).words).toBe("Paid")
  })
})

describe("jobMoney", () => {
  const visits = [{ id: "v1" }, { id: "v2" }, { id: "v3" }]
  const lines = [line(145), line(115), line(115)]
  it("says Paid when nothing is unpaid", () => {
    expect(jobMoney([line(145)], [pay()], [{ id: "v1" }], NO_TAX)).toEqual({ paid: 145, total: 145, owed: 0, words: "Paid", billSent: false })
  })
  it("says the number owed when nothing is paid or the job has one visit", () => {
    expect(jobMoney([line(145)], [], [{ id: "v1" }], NO_TAX)).toMatchObject({ paid: 0, total: 145, owed: 145, words: "$145 unpaid" })
    expect(jobMoney([line(145)], [pay({ amount: 100 })], [{ id: "v1" }], NO_TAX).words).toBe("$45 unpaid")
  })
  it("says how many visits are paid when a job has several and some are", () => {
    expect(jobMoney(lines, [pay({ visitId: "v1" })], visits, NO_TAX)).toEqual({ paid: 145, total: 375, owed: 230, words: "1 of 3 paid, $230 unpaid", billSent: false })
    expect(jobMoney([line(145), line(115), line(145)], [pay({ visitId: "v1" }), pay({ id: "q", visitId: "v2", amount: 115 })], visits, NO_TAX).words).toBe("2 of 3 paid, $145 unpaid")
  })
  it("does not count a canceled visit, and a refunded visit is not paid", () => {
    const some = [{ id: "v1" }, { id: "v2" }, { id: "v3", cancelled: true }]
    expect(jobMoney([line(145), line(115), line(115, new Date())], [pay({ visitId: "v1" })], some, NO_TAX).words).toBe("1 of 2 paid, $115 unpaid")
    expect(jobMoney(lines, [pay({ visitId: "v1" }), pay({ id: "r", visitId: "v1", amount: -145, refundsPaymentId: "p" })], visits, NO_TAX).words).toBe("$375 unpaid")
  })
  it("says nothing for a job with no price and no payment", () => {
    expect(jobMoney([], [], [], NO_TAX).words).toBe("")
  })
  it("does not count a part-paid visit as paid once the visits carry their prices", () => {
    const priced = [{ id: "v1", price: 145 }, { id: "v2", price: 115 }, { id: "v3", price: 115 }]
    // v1 paid in full, v2 part-paid: one of three paid, not two
    expect(jobMoney(lines, [pay({ visitId: "v1" }), pay({ id: "q", visitId: "v2", amount: 40 })], priced, NO_TAX)).toMatchObject({ paid: 185, owed: 190, words: "1 of 3 paid, $190 unpaid" })
    expect(jobMoney(lines, [pay({ visitId: "v2", amount: 40 })], priced, NO_TAX).words).toBe("$335 unpaid")
    // a visit with no price given still counts any positive payment, as before
    expect(jobMoney(lines, [pay({ visitId: "v2", amount: 40 })], visits, NO_TAX).words).toBe("1 of 3 paid, $335 unpaid")
  })
  it("counts a visit paid by a payment on the job as a whole, and the job's paid total once", () => {
    const priced = [{ id: "v1", price: 145, done: true, doneOn: "2027-05-01" }, { id: "v2", price: 115, done: true, doneOn: "2027-05-02" }, { id: "v3", price: 115, done: false }]
    const bill = pay({ id: "bill", visitId: null, amount: 145, method: "card_now" })
    expect(jobMoney(lines, [bill], priced, NO_TAX)).toMatchObject({ paid: 145, owed: 230, words: "1 of 3 paid, $230 unpaid" })
    expect(jobMoney(lines, [pay({ id: "bill", visitId: null, amount: 260 })], priced, NO_TAX)).toMatchObject({ paid: 260, owed: 115, words: "2 of 3 paid, $115 unpaid" })
  })
  it("says Invoice sent while the job owes money and an invoice is open, even past its due day, and Owed again once the invoice is canceled", () => {
    expect(jobMoney([line(145)], [], [{ id: "v1" }], NO_TAX, {})).toEqual({ paid: 0, total: 145, owed: 145, words: "Invoice sent", billSent: true })
    expect(jobMoney([line(145)], [], [{ id: "v1" }], NO_TAX, { paidOn: null, cancelledAt: null }).words).toBe("Invoice sent")
    expect(jobMoney([line(145)], [], [{ id: "v1" }], NO_TAX, { cancelledAt: new Date() })).toMatchObject({ words: "$145 unpaid", billSent: false })
    expect(jobMoney([line(145)], [], [{ id: "v1" }], NO_TAX, { paidOn: "2027-05-01" }).words).toBe("$145 unpaid")
  })
  it("says Paid, not Invoice sent, once the job's money has arrived whatever the invoice says", () => {
    expect(jobMoney([line(145)], [pay()], [{ id: "v1" }], NO_TAX, {})).toMatchObject({ words: "Paid", billSent: false })
  })
})

describe("visitMoney", () => {
  const done = { id: "v1", done: true }
  it("is not-yet until the visit is done, and for a canceled one", () => {
    expect(visitMoney({ id: "v1", done: false }, [], undefined)).toEqual({ state: "not-yet", label: "" })
    expect(visitMoney({ id: "v1", done: true, cancelled: true }, [], undefined).state).toBe("not-yet")
  })
  it("is paid with how it came", () => {
    expect(visitMoney(done, [pay({ method: "venmo" })], undefined)).toEqual({ state: "paid", label: "Paid, Venmo" })
    expect(visitMoney(done, [pay({ method: "card_on_file" })], undefined).label).toBe("Paid, card")
  })
  it("is unpaid once done with no payment, failed when the newest row failed, bill-sent when an open invoice covers it", () => {
    expect(visitMoney(done, [], undefined)).toEqual({ state: "owed", label: "Unpaid" })
    expect(visitMoney(done, [pay({ status: "failed", method: "card_on_file" })], undefined)).toEqual({ state: "failed", label: "Failed" })
    expect(visitMoney({ ...done, cardFailed: true }, [], undefined).state).toBe("failed")
    expect(visitMoney(done, [], { paidOn: null, cancelledAt: null })).toEqual({ state: "bill-sent", label: "Invoice sent" })
    expect(visitMoney(done, [], { paidOn: "2027-04-01", cancelledAt: null }).state).toBe("owed")
  })
  it("is unpaid again after the payment is refunded", () => {
    expect(visitMoney(done, [pay(), pay({ id: "r", amount: -145, refundsPaymentId: "p" })], undefined).state).toBe("owed")
  })
  it("is unpaid, not paid, while only part of the price has arrived, and paid once the rest does", () => {
    expect(visitMoney({ ...done, price: 145 }, [pay({ amount: 100 })], undefined)).toEqual({ state: "owed", label: "Unpaid" })
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
    expect(METHOD_WORDS).toMatchObject({ card_on_file: "card", card_now: "card", check: "check", venmo: "Venmo", cash: "cash", bill: "invoice" })
  })
})

describe("refundWord", () => {
  const row = (amount: number, status: "succeeded" | "failed" = "succeeded") => ({ amount, status })
  it("reads Refunded when the payments net to zero after a refund", () => {
    expect(refundWord([row(145), row(-145)])).toBe("Refunded")
  })
  it("reads Paid with the amount refunded when some stays paid", () => {
    expect(refundWord([row(145), row(-50)])).toBe("Paid, $50 refunded")
  })
  it("says nothing when nothing was refunded", () => {
    expect(refundWord([row(145)])).toBeNull()
    expect(refundWord([row(145), row(-145, "failed")])).toBeNull()
  })
})
