import "server-only"
import type { VisitActions } from "@/app/(admin)/admin/_screens/visit-actions-types"
import { resendConfirmation } from "./actions"
import { cancelVisit, createVisit, editVisit, markDone, markNotDone, moveVisitTo, putBack, recordPayment, sendText, undoDone } from "./visit-actions"

/** The visit panel's and New visit's actions, as one object the pages hand their screens. */
export const visitActions: VisitActions = {
  move: moveVisitTo,
  putBack,
  markDone,
  undoDone,
  recordPayment,
  markNotDone,
  edit: editVisit,
  cancel: cancelVisit,
  sendText,
  resendConfirmation,
  createVisit,
}
