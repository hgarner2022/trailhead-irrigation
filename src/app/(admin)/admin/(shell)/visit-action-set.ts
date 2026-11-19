import "server-only"
import type { VisitActions } from "@/app/(admin)/admin/_screens/visit-actions-types"
import { addNote, resendConfirmation, sendCardUpdateLink, updateProperty } from "./actions"
import { addPhoto, removePhoto, showPhoto } from "./photo-actions"
import { cancelVisit, confirmDay, createVisit, editVisit, chargeCard, markDone, markNotDone, moveVisitTo, putBack, recordPayment, refundPayment, remindBill, sellPass, sendBill, sendOnTheWay, sendText, undoDone } from "./visit-actions"

/** The visit panel's and New visit's actions, as one object the pages hand their screens. */
export const visitActions: VisitActions = {
  move: moveVisitTo,
  confirmDay,
  putBack,
  markDone,
  undoDone,
  chargeCard,
  recordPayment,
  refundPayment,
  sendBill,
  remindBill,
  markNotDone,
  edit: editVisit,
  addNote,
  photos: { add: addPhoto, show: showPhoto, remove: removePhoto },
  cancel: cancelVisit,
  updateProperty,
  sendText,
  sendOnTheWay,
  resendConfirmation,
  sendCardUpdateLink,
  createVisit,
  sellPass,
}
