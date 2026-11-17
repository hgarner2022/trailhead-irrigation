import type { NotDoneReason } from "@/lib/admin/visit-defaults"
import type { Outcome } from "./action-types"

/** Where a visit was before a routine action, so Undo can put it back. */
export interface Where {
  day: string | null
  personId: string | null
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
  personId?: string
  price?: number
  notes?: string
}

/** What New pass sends: the customer as New visit gives it, the zones and the add-on, a day per visit, how the money comes. */
export interface NewPassInput {
  customerId?: string
  /** for an existing customer with no email on file */
  email?: string
  newCustomer?: { firstName: string; lastName: string; email?: string; phone?: string; property: { address: string; town: string }; accessNote?: string }
  zones: number
  inspection: boolean
  days: { "turn-on"?: string; inspection?: string; blowout?: string }
  paysBy: "card-link" | "at-visit"
  termsAccepted: true
  notes?: string
}

/** What the toast says once a pass is sold. */
export interface SoldPass {
  id: string
  number: string
  firstName: string
}

/**
 * What the visit panel, the customer panel, New visit and New pass can do; the server actions in `(shell)/visit-actions.ts` in
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
  edit: (visitId: string, changes: { durationMinutes?: number; personId?: string; notes?: string; accessNote?: string }) => Promise<Outcome>
  cancel: (visitId: string, reason?: string) => Promise<Outcome>
  sendText: (customerId: string, visitId: string | undefined, text: string) => Promise<Outcome>
  resendConfirmation: (passId: string) => Promise<Outcome>
  createVisit: (input: NewVisitInput) => Promise<Outcome<{ id: string }>>
  /** New pass: `passes.sell`, the pass active from the start with no card step */
  sellPass: (input: NewPassInput) => Promise<Outcome<SoldPass>>
}
