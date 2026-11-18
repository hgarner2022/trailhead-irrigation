/**
 * Which buttons the visit panel's footer draws, by state (docs/plans/2026-11-18-admin-holistic-design.md, section 7): one primary, up to two
 * outlines, the More menu and one destructive ghost. Pure; read from the visit's facts and the plan `visitFooter` already makes
 * (Mark done, Collect, Undo done, Refund), never typed. A tech who collects (`access` "collect") keeps Mark done, Collect and Undo done and
 * no other button; `access` "none" has no footer.
 */
import type { VisitFacts } from "./visit-panel-model"
import { dayOfVisit } from "./visit-panel-model"
import type { VisitFooterPlan } from "./visit-collect-model"

export type BarId = "place" | "move" | "mark-done" | "not-done" | "edit" | "text" | "on-my-way" | "cancel" | "confirmed" | "collect" | "open-job" | "undo-done" | "refund"

export interface VisitBar {
  primary?: BarId
  secondary: BarId[]
  more: BarId[]
  destructive?: BarId
}

const EMPTY: VisitBar = { secondary: [], more: [] }

export function visitBar(facts: Pick<VisitFacts, "visit" | "states">, plan: VisitFooterPlan, access: "all" | "collect" | "none", today: string): VisitBar {
  const { visit, states } = facts
  if (access === "none" || states.work === "cancelled") return EMPTY
  const manager = access === "all"
  const day = dayOfVisit(visit)
  if (states.work === "scheduled") {
    if (!manager) return { ...EMPTY, primary: "mark-done" }
    // a moved day the customer was asked to confirm (Waiting on customer) is cleared from More once they have said yes
    const confirmed: BarId[] = visit.waiting ? ["confirmed"] : []
    // before its day the visit is moved first; Mark done stays one menu away
    if (day && day > today) return { primary: "move", secondary: ["edit"], more: [...confirmed, "mark-done", "text"], destructive: "cancel" }
    return { primary: "mark-done", secondary: ["move", "not-done"], more: [...confirmed, "edit", "text", ...(day === today ? (["on-my-way"] as BarId[]) : [])], destructive: "cancel" }
  }
  if (states.work === "needs-a-day" || states.work === "not-done") return manager ? { primary: "place", secondary: ["edit"], more: ["text"], destructive: "cancel" } : EMPTY
  if (states.work !== "done") return EMPTY
  const hasJob = Boolean(visit.jobId)
  const more: BarId[] = [...(manager ? (["text"] as BarId[]) : []), ...(plan.canUndo ? (["undo-done"] as BarId[]) : []), ...(plan.refund ? (["refund"] as BarId[]) : [])]
  if (plan.primary === "collect") return { primary: "collect", secondary: manager && hasJob ? ["open-job"] : [], more }
  return { primary: manager && hasJob ? "open-job" : undefined, secondary: [], more }
}
