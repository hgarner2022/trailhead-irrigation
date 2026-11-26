// The customer's dialogs are one family: every one is the shared Dialog (src/components/ui/dialog.tsx), opened over the page, with a display-face title, one line under it, and a footer whose
// dismiss is an outline button and whose confirm is the primary (or, when the thing is hard to take back, the destructive colour), every button 44px. ConfirmDialog (the booking form's "Leave
// without booking?", the quote's decline) already draws exactly this; the account's three two-step dialogs (reschedule, cancel a visit, cancel the pass) hold a done state ConfirmDialog has no
// room for, so they write the shell themselves and take these words from here, the same ones ConfirmDialog uses.

/** A dialog's title: the display face, navy. */
export const DIALOG_TITLE = "type-heading text-navy"
