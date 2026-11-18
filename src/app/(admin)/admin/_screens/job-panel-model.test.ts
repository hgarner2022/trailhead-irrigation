import { describe, expect, it } from "vitest"
import { jobFacts, paymentWords } from "./job-panel-model"
import { footerPlan, nextVisitOf } from "./job-footer-model"
import { JOBS_TODAY, billedJobId, cancelledLineJobId, jobsData, ownedJobId, paidJobId, passJobId } from "./jobs-fixture"

const facts = (id: string) => jobFacts(jobsData, id, JOBS_TODAY)!

describe("jobFacts", () => {
  it("answers nothing for a job that is not in the data", () => {
    expect(jobFacts(jobsData, "nope", JOBS_TODAY)).toBeUndefined()
  })

  it("heads the panel with the job and when it was sold", () => {
    expect(facts(billedJobId).heading).toBe("Repair · sold Oct 28")
    expect(facts(passJobId).heading).toBe("Season Pass TH-2027-0014 · 2027")
  })

  it("lets a manager change the lines of an open one-off job and no one else's", () => {
    expect(facts(cancelledLineJobId).canEditLines).toBe(true)
    expect(facts(ownedJobId).canEditLines).toBe(true)
    expect(facts(paidJobId).canEditLines).toBe(false)
    expect(facts(passJobId).canEditLines).toBe(false)
  })

  it("offers Record the payment while something is unpaid and a visit on a one-off job", () => {
    expect(facts(ownedJobId)).toMatchObject({ canRecord: true, canAddVisit: true })
    expect(facts(billedJobId).canRecord).toBe(true)
    // a deposit can be taken before the work is done; a pass is charged to its card, so not before its money is due
    expect(facts(cancelledLineJobId).canRecord).toBe(true)
    expect(facts(passJobId).canRecord).toBe(false)
    expect(facts(paidJobId).canRecord).toBe(false)
    expect(facts(passJobId)).toMatchObject({ canAddVisit: false })
  })

  it("lets a manager cancel a one-off job that is still being worked, and says what money it holds", () => {
    // open with a deposit paid, open with nothing paid, a quote still to give
    expect(facts(cancelledLineJobId)).toMatchObject({ canCancel: true, held: 500 })
    expect(facts("job-a")).toMatchObject({ canCancel: true, held: 0 })
    expect(facts("job-b").canCancel).toBe(true)
    // a Season Pass has Cancel pass; a Done job is Done
    expect(facts(passJobId).canCancel).toBe(false)
    expect(facts(ownedJobId).canCancel).toBe(false)
    expect(facts(paidJobId).canCancel).toBe(false)
  })

  it("offers Send an invoice for a done job that is unpaid and has none out, and shows the invoice that is out", () => {
    expect(facts(ownedJobId).bill.canSend).toBe(true)
    expect(facts(billedJobId).bill).toMatchObject({ canSend: false, invoice: { number: "INV-2026-0001" } })
    expect(facts(paidJobId).bill.canSend).toBe(false)
  })

  it("lists the payments newest first and the visits in day order", () => {
    const f = facts(cancelledLineJobId)
    expect(f.payments).toHaveLength(1)
    expect(facts(passJobId).visits.length).toBe(2)
  })
})

describe("jobFacts, the sales tax on the lines", () => {
  const taxed = (rule: { collectsSalesTax: boolean; salesTaxPercent: number } | undefined) => ({
    ...jobsData,
    ...(rule ? { billing: rule } : {}),
    jobs: jobsData.jobs!.map((j) => (j.id === ownedJobId ? { ...j, lines: j.lines!.map((l) => ({ ...l, taxable: true })) } : j)),
  })
  const taxOf = (data: typeof jobsData) => jobFacts(data, ownedJobId, JOBS_TODAY)!.tax

  it("has no tax while the data carries no rule, or the switch is off, whatever the lines say", () => {
    expect(taxOf(taxed(undefined))).toBe(0)
    expect(taxOf(taxed({ collectsSalesTax: false, salesTaxPercent: 8 }))).toBe(0)
  })

  it("adds up the tax of the live taxable lines when the switch is on, so the panel can show one Tax line above zero", () => {
    const live = jobsData.jobs!.find((j) => j.id === ownedJobId)!.lines!.filter((l) => !l.cancelledAt)
    const expected = live.reduce((sum, l) => sum + Math.round((l.quantity * l.unitPrice * 8) / 100), 0)
    expect(expected).toBeGreaterThan(0)
    expect(taxOf(taxed({ collectsSalesTax: true, salesTaxPercent: 8 }))).toBe(expected)
  })
})

