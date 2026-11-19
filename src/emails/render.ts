// The registry from a message kind and its arguments to the email (subject, text, HTML). Every kind a customer or the office
// can get is here; `renderEmail` is what the sender calls at send time, so nothing is rendered until it goes out.
import { cancelledEmail, cardExpiringEmail, cardFailedEmail, receiptEmail, renewalEmail, visitCancelledEmail } from "./account-messages"
import { adminAlertEmail, bookingConfirmationEmail, notClosedCrewEmail } from "./booking-and-staff"
import { dateConfirmEmail, dateMovedEmail, dateSetEmail, dayBeforeEmail } from "./date-messages"
import { invoiceEmail, invoiceReminderEmail } from "./invoice"
import type { Overrides } from "./editable"
import { purchaseConfirmationEmail } from "./purchase-confirmation"
import { plainEmail, type PlainData } from "./plain"
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
  "visit-cancelled": visitCancelledEmail,
  renewal: renewalEmail,
  "not-closed-crew": notClosedCrewEmail,
  "admin-alert": adminAlertEmail,
} satisfies Record<string, Template>

export type EmailKind = keyof typeof EMAIL_TEMPLATES

/** A row queued before this wording carries `passUrl`, and may lack the address, the service or the season; read it so it still renders. */
function current(data: Record<string, unknown>): Record<string, unknown> {
  if (typeof data.origin !== "string") return data
  const out: Record<string, unknown> = { ...data }
  if (!out.accountUrl) out.accountUrl = `${data.origin}/account`
  // A receipt queued before the service and the address were carried: the visit's name stands in, and the rows that need the rest are left out.
  if (!out.serviceName && typeof out.visitName === "string" && out.amount !== undefined && out.card !== undefined) out.serviceName = out.visitName
  if (out.amount !== undefined && out.card !== undefined && !out.serviceName) out.serviceName = "visit"
  return out
}

/** Null for a kind with no template or a row with no stored arguments (an older plain-text row): the sender then uses the row's own subject and body. `templates` is what the office saved in Settings › Messages. */
export function renderEmail(kind: string, data: Record<string, unknown> | null, templates?: Overrides): RenderedEmail | null {
  const template = (EMAIL_TEMPLATES as Record<string, Template | undefined>)[kind]
  // A text with no email twin (on my way, the office's free text) that went by email while texts were paused carries its own words.
  if (!template && data && typeof data.plainBody === "string") return plainEmail(data as unknown as PlainData)
  return template && data ? template(current(data) as never, { templates }) : null
}
