import type { AddNote, Outcome, PhotoActions } from "./action-types"
import type { PassesActions } from "./passes-actions"

/** A line as Add a line sends it: a catalogue service (its name, what it includes and its taxable flag are copied) or a free line with a name. */
export interface NewLineInput {
  jobId: string
  serviceKey?: string
  name?: string
  description?: string
  quantity: number
  /** whole dollars; left out for a service, its own price; 0 reads Quote later */
  unitPrice?: number
  taxable?: boolean
}

/** What a manager can do to one job from its panel, beyond what the visit and pass panels already do. The server actions in `(shell)/job-actions.ts` in the app; without them the catalog's buttons only log. */
export interface JobActions {
  /** `lines.add`: answers the job's new total */
  addLine: (input: NewLineInput) => Promise<Outcome<{ jobTotal: number }>>
  /** `lines.update`: price, quantity or name of a live line */
  updateLine: (lineId: string, changes: { name?: string; quantity?: number; unitPrice?: number }) => Promise<Outcome<{ jobTotal: number }>>
  /** `lines.cancel` */
  cancelLine: (lineId: string) => Promise<Outcome<{ jobTotal: number }>>
  /** `payments.record` on the job as a whole: money handed over by check, Venmo or cash */
  recordPayment: (jobId: string, input: { method: "check" | "venmo" | "cash"; amount: number; reference?: string }) => Promise<Outcome>
  /** `visits.create` with the job's id: a new visit on this job, from a catalogue service */
  addVisit: (jobId: string, input: { serviceKey: string; scheduledOn?: string; notes?: string }) => Promise<Outcome<{ id: string }>>
  /** `jobs.cancel`: cancel a one-off job, its lines and the visits not done */
  cancelJob: (jobId: string) => Promise<Outcome>
  /** `events.note` on the job, from the Notes and history block; a tech may add one */
  addNote: AddNote
  /** the Photos block's actions for each visit's photos on the job panel */
  photos?: PhotoActions
  /** the pass's own buttons, for a Season Pass job */
  pass?: Omit<PassesActions, "addNote">
}
