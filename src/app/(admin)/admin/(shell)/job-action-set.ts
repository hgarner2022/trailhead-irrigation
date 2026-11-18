import "server-only"
import type { JobActions } from "@/app/(admin)/admin/_screens/job-actions-types"
import { addInspection, cancelPass, changePreference, resendConfirmation, sendCardUpdateLink, skipVisit } from "./actions"
import { addLine, addVisit, cancelLine, recordJobPayment, updateLine } from "./job-actions"

/** The job panel's actions, with the pass's own buttons for a Season Pass job, as one object the Jobs page hands its screen. */
export const jobActions: JobActions = {
  addLine,
  updateLine,
  cancelLine,
  recordPayment: recordJobPayment,
  addVisit,
  pass: { resendConfirmation, sendCardUpdateLink, cancel: cancelPass, addInspection, changePreference, skip: skipVisit },
}
