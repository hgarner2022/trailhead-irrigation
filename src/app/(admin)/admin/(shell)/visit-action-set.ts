import "server-only"
import type { VisitActions } from "@/app/(admin)/admin/_screens/visit-actions-types"
import { addNote, resendConfirmation, sendCardUpdateLink, updateProperty } from "./actions"
import { cancelVisit, createVisit, editVisit, markDone, markNotDone, moveVisitTo, putBack, recordPayment, remindBill, sellPass, sendBill, sendOnTheWay, sendText, undoDone } from "./visit-actions"

/** The visit panel's and New visit's actions, as one object the pages hand their screens. */
export const visitActions: VisitActions = {
  move: moveVisitTo,
  putBack,
  markDone,
  undoDone,
  recordPayment,
  sendBill,
  remindBill,
  markNotDone,
  edit: editVisit,
  addNote,
  cancel: cancelVisit,
  updateProperty,
  sendText,
  sendOnTheWay,
  resendConfirmation,
  sendCardUpdateLink,
  createVisit,
  sellPass,
}
