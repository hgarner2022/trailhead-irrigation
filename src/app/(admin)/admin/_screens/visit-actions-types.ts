import type { NotDoneReason } from "@/lib/admin/visit-defaults"
import type { Outcome } from "./action-types"

/** Where a visit was before a routine action, so Undo can put it back. */
export interface Where {
  day: string | null
  truckId: string | null
  startTime: string | null
}

export interface PaidByInput {
  method: "check" | "venmo" | "cash"
  reference?: string
  amount?: number
}

export interface NewVisitInput {
  customerId?: string
  newCustomer?: { firstName: string; lastName: string; email?: string; phone?: string; property: { address: string; town: string } }
  kind: "turn-on" | "inspection" | "blowout" | "repair" | "install" | "other"
  scheduledOn?: string
  startTime?: string
  durationMinutes?: number
  truckId?: string
  price?: number
  notes?: string
}

/**
 * What the visit panel, the customer panel and New visit can do; the server actions in `(shell)/visit-actions.ts` in
 * the app. Every action answers with the API's own words when it is refused. A screen without them (the catalog)
 * leaves the buttons doing nothing but log.
 */
export interface VisitActions {
  move: (visitId: string, day: string, time: string | null) => Promise<Outcome<Where>>
  /** the undo of a move or a not done */
  putBack: (visitId: string, was: Where) => Promise<Outcome>
  markDone: (visitId: string, opts?: { completedOn?: string; paidBy?: PaidByInput }) => Promise<Outcome>
  undoDone: (visitId: string) => Promise<Outcome>
  recordPayment: (visitId: string, paidBy: PaidByInput) => Promise<Outcome>
  markNotDone: (visitId: string, reason: NotDoneReason, note?: string) => Promise<Outcome<Where>>
  edit: (visitId: string, changes: { durationMinutes?: number; truckId?: string; notes?: string; accessNote?: string }) => Promise<Outcome>
  cancel: (visitId: string, reason?: string) => Promise<Outcome>
  sendText: (customerId: string, visitId: string | undefined, text: string) => Promise<Outcome>
  resendConfirmation: (passId: string) => Promise<Outcome>
  createVisit: (input: NewVisitInput) => Promise<Outcome<{ id: string }>>
}
