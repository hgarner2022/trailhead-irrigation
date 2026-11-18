/**
 * The job panel's footer as a plan: which one button is the primary (the next step for this job), and which visit "Open visit"
 * opens. Pure; read from the job's facts, never typed. The rule, from the audit of Nov 18 2026 (docs/plans/2026-11-18-admin-ux-audit.md,
 * row 7): a job waiting on a quote adds a line; a job with a visit still ahead opens that visit; a job whose work is done and not yet
 * paid collects the payment (a button that opens How is this paid?: the card, check, Venmo, cash, an invoice); a job that is done and paid has no primary, only Open customer.
 * Collect is never the primary while a visit is still ahead.
 */
import type { Visit } from "@/lib/admin/types"
import type { JobFacts } from "./job-panel-model"
import { dayOfVisit } from "./visit-panel-model"

export type JobPrimary = "add-line" | "open-visit" | "collect" | "new-visit"

/** The visits of the job that still have to happen: not done, not canceled, not skipped. */
export const aheadOf = (visits: readonly Visit[]): Visit[] => visits.filter((v) => v.status === "scheduled" || v.status === "unscheduled")

/** The next visit: the earliest with a day, else one still waiting for its day. */
export function nextVisitOf(visits: readonly Visit[]): Visit | undefined {
  const ahead = aheadOf(visits)
  const dated = ahead.filter((v) => dayOfVisit(v)).sort((a, b) => dayOfVisit(a)!.localeCompare(dayOfVisit(b)!))
  return dated[0] ?? ahead[0]
}

export interface JobFooterPlan {
  primary: JobPrimary | null
  /** the visit "Open visit" opens */
  nextVisitId?: string
}

/** What the footer leads with. `canAct` is a manager (a tech has no buttons). */
export function footerPlan(facts: Pick<JobFacts, "row" | "visits" | "bill" | "canEditLines" | "canRecord" | "canAddVisit">, canAct: boolean): JobFooterPlan {
  if (!canAct) return { primary: null }
  const next = nextVisitOf(facts.visits)
  const stage = facts.row.stage
  if (stage === "cancelled") return { primary: null }
  if ((stage === "needs-a-quote" || stage === "quoted") && facts.canEditLines) return { primary: "add-line" }
  if (next) return { primary: "open-visit", nextVisitId: next.id }
  // Send an invoice and Record the payment are choices inside How is this paid? (`CollectPayment`), so one button, Collect, opens them.
  if (facts.bill.canSend || facts.canRecord) return { primary: "collect" }
  // an open job whose visits are all gone has nothing next but another visit; a Done and paid job has nothing at all
  if (stage === "open" && facts.canAddVisit) return { primary: "new-visit" }
  return { primary: null }
}
