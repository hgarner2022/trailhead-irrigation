// The texts, one per kind that goes by text: date-set, date-moved, the two-week check, the day-before reminder, on the way,
// and the invoice with its reminder (docs/plans/2026-11-18-messages-design.md section 4). Each opens "Trailhead:", says the
// fact first, carries one link, and ends "Reply STOP to opt out." on a customer's first text only (`optOut`; the queue
// decides by whether the number has had a text before). Plain ASCII, so a part holds 160 characters; the full link makes
// some texts two parts, which costs less than a short link domain. The middle of the day-of texts and of the invoice
// reminder is what the office may edit (`bodyOf` in src/emails/editable.ts); everything else here is locked.
import { visitCancelledMoney } from "@/emails/account-messages"
import { ACCOUNT_NAME, monthDay, noteLine, shortDay, windowText } from "@/emails/format"
import { bodyOf, fillTemplate, type EditableMessage, type Overrides } from "@/emails/editable"
import type { InvoiceData, VisitCancelledData, VisitData } from "@/emails/types"

export const OPT_OUT = "Reply STOP to opt out."

export interface TextOptions {
  /** false once this number has had a text before; the default is the first-text form */
  optOut?: boolean
  /** saved words from Settings › Messages */
  templates?: Overrides
}

const tail = (o?: TextOptions) => (o?.optOut === false ? "" : ` ${OPT_OUT}`)

/**
 * The link every text about a visit ends with: that visit's own page, signed so it opens already signed in. A text that sets or moves the day (or reminds of it)
 * says "Doesn't work? Pick another day:"; on my way says "See your visit:". Without a signed link (an older row) it is the plain account link.
 */
const visitLinkTail = (key: EditableMessage["key"], visitUrl: string | undefined, accountUrl: string, asked = false) =>
  visitUrl ? `${key === "on-the-way" ? "See your visit:" : asked ? "Reply YES or pick another day:" : key === "date-confirm" ? "Pick another day:" : "Doesn't work? Pick another day:"} ${visitUrl}` : `Your ${ACCOUNT_NAME}: ${accountUrl}`

const visitText = (key: EditableMessage["key"], d: VisitData, o?: TextOptions) => {
  const v = d.visit
  // A move Ryan made says his line after the words, and for a property that must be home asks for the YES instead of "Another day?" (and the link says the same: reply or pick).
  const asked = key === "date-moved" && v.asked === true && Boolean(v.visitUrl)
  let middle = fillTemplate(bodyOf(o?.templates, key, "sms"), { service: v.name, address: v.address, day: shortDay(v.day), window: v.startTime ? windowText(v.startTime) : null, who: v.who })
  if (asked) middle = middle.replace(/\s*Another day\?\s*$/, "")
  const note = key === "date-moved" ? noteLine(v.note) : ""
  return `Trailhead: ${middle}${note ? ` ${note}` : ""} ${visitLinkTail(key, v.visitUrl, d.accountUrl, asked)}${tail(o)}`
}

export const dateSetText = (d: VisitData, o?: TextOptions) => visitText("date-set", d, o)
export const dateMovedText = (d: VisitData, o?: TextOptions) => visitText("date-moved", d, o)
export const dateConfirmText = (d: VisitData, o?: TextOptions) => visitText("date-confirm", d, o)
/** "Ryan is coming tomorrow" when the visit has a person, "We're coming tomorrow" when it has none. */
export const dayBeforeText = (d: VisitData, o?: TextOptions) => visitText("day-before", d, o)
/** Sent from the visit panel's "On my way" button. */
export const onTheWayText = (d: VisitData, o?: TextOptions) => visitText("on-the-way", d, o)

/** The invoice: the amount, the due day and the pay link. Not edited by the office. */
export const invoiceText = (d: InvoiceData, o?: TextOptions) => `Trailhead: your invoice for the ${d.visitName} is ${dollarsOf(d.total)}, due ${monthDay(d.dueOn)}. Pay here: ${d.payUrl}${tail(o)}`
export const invoiceReminderText = (d: InvoiceData, o?: TextOptions) =>
  `Trailhead: ${fillTemplate(bodyOf(o?.templates, "invoice-reminder", "sms"), { service: d.visitName, amount: dollarsOf(d.total), due: monthDay(d.dueOn), payLink: d.payUrl })}${tail(o)}`

/** The confirmation after a customer cancels a visit from their account: the fact, what is and is not charged and the account link. Not edited by the office. */
export const visitCancelledText = (d: VisitCancelledData, o?: TextOptions) => `Trailhead: your ${d.serviceName} at ${d.address}${d.day ? ` on ${shortDay(d.day)}` : ""} is canceled. ${visitCancelledMoney(d.paid)} ${d.visitUrl ? `See your visit: ${d.visitUrl}` : `Your ${ACCOUNT_NAME}: ${d.accountUrl}`}${tail(o)}`

const dollarsOf = (n: number) => `$${n.toLocaleString("en-US")}`

export const SMS_TEMPLATES = { "date-set": dateSetText, "date-moved": dateMovedText, "day-before": dayBeforeText, "date-confirm": dateConfirmText, "on-the-way": onTheWayText, invoice: invoiceText, "invoice-reminder": invoiceReminderText, "visit-cancelled": visitCancelledText }
export type SmsKind = keyof typeof SMS_TEMPLATES

/** Kinds with no email twin: a text or nothing (on my way means nothing a day later). */
export const TEXT_ONLY_KINDS: readonly string[] = ["on-the-way"]
