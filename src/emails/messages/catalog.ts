// The one list of every message a customer (or the crew) can get, in the order of the customer's journey. The Overview table, the stories and the tests all read it:
// a message is added here once and it shows up everywhere. A message with `prototype` set does not exist in the app yet.
import { storyNameFromExport, toId } from "storybook/internal/csf"
import { signInEmail as liveSignIn } from "../sign-in"
import { renderEmail, type RenderedEmail } from "../render"
import * as proposed from "../design/messages"
import { SMS_TEMPLATES, type SmsKind } from "@/sms/texts"
import * as f from "./fixtures"
import * as q from "../design/quote-messages"
import { preferenceRequestEmail, preferenceRequestText } from "../design/preference-request"
import { canceledByUsText, crewAssignedText, customerChangedText, newRequestStaffText, quoteApprovedSms, quoteDeclinedSms, quoteDecidedStaffText, quoteReminderSms, quoteSms, receiptText, refundText } from "./prototype-texts"

export type Journey = "Booking and visits" | "Billing" | "Requests and quotes" | "Season Pass" | "Marketing" | "Account" | "To the crew, not the customer"
export type Channel = "text" | "email"

/** The Storybook group of each journey phase. */
export const JOURNEY_TITLE: Record<Journey, string> = {
  "Booking and visits": "Messages/Booking and visits",
  Billing: "Messages/Billing",
  "Requests and quotes": "Messages/Requests and quotes",
  "Season Pass": "Messages/Season Pass",
  Marketing: "Messages/Marketing",
  Account: "Messages/Account",
  "To the crew, not the customer": "Messages/To the crew",
}

export interface MessageDef {
  id: string
  name: string
  journey: Journey
  /** the message kind in the app (`message_log.kind`), or "none" for one that does not exist */
  kind: string
  channels: Channel[]
  /** when it is sent and why: the Docs line of its story */
  when: string
  klass: "transactional" | "marketing" | "to the crew"
  /** the renderer in the repo, or "not built" */
  renderer: string
  /** the channels that do not exist yet; the story badges them "Prototype, not built yet" */
  prototype?: Channel[]
  /** built, but nothing in the app queues it yet */
  noTrigger?: boolean
  /** the export name of the laptop story; the phone story is `${exportName}OnAPhone` */
  exportName: string
  /** the text as a customer gets it; `first` is the form that ends "Reply STOP to opt out." */
  text?: (first: boolean) => string
  /** the live email */
  current?: () => RenderedEmail | null
  /** the proposed email */
  proposed?: () => RenderedEmail
  /** this is the first text a number has had: it ends with the STOP line */
  firstText?: boolean
  /** the word "request" is the customer's own here (the thank-you after a request) or the office's note about one: the voice rules let it through */
  mayNameRequest?: boolean
}

const sms = (kind: SmsKind, data: unknown) => (first: boolean) => (SMS_TEMPLATES[kind] as (d: never, o?: unknown) => string)(data as never, { optOut: first })
const live = (kind: string, data: unknown) => () => renderEmail(kind, data as Record<string, unknown>)
/** The facts a quote's words are built from, from the email's data. */
const qf = (d: q.QuoteEmailData) => ({ first: d.firstName, service: d.serviceName, address: d.address, total: `$${d.total.toLocaleString("en-US")}`, ...(d.deposit ? { deposit: `$${d.deposit.toLocaleString("en-US")}` } : {}), number: d.number, link: d.quoteUrl })
const receipt = (key: keyof typeof f.RECEIPTS) => ({ text: (first: boolean) => receiptText(f.RECEIPTS[key], { optOut: first }), current: live("receipt", f.RECEIPTS[key]), proposed: () => proposed.receiptEmail(f.RECEIPTS[key]) })

