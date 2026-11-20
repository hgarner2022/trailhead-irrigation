import type { NotDoneReason } from "@/lib/admin/visit-defaults"
import type { AddNote, Outcome, PhotoActions } from "./action-types"

/** Where a visit was before a routine action, so Undo can put it back. */
export interface Where {
  day: string | null
  personId: string | null
  startTime: string | null
  /** the move texted the customer, so its Undo texts them again (a booked time always texts) */
  notified?: boolean
}

/** What the Move dialog sends besides the day and the time: a person (from a drop on another row), whether to text, and Ryan's line for the text. */
export interface MoveOptions {
  personId?: string
  notify?: boolean
  note?: string
}

/** Money handed over for a done visit: a check, Venmo or cash, the reference (a check number, a handle), and the amount when the visit has no price yet. */
export interface RecordPaidInput {
  method: "check" | "venmo" | "cash"
  reference?: string
  amount?: number
}

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
  /** "Add and send a quote": the job is made as Needs a quote, with no day, and its page opens on the quote */
  sendQuote?: boolean
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
  move: (visitId: string, day: string, time: string | null, options?: MoveOptions) => Promise<Outcome<Where>>
  /** `visits.confirm`: the customer said yes to the moved day (by phone or in person), which ends Waiting on customer */
  confirmDay: (visitId: string) => Promise<Outcome>
  /** the undo of a move or a not done */
  putBack: (visitId: string, was: Where) => Promise<Outcome>
  /** Mark done, and nothing else: how it is paid is the next step (`chargeCard`, `recordPayment`, `sendBill`, or nothing yet) */
  markDone: (visitId: string, opts?: { completedOn?: string }) => Promise<Outcome>
  undoDone: (visitId: string) => Promise<Outcome>
  /** `payments.chargeCard`: charges the card on file for what is unpaid on the visit, because the button was pressed; a decline answers the refusal "The card didn't go through. Choose another way." */
  chargeCard: (visitId: string) => Promise<Outcome>
  /** `payments.record`: money in hand, one payment row, the receipt */
  recordPayment: (visitId: string, paidBy: RecordPaidInput) => Promise<Outcome>
  /** `payments.refund`: the whole of what is left of a check, Venmo or cash payment, as a negative row; nothing is deleted */
  refundPayment: (paymentId: string) => Promise<Outcome>
  /** `invoices.send`: an invoice for a done job that still owes money, with its pay link; the message goes by text or email */
  sendBill: (jobId: string) => Promise<Outcome>
  /** `invoices.remind`: the reminder of an open invoice (two presses in a day send one) */
  remindBill: (invoiceId: string) => Promise<Outcome>
  markNotDone: (visitId: string, reason: NotDoneReason, note?: string) => Promise<Outcome<Where>>
  /** the Edit form's fields; notes are added (`addNote`), never rewritten here */
  edit: (visitId: string, changes: { durationMinutes?: number; personId?: string; accessNote?: string }) => Promise<Outcome>
  /** `events.note`: a note on a customer, job or visit, from the Notes and history block; a tech may add one */
  addNote: AddNote
  /** the Photos block's three actions; without them (the catalog) the block shows the photos and Add photo only logs */
  photos?: PhotoActions
  cancel: (visitId: string, reason?: string) => Promise<Outcome>
  /** `properties.update`: the yard's nine facts, from the customer panel's Property block */
  updateProperty: (propertyId: string, changes: YardChanges) => Promise<Outcome>
  /** `messages.refreshDelivery`: ask Twilio what became of the newest texts, from the Messages block's Check delivery button; answers how many were checked */
  checkDelivery?: () => Promise<Outcome<number>>
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
