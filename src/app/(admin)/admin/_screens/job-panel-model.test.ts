import { describe, expect, it } from "vitest"
import { jobFacts, paymentWords } from "./job-panel-model"
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

  it("offers Record the payment while something is owed and a visit on a one-off job", () => {
    expect(facts(ownedJobId)).toMatchObject({ canRecord: true, canAddVisit: true })
    expect(facts(billedJobId).canRecord).toBe(true)
    // a deposit can be taken before the work is done; a pass is charged to its card, so not before its money is due
    expect(facts(cancelledLineJobId).canRecord).toBe(true)
    expect(facts(passJobId).canRecord).toBe(false)
    expect(facts(paidJobId).canRecord).toBe(false)
    expect(facts(passJobId)).toMatchObject({ canAddVisit: false })
  })

  it("offers Send a bill for a done job that is owed and has none out, and shows the bill that is out", () => {
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

describe("paymentWords", () => {
  it("says how the money came and its reference, and a refund says so", () => {
    expect(paymentWords({ method: "check", reference: "1042", amount: 145 })).toBe("Check 1042")
    expect(paymentWords({ method: "venmo", reference: "@dana", amount: 50 })).toBe("Venmo @dana")
    expect(paymentWords({ method: "cash", reference: null, amount: 20 })).toBe("Cash")
    expect(paymentWords({ method: "card_on_file", reference: null, amount: 145 })).toBe("Card")
    expect(paymentWords({ method: "check", reference: null, amount: -145 })).toBe("Refund, Check")
  })
})
