// The registry from a message kind and its arguments to the email (subject, text, HTML). Every kind a customer or the office
// can get is here; `renderEmail` is what the sender calls at send time, so nothing is rendered until it goes out.
import { cancelledEmail, cardExpiringEmail, cardFailedEmail, receiptEmail, renewalEmail } from "./account-messages"
import { adminAlertEmail, bookingConfirmationEmail, notClosedCrewEmail } from "./booking-and-staff"
import { dateConfirmEmail, dateMovedEmail, dateSetEmail, dayBeforeEmail } from "./date-messages"
import { purchaseConfirmationEmail } from "./purchase-confirmation"
import type { RenderedEmail } from "./types"

export type { RenderedEmail }

type Template = (data: never) => RenderedEmail

export const EMAIL_TEMPLATES = {
  "purchase-confirmation": purchaseConfirmationEmail,
  "booking-confirmation": bookingConfirmationEmail,
  "date-set": dateSetEmail,
  "date-moved": dateMovedEmail,
  "day-before": dayBeforeEmail,
  "date-confirm": dateConfirmEmail,
  receipt: receiptEmail,
  "card-failed": cardFailedEmail,
  "card-expiring": cardExpiringEmail,
  cancelled: cancelledEmail,
  renewal: renewalEmail,
  "not-closed-crew": notClosedCrewEmail,
  "admin-alert": adminAlertEmail,
} satisfies Record<string, Template>

export type EmailKind = keyof typeof EMAIL_TEMPLATES

/** Null for a kind with no template or a row with no stored arguments (an older plain-text row): the sender then uses the row's own subject and body. */
export function renderEmail(kind: string, data: Record<string, unknown> | null): RenderedEmail | null {
  const template = (EMAIL_TEMPLATES as Record<string, Template | undefined>)[kind]
  return template && data ? template(data as never) : null
}
