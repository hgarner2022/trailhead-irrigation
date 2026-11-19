import { describe, expect, it } from "vitest"
import { jobBar, type JobFooterPlan } from "./job-footer-model"
import { phoneBar } from "./job-footer-phone"

type Facts = Parameters<typeof jobBar>[0]
const facts = (over: Partial<Facts> = {}): Facts => ({ row: { stage: "open" } as Facts["row"], bill: { canSend: false }, canEditLines: false, canRecord: false, canAddVisit: true, canCancel: true, ...over })
const plan = (primary: JobFooterPlan["primary"]): JobFooterPlan => ({ primary })

describe("phoneBar", () => {
  it("keeps the one primary and More, with the outlines and the cancel under More", () => {
    const bar = jobBar(facts({ canEditLines: true }), plan("open-visit"), true)
    expect(bar.secondary).toEqual(["add-line", "new-visit"])
    expect(phoneBar(bar)).toEqual({ primary: "open-visit", secondary: [], more: ["add-line", "new-visit", "cancel-job"] })
  })

  it("keeps a Season Pass's Change the pass and Cancel pass under More, after the rest", () => {
    const bar = jobBar(facts({ canAddVisit: false, canCancel: false }), plan("open-visit"), true, { cardLast4: "4242", stripeUrl: "https://stripe.test/p" }, true)
    expect(phoneBar(bar)).toEqual({ primary: "open-visit", secondary: [], more: ["change-pass", "card-link", "resend", "stripe", "cancel-pass"] })
  })

  it("leaves a bar with nothing as it was", () => {
    expect(phoneBar({ secondary: [], more: [] })).toEqual({ secondary: [], more: [] })
  })
})
