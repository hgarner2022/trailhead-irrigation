import { describe, expect, it } from "vitest"
import { jobBar, type JobFooterPlan } from "./job-footer-model"
import { textConsentLine } from "./VisitEditText"

type Facts = Parameters<typeof jobBar>[0]
const facts = (over: Partial<Facts> & { stage?: string } = {}): Facts => {
  const { stage = "open", ...rest } = over
  return { row: { stage } as Facts["row"], bill: { canSend: false }, canEditLines: false, canRecord: false, canAddVisit: true, canCancel: true, ...rest }
}
const plan = (primary: JobFooterPlan["primary"]): JobFooterPlan => ({ primary })

describe("jobBar", () => {
  it("gives an active Season Pass the next step, Change the pass, More and Cancel pass at the far right", () => {
    const bar = jobBar(facts({ canAddVisit: false, canCancel: false }), plan("open-visit"), true, { cardLast4: "4242", stripeUrl: "https://stripe.test/p" }, true)
    expect(bar).toEqual({ primary: "open-visit", secondary: ["change-pass"], more: ["card-link", "resend", "stripe"], destructive: "cancel-pass" })
  })

  it("keeps a Done and paid job without a primary, with New visit under More", () => {
    expect(jobBar(facts({ stage: "done" }), plan(null), true)).toEqual({ secondary: [], more: ["new-visit"], destructive: "cancel-job" })
    expect(jobBar(facts({ stage: "done", canCancel: false }), plan(null), true)).toEqual({ secondary: [], more: ["new-visit"] })
  })

  it("leads a Done and unpaid job with Collect and keeps New visit under More", () => {
    expect(jobBar(facts({ stage: "done", canCancel: false, canRecord: true }), plan("collect"), true)).toEqual({ primary: "collect", secondary: [], more: ["new-visit"] })
  })

  it("has nothing for a tech", () => {
    expect(jobBar(facts(), plan("open-visit"), false)).toEqual({ secondary: [], more: [] })
  })
})

describe("textConsentLine", () => {
  it("spells honored the American way", () => {
    expect(textConsentLine({ phone: "+13035550111" })).toContain("Replies of STOP are honored.")
  })
})
