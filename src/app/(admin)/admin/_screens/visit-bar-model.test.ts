import { describe, expect, it } from "vitest"
import type { Visit } from "@/lib/admin/types"
import type { VisitFacts } from "./visit-panel-model"
import type { VisitFooterPlan } from "./visit-collect-model"
import { visitBar } from "./visit-bar-model"

const TODAY = "2026-11-12"
const noPlan: VisitFooterPlan = { primary: null, unpaid: 0, canUndo: false }
const facts = (work: string, over: Partial<Visit> = {}): Pick<VisitFacts, "visit" | "states"> =>
  ({ visit: { id: "v", jobId: "j", scheduledOn: "2026-11-12", ...over } as Visit, states: { work } as VisitFacts["states"] })

describe("visitBar", () => {
  it("leads with Place for a visit with no day, Edit beside it, Send a text under More and Cancel visit at the far right", () => {
    expect(visitBar(facts("needs-a-day", { scheduledOn: undefined }), noPlan, "all", TODAY)).toEqual({ primary: "place", secondary: ["edit"], more: ["text"], destructive: "cancel" })
    expect(visitBar(facts("not-done", { scheduledOn: undefined }), noPlan, "all", TODAY).primary).toBe("place")
  })

  it("leads with Move before its day, with Mark done one menu away", () => {
    expect(visitBar(facts("scheduled", { scheduledOn: "2026-11-20" }), noPlan, "all", TODAY)).toEqual({ primary: "move", secondary: ["edit"], more: ["mark-done", "text"], destructive: "cancel" })
  })

  it("leads with Mark done on its day or after, with Move and Not done beside it and On my way only today", () => {
    expect(visitBar(facts("scheduled"), noPlan, "all", TODAY)).toEqual({ primary: "mark-done", secondary: ["move", "not-done"], more: ["edit", "text", "on-my-way"], destructive: "cancel" })
    expect(visitBar(facts("scheduled", { scheduledOn: "2026-11-10" }), noPlan, "all", TODAY).more).toEqual(["edit", "text"])
  })

  it("leads with Collect for a done and unpaid visit; Undo done and Refund go under More", () => {
    const plan: VisitFooterPlan = { primary: "collect", unpaid: 145, canUndo: true, refund: { paymentId: "p", left: 145, method: "check" } }
    expect(visitBar(facts("done"), plan, "all", TODAY)).toEqual({ primary: "collect", secondary: ["open-job"], more: ["text", "undo-done", "refund"] })
  })

  it("leads with Open job for a done and paid visit, with no destructive button", () => {
    const bar = visitBar(facts("done"), noPlan, "all", TODAY)
    expect(bar).toEqual({ primary: "open-job", secondary: [], more: ["text"] })
  })

  it("gives a tech who collects Mark done, Collect and Undo done only", () => {
    expect(visitBar(facts("scheduled"), noPlan, "collect", TODAY)).toEqual({ primary: "mark-done", secondary: [], more: [] })
    const plan: VisitFooterPlan = { primary: "collect", unpaid: 145, canUndo: true }
    expect(visitBar(facts("done"), plan, "collect", TODAY)).toEqual({ primary: "collect", secondary: [], more: ["undo-done"] })
    expect(visitBar(facts("needs-a-day", { scheduledOn: undefined }), noPlan, "collect", TODAY)).toEqual({ secondary: [], more: [] })
  })

  it("draws nothing for a canceled visit or a reader", () => {
    expect(visitBar(facts("cancelled"), noPlan, "all", TODAY)).toEqual({ secondary: [], more: [] })
    expect(visitBar(facts("scheduled"), noPlan, "none", TODAY)).toEqual({ secondary: [], more: [] })
  })
})