describe("paymentWords", () => {
  it("says how the money came and its reference, and a refund says so", () => {
    expect(paymentWords({ method: "check", reference: "1042", amount: 145 })).toBe("Check 1042")
    expect(paymentWords({ method: "venmo", reference: "@dana", amount: 50 })).toBe("Venmo @dana")
    expect(paymentWords({ method: "cash", reference: null, amount: 20 })).toBe("Cash")
    expect(paymentWords({ method: "card_on_file", reference: null, amount: 145 })).toBe("Card")
    expect(paymentWords({ method: "check", reference: null, amount: -145 })).toBe("Refund, Check")
  })
})

describe("footerPlan: the next step is the primary", () => {
  it("a scheduled job leads with Open visit, for the visit that is next", () => {
    expect(footerPlan(facts("job-a"), true)).toEqual({ primary: "open-visit", nextVisitId: "office-scheduled" })
    // money owed and a visit still ahead: the visit leads, never Record the payment
    const owing = { ...facts("job-a"), canRecord: true }
    expect(footerPlan(owing, true).primary).toBe("open-visit")
  })

  it("a job with a visit still waiting for its day opens that visit, unless it still needs a quote", () => {
    const unpriced = facts("job-b")
    expect(footerPlan(unpriced, true)).toEqual({ primary: "add-line" })
    expect(footerPlan({ ...unpriced, row: { ...unpriced.row, stage: "open" } }, true)).toEqual({ primary: "open-visit", nextVisitId: "office-needs-day" })
  })

  it("a done job that is unpaid collects the payment, with or without an invoice out: the invoice and the check are choices inside Collect", () => {
    expect(footerPlan(facts(ownedJobId), true)).toEqual({ primary: "collect" })
    const billed = facts(billedJobId)
    expect(billed.bill.invoice).toBeDefined()
    expect(footerPlan(billed, true)).toEqual({ primary: "collect" })
  })

  it("a done and paid job has no primary", () => {
    expect(footerPlan(facts(paidJobId), true)).toEqual({ primary: null })
  })

  it("a job that needs a quote leads with Add a line", () => {
    const quote = jobsData.jobs!.find((j) => j.status === "needs-a-quote")
    expect(quote).toBeDefined()
    expect(footerPlan(facts(quote!.id), true).primary).toBe("add-line")
  })

  it("a tech has no primary, and an open job with every visit gone leads with New visit", () => {
    expect(footerPlan(facts("job-a"), false)).toEqual({ primary: null })
    const gone = { ...facts("job-a"), visits: [], canRecord: false }
    expect(footerPlan(gone, true)).toEqual({ primary: "new-visit" })
  })

  it("the next visit is the earliest with a day, else one with none", () => {
    const v = (id: string, status: "scheduled" | "unscheduled" | "completed", scheduledOn?: string) => ({ id, status, ...(scheduledOn ? { scheduledOn } : {}) }) as never
    expect(nextVisitOf([v("a", "scheduled", "2026-12-02"), v("b", "scheduled", "2026-11-20"), v("c", "completed", "2026-11-01"), v("d", "unscheduled")])?.id).toBe("b")
    expect(nextVisitOf([v("d", "unscheduled"), v("c", "completed", "2026-11-01")])?.id).toBe("d")
    expect(nextVisitOf([v("c", "completed", "2026-11-01")])).toBeUndefined()
  })
})