export const MESSAGES: MessageDef[] = [
  // ---- Booking and visits
  { id: "booking-confirmation", name: "Booking confirmation", journey: "Booking and visits", kind: "booking-confirmation", channels: ["email"], klass: "transactional", renderer: "src/emails/booking-and-staff.ts", noTrigger: true, exportName: "BookingConfirmation",
    when: "When a customer books online: the day and the exact time, who is coming and where. The renderer is ready; nothing queues it until the booking step is wired.", current: live("booking-confirmation", f.BOOKING), proposed: () => proposed.bookingConfirmationEmail(f.BOOKING) },
  { id: "date-set", name: "Day set", journey: "Booking and visits", kind: "date-set", channels: ["text", "email"], klass: "transactional", renderer: "src/sms/texts.ts, src/emails/date-messages.ts", exportName: "DaySet", firstText: true,
    when: "When a visit gets a day: the office schedules it, the customer picks a day, or the checkout holds one. A text to the customer's mobile; an email when there is no mobile or after STOP. The text shown is the first one this number gets, so it ends with the STOP line.", text: sms("date-set", f.VISIT), current: live("date-set", f.VISIT), proposed: () => proposed.dateSetEmail(f.VISIT) },
  { id: "date-moved", name: "Day moved", journey: "Booking and visits", kind: "date-moved", channels: ["text", "email"], klass: "transactional", renderer: "src/sms/texts.ts, src/emails/date-messages.ts", exportName: "DayMoved",
    when: "When the office moves a visit, or the customer moves it. A property that must be home is asked to reply YES or pick another day; a same-day time reads \"still Wed, now at 10:30 am\".", text: sms("date-moved", f.VISIT), current: live("date-moved", f.VISIT), proposed: () => proposed.dateMovedEmail(f.VISIT) },
  { id: "date-confirm", name: "Two weeks out", journey: "Booking and visits", kind: "date-confirm", channels: ["text", "email"], klass: "transactional", renderer: "src/sms/texts.ts, src/emails/date-messages.ts", exportName: "TwoWeeksOut",
    when: "Fourteen days before the visit, by the daily run: the day is still on, and the last day to change it online.", text: sms("date-confirm", f.VISIT), current: live("date-confirm", f.VISIT), proposed: () => proposed.dateConfirmEmail(f.VISIT) },
  { id: "day-before", name: "Day before", journey: "Booking and visits", kind: "day-before", channels: ["text", "email"], klass: "transactional", renderer: "src/sms/texts.ts, src/emails/date-messages.ts", exportName: "DayBefore",
    when: "The day before, by the daily run: who is coming and the exact time. Past the online cut-off, so it says Text Ryan and never offers another day.", text: sms("day-before", f.VISIT), current: live("day-before", f.VISIT), proposed: () => proposed.dayBeforeEmail(f.VISIT) },
  { id: "on-the-way", name: "On my way", journey: "Booking and visits", kind: "on-the-way", channels: ["text"], klass: "transactional", renderer: "src/sms/texts.ts", exportName: "OnMyWay",
    when: "When Ryan or the crew presses On my way on a visit that is today, once per visit per day. A text only: it means nothing as a later email.", text: sms("on-the-way", f.VISIT) },
  { id: "visit-cancelled", name: "Visit canceled by you", journey: "Booking and visits", kind: "visit-cancelled", channels: ["text", "email"], klass: "transactional", renderer: "src/sms/texts.ts, src/emails/account-messages.ts", exportName: "CanceledByYou",
    when: "When the customer cancels a visit from their Trailhead account, and when they skip a Season Pass visit. What was and was not charged, and how to add it back.", text: sms("visit-cancelled", f.VISIT_CANCELLED), current: live("visit-cancelled", f.VISIT_CANCELLED), proposed: () => proposed.visitCancelledEmail(f.VISIT_CANCELLED) },
  { id: "canceled-by-us", name: "Visit canceled by us", journey: "Booking and visits", kind: "none", channels: ["text", "email"], klass: "transactional", renderer: "not built", prototype: ["text", "email"], exportName: "CanceledByUs",
    when: "When the office cancels a visit. Today nothing is sent: the customer finds out by phone or not at all. Prototype: the fact, what was and was not charged, and the phone.", text: (first) => canceledByUsText(f.CANCELED_BY_US, { optOut: first }), proposed: () => proposed.canceledByUsEmail(f.CANCELED_BY_US) },
  { id: "note-paused", name: "A text sent as an email", journey: "Booking and visits", kind: "any text kind", channels: ["email"], klass: "transactional", renderer: "src/emails/plain.ts", exportName: "TextSentAsEmail",
    when: "While texts are paused (Twilio error 30034): the text's own words go as an email in the same frame, so nothing is dropped.", current: live("on-the-way", f.PAUSED_TEXT), proposed: () => proposed.plainEmail(f.PAUSED_TEXT, "Ryan is on the way to 412 Briggs Street for your repair") },

  // ---- Billing
  { id: "invoice", name: "Invoice", journey: "Billing", kind: "invoice", channels: ["text", "email"], klass: "transactional", renderer: "src/sms/texts.ts, src/emails/invoice.ts", exportName: "Invoice",
    when: "When the office sends an invoice: the amount, the due day and one pay link. The email also has the lines and What we did (the visit's checklist and the photos Ryan shared), which the office can leave out with the Include the visit report box.", text: sms("invoice", f.INVOICE), current: live("invoice", f.INVOICE), proposed: () => proposed.invoiceEmail(f.INVOICE) },
  { id: "invoice-reminder", name: "Invoice reminder", journey: "Billing", kind: "invoice-reminder", channels: ["text", "email"], klass: "transactional", renderer: "src/sms/texts.ts, src/emails/invoice.ts", exportName: "InvoiceReminder",
    when: "When the office presses Remind on an unpaid invoice: once a day at most, never automatic. The same invoice again under a reminder heading.", text: sms("invoice-reminder", f.INVOICE), current: live("invoice-reminder", f.INVOICE), proposed: () => proposed.invoiceReminderEmail(f.INVOICE) },
  { id: "receipt-card", name: "Receipt, paid by card", journey: "Billing", kind: "receipt", channels: ["email", "text"], klass: "transactional", renderer: "src/emails/account-messages.ts", prototype: ["text"], exportName: "ReceiptCard",
    when: "When a card payment goes through, after a visit is marked done or an invoice is paid on the pay page. The email carries What we did under the money (not when the invoice left the report out). The email is built; the text is a prototype.", ...receipt("card") },
  { id: "receipt-check", name: "Receipt, paid by check", journey: "Billing", kind: "receipt", channels: ["email", "text"], klass: "transactional", renderer: "src/emails/account-messages.ts", prototype: ["text"], exportName: "ReceiptCheck",
    when: "When the office records a check. The method reads \"Check\" and its number.", ...receipt("check") },
  { id: "receipt-venmo", name: "Receipt, paid by Venmo", journey: "Billing", kind: "receipt", channels: ["email", "text"], klass: "transactional", renderer: "src/emails/account-messages.ts", prototype: ["text"], exportName: "ReceiptVenmo",
    when: "When the office records a Venmo payment. The method reads \"Venmo @andrea-d\".", ...receipt("venmo") },
  { id: "receipt-cash", name: "Receipt, paid in cash", journey: "Billing", kind: "receipt", channels: ["email", "text"], klass: "transactional", renderer: "src/emails/account-messages.ts", prototype: ["text"], exportName: "ReceiptCash",
    when: "When the office records cash.", ...receipt("cash") },
  { id: "refund", name: "Refund receipt", journey: "Billing", kind: "none", channels: ["email", "text"], klass: "transactional", renderer: "not built", prototype: ["text", "email"], exportName: "Refund",
    when: "When the office refunds a payment (a negative payment row). Today nothing is sent. Prototype: the amount, the card, the service and the street, the day, the number, and nothing about how long it takes.", text: (first) => refundText(f.REFUND, { optOut: first }), proposed: () => proposed.refundEmail(f.REFUND) },
  { id: "card-failed", name: "Card didn't go through", journey: "Billing", kind: "card-failed", channels: ["email"], klass: "transactional", renderer: "src/emails/account-messages.ts", exportName: "CardFailed",
    when: "When a card charge fails after a visit is marked done: the visit, the card and the amount, and a link to add a new one.", current: live("card-failed", f.CARD_FAILED), proposed: () => proposed.cardFailedEmail(f.CARD_FAILED) },
  { id: "card-link", name: "Update your card (the link)", journey: "Billing", kind: "card-failed", channels: ["email"], klass: "transactional", renderer: "src/emails/account-messages.ts", exportName: "CardLink",
    when: "When the office presses Send card link, for a customer with no card or an old one. The same kind as the failed charge, with no visit behind it.", current: live("card-failed", f.CARD_LINK), proposed: () => proposed.cardFailedEmail(f.CARD_LINK) },
  { id: "card-expiring", name: "Card expiring", journey: "Billing", kind: "card-expiring", channels: ["email"], klass: "transactional", renderer: "src/emails/account-messages.ts", exportName: "CardExpiring",
    when: "Before the month a card on file expires, once per customer, when visits are still to come.", current: live("card-expiring", f.CARD_EXPIRING), proposed: () => proposed.cardExpiringEmail(f.CARD_EXPIRING) },

  // ---- Season Pass
  // ---- Requests and quotes (prototypes, Nov 20 2026: Hannah's answers 1 to 9 in docs/plans/2026-11-20-requests-and-quotes-research.md)
  { id: "request-received", name: "Request received", journey: "Requests and quotes", kind: "none", channels: ["email"], klass: "transactional", renderer: "not built", prototype: ["email"], mayNameRequest: true, exportName: "RequestReceived",
    when: "Right after someone sends a request from the website: that it arrived and what they asked. An email only, because a stranger's phone has not opted in to texts. It says nothing about when anyone will reply and has no account link.", proposed: () => q.requestReceivedEmail(f.REQUEST_RECEIVED) },
  { id: "quote", name: "Your quote", journey: "Requests and quotes", kind: "none", channels: ["text", "email"], klass: "transactional", renderer: "not built", prototype: ["text", "email"], exportName: "Quote", firstText: true,
    when: "When Ryan presses Send a quote: the total, the deposit only when he set one, and one link to approve or decline. Text or email by the customer's contact preference.", text: (first) => quoteSms(qf(f.QUOTE), { optOut: first }), proposed: () => q.quoteEmail(f.QUOTE) },
  { id: "quote-reminder", name: "Quote reminder", journey: "Requests and quotes", kind: "none", channels: ["text", "email"], klass: "transactional", renderer: "not built", prototype: ["text", "email"], exportName: "QuoteReminder",
    when: "Only when Ryan presses Remind on a quote that is waiting, once a day at most, never automatic. The quote again under a reminder heading.", text: (first) => quoteReminderSms(qf(f.QUOTE), { optOut: first }), proposed: () => q.quoteReminderEmail(f.QUOTE) },
  { id: "quote-approved", name: "Quote approved", journey: "Requests and quotes", kind: "none", channels: ["text", "email"], klass: "transactional", renderer: "not built", prototype: ["text", "email"], exportName: "QuoteApproved",
    when: "After the customer approves from the link, and after Ryan marks a quote approved if he chooses to tell them. With a deposit it says the deposit was received; its receipt is its own message.", text: (first) => quoteApprovedSms({ ...qf(f.QUOTE_APPROVED), depositPaid: true }, { optOut: first }), proposed: () => q.quoteApprovedEmail(f.QUOTE_APPROVED) },
  { id: "quote-declined", name: "Quote declined", journey: "Requests and quotes", kind: "none", channels: ["text", "email"], klass: "transactional", renderer: "not built", prototype: ["text", "email"], exportName: "QuoteDeclined",
    when: "After the customer declines from the link: that the answer was received, and the phone. It says nothing about money.", text: (first) => quoteDeclinedSms(qf(f.QUOTE), { optOut: first }), proposed: () => q.quoteDeclinedEmail(f.QUOTE) },

  { id: "purchase-confirmation", name: "Purchase confirmation", journey: "Season Pass", kind: "purchase-confirmation", channels: ["email"], klass: "transactional", renderer: "src/emails/purchase-confirmation.ts", exportName: "PurchaseConfirmation",
    when: "When a Season Pass is sold, on the website or by the office: the card, each visit's day, what Ryan does, the money line and the account.", current: live("purchase-confirmation", f.PURCHASE), proposed: () => proposed.purchaseConfirmationEmail(f.PURCHASE) },
  { id: "preference-request", name: "Preference request", journey: "Season Pass", kind: "none", channels: ["text", "email"], klass: "transactional", renderer: "not built", prototype: ["text", "email"], exportName: "PreferenceRequest",
    when: "Before the window of a visit we schedule for the customer (the fall blowout, the spring turn-on) when it needs a timing: the visit, the street, the three choices and the one sentence about scheduling. A text or an email by the contact preference; its link opens that visit's page, where the same choice sits as a quiet banner (and on Home, the Season Pass tab and Details).", text: (first) => preferenceRequestText(f.PREFERENCE_REQUEST, { optOut: first }), proposed: () => preferenceRequestEmail(f.PREFERENCE_REQUEST) },
  { id: "renewal", name: "Renewal", journey: "Season Pass", kind: "renewal", channels: ["email"], klass: "marketing", renderer: "src/emails/account-messages.ts", exportName: "Renewal",
    when: "Once next season opens, to customers who chose marketing emails: reserve next season and pick the days in the same step. It is marketing, so it carries an Unsubscribe link in the proposed layout.", current: live("renewal", f.RENEWAL), proposed: () => proposed.renewalEmail(f.RENEWAL, f.TIPS.unsubscribeUrl) },
  { id: "cancelled", name: "Season Pass canceled", journey: "Season Pass", kind: "cancelled", channels: ["email"], klass: "transactional", renderer: "src/emails/account-messages.ts", exportName: "SeasonPassCanceled",
    when: "When a Season Pass is canceled: the remaining visits are off the schedule, and how to book one later.", current: live("cancelled", f.CANCELLED), proposed: () => proposed.cancelledEmail(f.CANCELLED) },

  // ---- Marketing
  { id: "tips", name: "The tips email", journey: "Marketing", kind: "pre-sell", channels: ["email"], klass: "marketing", renderer: "not built", prototype: ["email"], exportName: "TipsEmail",
    when: "To customers who ticked \"Tips and offers by email\". The layout of a marketing message with its Unsubscribe footer; the tip itself is Ryan's to write, so the words are marked placeholders.", proposed: () => proposed.tipsEmail(f.TIPS) },

  // ---- Account
  { id: "sign-in", name: "Sign-in link", journey: "Account", kind: "sign-in", channels: ["email"], klass: "transactional", renderer: "src/emails/sign-in.ts", exportName: "SignIn",
    when: "When someone asks to sign in to their Trailhead account with an email address: one link, good once and for 10 minutes.", current: () => liveSignIn({ url: f.SIGN_IN.url, host: f.SIGN_IN.host }), proposed: () => proposed.signInEmail(f.SIGN_IN) },

  // ---- To the crew, not the customer
  { id: "not-closed-crew", name: "Not marked done", journey: "To the crew, not the customer", kind: "not-closed-crew", channels: ["email"], klass: "to the crew", renderer: "src/emails/booking-and-staff.ts", exportName: "NotMarkedDone",
    when: "To the owner and admins the morning after a visit's day passed without Mark done: nothing charges until it is.", current: live("not-closed-crew", f.NOT_CLOSED), proposed: () => proposed.notClosedCrewEmail(f.NOT_CLOSED) },
  { id: "admin-alert", name: "Admin alert", journey: "To the crew, not the customer", kind: "admin-alert", channels: ["email"], klass: "to the crew", renderer: "src/emails/booking-and-staff.ts", exportName: "AdminAlert",
    when: "To the owner and admins for a new Season Pass, a declined card, tomorrow's crew summary, or a customer changing a visit.", current: live("admin-alert", f.ADMIN_ALERT), proposed: () => proposed.adminAlertEmail(f.ADMIN_ALERT) },
  { id: "customer-changed", name: "A customer changed a visit", journey: "To the crew, not the customer", kind: "none (staff text)", channels: ["text"], klass: "to the crew", renderer: "src/lib/portal/alerts.ts", exportName: "CustomerChanged",
    when: "To each owner and admin with a mobile number when a customer moves or cancels their own visit: the same words as the Home row, no STOP line.", text: () => customerChangedText("Andrea Dalton canceled Repair, Wed, Apr 28, Erie. The day is free.") },
  { id: "new-request-staff", name: "A new request", journey: "To the crew, not the customer", kind: "none (staff)", channels: ["email", "text"], klass: "to the crew", renderer: "not built", prototype: ["email", "text"], mayNameRequest: true, exportName: "NewRequest",
    when: "To the owner and admins on every request: the person, what they asked and their words. The alert email Ryan already gets stays; the text goes to an owner or admin with a mobile number.", text: () => newRequestStaffText({ name: f.NEW_REQUEST.name, service: f.NEW_REQUEST.service, town: f.NEW_REQUEST.town }), proposed: () => q.newRequestStaffEmail(f.NEW_REQUEST) },
  { id: "quote-decided-staff", name: "A quote was decided", journey: "To the crew, not the customer", kind: "none (staff)", channels: ["email", "text"], klass: "to the crew", renderer: "not built", prototype: ["email", "text"], exportName: "QuoteDecided",
    when: "To the owner and admins when a customer approves or declines a quote: who, the number, the total and the deposit when there is one.", text: () => quoteDecidedStaffText({ name: f.QUOTE_DECIDED.name, number: f.QUOTE_DECIDED.number, total: "$1,200", outcome: "approved" }), proposed: () => q.quoteDecidedStaffEmail(f.QUOTE_DECIDED) },
  { id: "crew-assigned", name: "Crew assigned", journey: "To the crew, not the customer", kind: "none", channels: ["text"], klass: "to the crew", renderer: "not built", prototype: ["text"], exportName: "CrewAssigned",
    when: "To the person a visit is given to. The admin walkthrough's Schedule dialog offers a crew text; no code sends one. Prototype: the day, the time, the service, the customer, the street and one link.", text: () => crewAssignedText({ day: "2027-04-28", startTime: "10:30", serviceName: "repair", customer: f.CREW.customer, address: f.STREET, town: f.CREW.town, visitUrl: f.CREW.visitUrl }) },
]

export const byId = (id: string) => MESSAGES.find((m) => m.id === id)!

/** The id of a message's laptop or phone story, the same way Storybook builds it (the group's title and the export name). */
export const storyIdOf = (m: MessageDef, view: "laptop" | "phone") => toId(JOURNEY_TITLE[m.journey], storyNameFromExport(view === "laptop" ? m.exportName : `${m.exportName}OnAPhone`))
