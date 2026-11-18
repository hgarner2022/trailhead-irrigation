/**
 * What a visit panel's footer leads with, and what beat two offers, read from the visit's facts (docs/plans/2026-11-18-done-and-paid-design.md).
 * Pure: the first step is Mark done, the next is "How is this paid?" while the money is unpaid, and a payment can be taken back by a refund
 * row. Nothing here moves money; the panel presses the buttons.
 */
import { paidTotal } from "@/lib/money/words"
import { collectPlan, refundable, type CollectPlan } from "@/lib/money/collect"
import { dayOfVisit, type VisitFacts } from "./visit-panel-model"

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const weekdayName = (day: string) => WEEKDAYS[new Date(`${day}T12:00:00Z`).getUTCDay()]!

/** "This visit is scheduled for Friday. Mark it done today?" when the visit's day is still ahead, else nothing. */
export function aheadSentence(visitDay: string | undefined, today: string): string {
  return visitDay && visitDay > today ? `This visit is scheduled for ${weekdayName(visitDay)}. Mark it done today?` : ""
}

export type FooterPrimary = "mark-done" | "collect" | null

export interface VisitFooterPlan {
  primary: FooterPrimary
  /** whole dollars still unpaid, for "Collect $145" */
  unpaid: number
  /** Done can be undone: no payment row exists on the job */
  canUndo: boolean
  /** a check, Venmo or cash payment a Refund takes back */
  refund?: { paymentId: string; left: number; method: string }
  plan?: CollectPlan
}

/** The unpaid whole dollars of a visit: its price less what its own rows paid. */
export const unpaidOf = (facts: Pick<VisitFacts, "visit" | "price">): number => Math.max(0, facts.price - paidTotal(facts.visit.payments ?? []))

/** What the footer shows for this visit. `all` is an owner, admin or manager; `collect` is a tech, who may Mark done, undo it and take the money but not refund; `none` sees nothing. */
export function visitFooter(facts: VisitFacts, access: "all" | "collect" | "none", dueDays = 14): VisitFooterPlan {
  const canAct = access !== "none"
  const { visit, states, client, pass, bill } = facts
  const none: VisitFooterPlan = { primary: null, unpaid: 0, canUndo: false }
  if (!canAct || states.work === "cancelled") return none
  if (states.work === "scheduled") return { ...none, primary: "mark-done" }
  if (states.work !== "done") return none
  const payments = visit.payments ?? []
  const jobPayments = facts.job?.payments ?? payments
  // Refund is for the people who may change money after the fact (owner, admin, manager), never for a tech who collects.
  const refund = access === "all" ? refundable(payments) : undefined
  const owes = states.money === "owed" || states.money === "failed" || states.money === "bill-sent"
  const base: VisitFooterPlan = { ...none, canUndo: jobPayments.length === 0, ...(refund ? { refund: { paymentId: refund.payment.id, left: refund.left, method: refund.payment.method } } : {}) }
  if (!owes) return base
  const card = client?.card ?? (pass?.cardLast4 ? { last4: pass.cardLast4 } : undefined)
  const unpaid = unpaidOf(facts)
  const plan = collectPlan({
    amount: unpaid,
    ...(card ? { card: { brand: "brand" in card ? card.brand : undefined, last4: card.last4 } } : {}),
    isPass: Boolean(visit.passId),
    invoiceOpen: Boolean(bill.invoice),
    canInvoice: bill.canSend,
    invoiceAhead: !bill.canSend && !bill.invoice && facts.siblings.some((v) => v.id !== visit.id && (v.status === "scheduled" || v.status === "unscheduled")),
    // The visit's own newest card attempt, never the customer's mark: another visit's failed card does not decline this one.
    declined: Boolean(visit.chargeFailed) || payments[payments.length - 1]?.status === "failed",
    // A card payment that was refunded (or part-paid visit) is not charged again from here: the other ways are offered.
    cardChargeable: !payments.some((p) => (p.method === "card_on_file" || p.method === "card_now") && p.status === "succeeded" && p.amount > 0) && unpaid >= facts.price,
    charging: payments.some((p) => p.status === "pending"),
    dueDays,
  })
  return { ...base, primary: "collect", unpaid, plan }
}
