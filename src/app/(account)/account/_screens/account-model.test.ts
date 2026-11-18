import { describe, expect, it } from "vitest"
import { invoicedJob, partPaidJob, passJob, pastDueJob, repairJob, TODAY } from "./account-fixtures"
import { jobMoneyWord, nextVisit, openInvoices, visitLists, visitsLineOf, visitsToOffer } from "./account-model"

const jobs = [passJob, repairJob, invoicedJob]

describe("nextVisit", () => {
  it("is the earliest booked visit from today on", () => {
    expect(nextVisit(jobs, TODAY)?.visit.id).toBe("v1")
  })
  it("is the first visit still waiting for a day when nothing is booked ahead", () => {
    expect(nextVisit(jobs, "2027-05-01")?.visit.id).toBe("v2")
  })
  it("is null for a customer with only done work", () => {
    expect(nextVisit([repairJob, invoicedJob], TODAY)).toBeNull()
  })
  it("leaves a canceled job's visits out", () => {
    expect(nextVisit([{ ...passJob, canceled: true }], TODAY)).toBeNull()
  })
})

describe("visitLists", () => {
  it("puts booked days and the visit waiting for a day under Coming up, and done work under Past", () => {
    const { comingUp, past } = visitLists(jobs, TODAY)
    expect(comingUp.map((x) => x.visit.id)).toEqual(["v1", "v2"])
    expect(past.map((x) => x.visit.id)).toEqual(["v4", "v3"])
  })
  it("moves a booked day that has gone by to Past", () => {
    expect(visitLists([passJob], "2027-05-02").past.map((x) => x.visit.id)).toEqual(["v1"])
  })
})

describe("openInvoices", () => {
  it("lists the invoices to pay, oldest due day first, each with its pay link", () => {
    const list = openInvoices([invoicedJob, pastDueJob, repairJob])
    expect(list.map((i) => [i.id, i.status])).toEqual([["inv_2", "overdue"], ["inv_1", "sent"]])
    expect(list[0]!.payHref).toBe("/pay/inv_2?token=def")
  })
  it("does not count a paid invoice", () => {
    expect(openInvoices([{ ...invoicedJob, invoices: [{ ...invoicedJob.invoices[0]!, status: "paid", paidOn: "2027-03-25", payUrl: null }] }])).toEqual([])
  })
})

describe("job words", () => {
  it("reads the money word of each kind of job", () => {
    expect(jobMoneyWord(repairJob)).toEqual({ tone: "paid", label: "Paid" })
    expect(jobMoneyWord(invoicedJob).label).toBe("Invoice sent, due Dec 1")
    expect(jobMoneyWord(pastDueJob).label).toBe("Past due since Apr 1")
    expect(jobMoneyWord(partPaidJob).label).toBe("$65 unpaid")
  })
  it("counts the live visits", () => {
    expect(visitsLineOf(passJob)).toBe("2 visits")
    expect(visitsLineOf(repairJob)).toBe("1 visit")
    expect(visitsLineOf({ ...repairJob, visits: [] })).toBeUndefined()
  })
  it("asks for days only for the visits the customer may change online", () => {
    const { comingUp } = visitLists(jobs, TODAY)
    expect(visitsToOffer(comingUp)).toEqual(["v1", "v2"])
  })
})
