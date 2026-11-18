// The registry from a message kind and its arguments to the email (subject, text, HTML). Every kind a customer or the office
// can get is here; `renderEmail` is what the sender calls at send time, so nothing is rendered until it goes out.
import { cancelledEmail, cardExpiringEmail, cardFailedEmail, receiptEmail, renewalEmail } from "./account-messages"
import { adminAlertEmail, bookingConfirmationEmail, notClosedCrewEmail } from "./booking-and-staff"
import { dateConfirmEmail, dateMovedEmail, dateSetEmail, dayBeforeEmail } from "./date-messages"
import { invoiceEmail, invoiceReminderEmail } from "./invoice"
import type { Overrides } from "./editable"
import { purchaseConfirmationEmail } from "./purchase-confirmation"
import type { RenderedEmail } from "./types"

export type { RenderedEmail }

type Template = (data: never, options?: { templates?: Overrides }) => RenderedEmail

export const EMAIL_TEMPLATES = {
  "purchase-confirmation": purchaseConfirmationEmail,
  "booking-confirmation": bookingConfirmationEmail,
  "date-set": dateSetEmail,
  "date-moved": dateMovedEmail,
  "day-before": dayBeforeEmail,
  "date-confirm": dateConfirmEmail,
  receipt: receiptEmail,
  invoice: invoiceEmail,
  "invoice-reminder": invoiceReminderEmail,
  "card-failed": cardFailedEmail,
  "card-expiring": cardExpiringEmail,
  cancelled: cancelledEmail,
  renewal: renewalEmail,
  "not-closed-crew": notClosedCrewEmail,
  "admin-alert": adminAlertEmail,
} satisfies Record<string, Template>

export type EmailKind = keyof typeof EMAIL_TEMPLATES

/** A row queued before the account page replaced the pass page carries `passUrl`; read it as the account link so it still renders. */
function current(data: Record<string, unknown>): Record<string, unknown> {
  if (data.accountUrl || typeof data.origin !== "string") return data
  return { ...data, accountUrl: `${data.origin}/account` }
}

/** Null for a kind with no template or a row with no stored arguments (an older plain-text row): the sender then uses the row's own subject and body. `templates` is what the office saved in Settings › Messages. */
export function renderEmail(kind: string, data: Record<string, unknown> | null, templates?: Overrides): RenderedEmail | null {
  const template = (EMAIL_TEMPLATES as Record<string, Template | undefined>)[kind]
  return template && data ? template(current(data) as never, { templates }) : null
}
