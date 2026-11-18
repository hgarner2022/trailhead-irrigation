import type { NotDoneReason } from "@/lib/admin/visit-defaults"
import type { AddNote, Outcome } from "./action-types"

/** Where a visit was before a routine action, so Undo can put it back. */
export interface Where {
  day: string | null
  personId: string | null
  startTime: string | null
}

/** How the money for a done visit was dealt with: in hand (check, Venmo, cash) or `bill` (Send an invoice: Done sends a pay link and records no payment). */
export interface PaidByInput {
  method: "check" | "venmo" | "cash" | "bill"
  reference?: string
  amount?: number
}

/** What Record the payment sends: money in hand only, never an invoice. */
export type RecordPaidInput = PaidByInput & { method: "check" | "venmo" | "cash" }

export interface NewVisitInput {
  customerId?: string
  newCustomer?: { firstName: string; lastName: string; email?: string; phone?: string; property: { address: string; town: string } }
  /** left out when `serviceKey` is given */
  kind?: "turn-on" | "inspection" | "blowout" | "repair" | "install" | "other"
  /** the catalogue service the job is for; its kind, minutes and price rule apply */
  serviceKey?: string
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

/** What Edit property sends: only the fields that changed; null or an empty text clears one. */
export interface YardChanges {
  zones?: number | null
  controller?: string | null
  backflowLocation?: string | null
  gateCode?: string | null
  mustBeHome?: boolean
  accessNote?: string | null
  contactName?: string | null
  contactPhone?: string | null
  notes?: string | null
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
  recordPayment: (visitId: string, paidBy: RecordPaidInput) => Promise<Outcome>
  /** `invoices.send`: an invoice for a done job that still owes money, with its pay link; the message goes by text or email */
  sendBill: (jobId: string) => Promise<Outcome>
  /** `invoices.remind`: the reminder of an open invoice (two presses in a day send one) */
  remindBill: (invoiceId: string) => Promise<Outcome>
  markNotDone: (visitId: string, reason: NotDoneReason, note?: string) => Promise<Outcome<Where>>
  /** the Edit form's fields; notes are added (`addNote`), never rewritten here */
  edit: (visitId: string, changes: { durationMinutes?: number; personId?: string; accessNote?: string }) => Promise<Outcome>
  /** `events.note`: a note on a customer, job or visit, from the Notes and history block; a tech may add one */
  addNote: AddNote
  cancel: (visitId: string, reason?: string) => Promise<Outcome>
  /** `properties.update`: the yard's nine facts, from the customer panel's Property block */
  updateProperty: (propertyId: string, changes: YardChanges) => Promise<Outcome>
  sendText: (customerId: string, visitId: string | undefined, text: string) => Promise<Outcome>
  /** `messages.send` kind on-the-way: "Ryan is on the way to 412 Ash St", for a visit that is today, once per visit per day */
  sendOnTheWay: (visitId: string) => Promise<Outcome>
  resendConfirmation: (passId: string) => Promise<Outcome>
  /** `passes.sendCardUpdateLink`: the card link by email, from the customer panel's Card line */
  sendCardUpdateLink: (passId: string) => Promise<Outcome>
  createVisit: (input: NewVisitInput) => Promise<Outcome<{ id: string; jobId: string }>>
  /** New pass: `passes.sell`, the pass active from the start with no card step */
  sellPass: (input: NewPassInput) => Promise<Outcome<SoldPass>>
}
