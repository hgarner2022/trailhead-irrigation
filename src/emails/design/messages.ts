// Every customer and office email, rebuilt on the proposed frame (./frame.ts). The WORDS are the live words (the same helpers, the same sentences);
// only the layout changes, so the story can show Current and Proposed side by side and a test can check that no fact, number or day was lost.
// Four messages do not exist yet (refund, visit canceled by us, the tips email) and are prototypes: each sentence of them comes from a sourced one.
import { googleCalendarUrl } from "../calendar"
import { bodyOf, capitalFirst, defaultBody, fillTemplate, withoutGreeting, type EditableMessage, type Overrides } from "../editable"
import {
  ACCOUNT_NAME, ADD_CARD_LINE, BUSINESS, CONFIRM_LINE, RYAN_DOES, SEE_JOB, SIGN_OFF, TEXT_RYAN_LINE, atVisitMoneyLine, dollars, longDay, moneyLine, timeText, whenText, whoIsComing,
} from "../format"
import { doneWords, linesOf, sentence } from "../job-table"
import { greetingLine, greetingName } from "../layout"
import { visitReport } from "../visit-report"
import { renderEmail } from "../render"
import type {
  AdminAlertData, BookingConfirmationData, CancelledData, CardExpiringData, CardFailedData, EmailLine, InvoiceData, NotClosedCrewData, ReceiptData, RenderedEmail, RenewalData, SignInData,
  PurchaseConfirmationData, VisitCancelledData, VisitData,
} from "../types"
import { lastChangeDay } from "@/sms/texts"
import type { PlainData } from "../plain"
import { button, compose, fallbackLink, links, paragraph, paragraphHtml, small, summary, type Part } from "./frame"

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const at = (address?: string | null) => (address ? ` at ${address}` : "")
const account = `your ${ACCOUNT_NAME}`
const customerDoc = (d: { origin: string; firstName: string; accountUrl: string }, o: { preheader: string; title: string; lead?: string; parts: Part[]; why: string; signOff?: string; unsubscribeUrl?: string }) =>
  compose({ origin: d.origin, greeting: greetingLine(d.firstName), accountUrl: d.accountUrl, signOff: SIGN_OFF, ...o })

/** The subject is the live subject, word for word: this redesign does not touch subjects. */
const subjectOf = (kind: string, data: Record<string, unknown>) => renderEmail(kind, data)!.subject

/** The same calendar links the visit emails carry, as text links. */
const calendarLinks = (v: VisitData["visit"]) => links([{ href: googleCalendarUrl(v), label: "Add to Google Calendar" }, { href: v.icsUrl, label: "Add to Apple or Outlook calendar" }])

// ---- the visit emails ------------------------------------------------------------------------------------------------------

const WHY_COMING = "You are getting this because Trailhead is coming to your property."

/** The editable first sentence, filled from the visit, exactly as `date-messages.ts` fills it. */
function intro(key: EditableMessage["key"], d: VisitData, templates?: Overrides): string {
  const v = d.visit
  if (key === "date-moved" && v.sameDay === true && v.startTime) return `Your ${v.name} is still ${longDay(v.day)}, now at ${timeText(v.startTime)}.`
  let body = withoutGreeting(bodyOf(templates, key, "email")) || defaultBody(key, "email")
  const name = greetingName(d.firstName)
  if (!name) body = body.replace(/,?\s*\{firstName\}\s*([,.])?/g, (_m, p: string | undefined) => (p === "." ? "." : "")).trim() || defaultBody(key, "email")
  return capitalFirst(fillTemplate(body, { firstName: name ?? "", service: v.name, address: v.address, day: longDay(v.day), time: v.startTime ? timeText(v.startTime) : null, who: v.who }))
}

/** The visit summary: the day and exact time as the key figure, who is coming and where under it. */
const visitSummary = (v: VisitData["visit"]) => summary({ key: { label: "Your visit", value: whenText(v.day, v.startTime) }, facts: [["Who is coming", whoIsComing(v)], ["Where", v.location]] })

function visitEmail(d: VisitData, kind: string, title: string, sentence_: string, preheader: string, o: { late?: boolean; subject?: string } = {}): RenderedEmail {
  const v = d.visit
  const phone = `<a class="lnk" href="${BUSINESS.phoneTel}" style="font-weight:700">${esc(BUSINESS.phone)}</a>`
  const ask: Part = o.late
    ? paragraphHtml(`Need to change it? Text Ryan at ${phone}.`, TEXT_RYAN_LINE)
    : v.visitUrl
      ? paragraph(`Need a different day? Last day to change online: ${lastChangeDay(v.day)}.`)
      : paragraph(`Need a different day? Change it, or anything else, in ${account}.`)
  const action = o.late ? button(BUSINESS.phoneTel.replace("tel:", "sms:"), "Text Ryan") : v.visitUrl ? button(v.visitUrl, "Change this visit") : button(d.signInUrl, `Open your ${ACCOUNT_NAME}`)
  const out = customerDoc(d, { preheader, title, lead: sentence_, parts: [visitSummary(v), ask, action, calendarLinks(v)], why: WHY_COMING })
  return { subject: o.subject ?? "", ...out }
}

export const dateSetEmail = (d: VisitData, t?: Overrides) =>
  visitEmail(d, "date-set", `Your ${d.visit.name} has a day`, intro("date-set", d, t), "Add it to your calendar below, or pick another day in your Trailhead account.", { subject: subjectOf("date-set", d as never) })

export function dateMovedEmail(d: VisitData, t?: Overrides): RenderedEmail {
  const v = d.visit
  const note = v.note ? ` ${v.note.replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim()}` : ""
  const sentence_ = `${intro("date-moved", d, t)}${note}${v.asked ? " Someone needs to be home, so please confirm that day works, or pick another day in your Trailhead account." : ""}`
  return v.sameDay === true && v.startTime
    ? visitEmail(d, "date-moved", `Your ${v.name} has a time`, sentence_, "Add the time to your calendar below, or pick another day in your Trailhead account.", { subject: subjectOf("date-moved", d as never) })
    : visitEmail(d, "date-moved", `Your ${v.name} moved`, sentence_, "Add the new day to your calendar below, or pick another day in your Trailhead account.", { subject: subjectOf("date-moved", d as never) })
}

const ryanDoes = (name: string) => (name.includes("inspection") ? RYAN_DOES.inspection : name.includes("blowout") ? RYAN_DOES.blowout : RYAN_DOES["turn-on"])

export const dateConfirmEmail = (d: VisitData, t?: Overrides) =>
  visitEmail(d, "date-confirm", `Your ${d.visit.name} is in two weeks`, `${intro("date-confirm", d, t)} ${ryanDoes(d.visit.name)}`, "We remind you again the day before. Pick another day in your Trailhead account if you need to.", { subject: subjectOf("date-confirm", d as never) })

export const dayBeforeEmail = (d: VisitData, t?: Overrides) =>
  visitEmail(d, "day-before", "We're coming tomorrow", intro("day-before", d, t), d.visit.startTime ? `${whoIsComing(d.visit)} will be there at ${timeText(d.visit.startTime)}.` : `${whoIsComing(d.visit)} is coming tomorrow.`, { late: true, subject: subjectOf("day-before", d as never) })

export function bookingConfirmationEmail(d: BookingConfirmationData): RenderedEmail {
  const v = d.visit
  const out = customerDoc(d, {
    preheader: "We remind you the day before. Add it to your calendar below.",
    title: `Your ${v.name} is booked`,
    lead: `${whoIsComing(v)} will be there ${whenText(v.day, v.startTime)}. We remind you the day before.`,
    parts: [visitSummary(v), v.visitUrl ? button(v.visitUrl, "Change this visit") : button(d.signInUrl, `Open your ${ACCOUNT_NAME}`), calendarLinks(v)],
    why: "You are getting this because you booked a visit with Trailhead.",
  })
  return { subject: subjectOf("booking-confirmation", d as never), ...out }
}

// ---- money -----------------------------------------------------------------------------------------------------------------

const lineRows = (lines: EmailLine[]) => lines.map((l) => ({ label: sentence(l.name), value: dollars(l.amount), detail: l.quantity && l.quantity !== 1 && l.unitPrice !== undefined ? `${l.quantity} x ${dollars(l.unitPrice)}` : undefined }))
const moneyBlock = (lines: EmailLine[], subtotal: number, tax: number | undefined, total: number, totalLabel = "Total"): Part =>
  summary({ lines: lineRows(lines), totals: (tax ?? 0) > 0 || lines.length > 1 ? [{ label: "Subtotal", value: dollars(subtotal) }, ...((tax ?? 0) > 0 ? [{ label: "Sales tax", value: dollars(tax!) }] : [])] : [], total: [totalLabel, dollars(total)] })

export function receiptEmail(d: ReceiptData): RenderedEmail {
  const lines = linesOf(d)
  const subtotal = d.subtotal ?? lines.reduce((sum, l) => sum + l.amount, 0)
  const total = d.total ?? subtotal + (d.tax ?? 0)
  const how = d.paidBy ?? d.card
  const intro_ = `Thank you. Your ${d.serviceName}${at(d.address)} is paid.`
  const facts: [string, string][] = [
    ...(d.address ? ([["Where", d.address]] as [string, string][]) : []),
    ...(d.day ? ([["Done", doneWords(d.day, d.who)]] as [string, string][]) : []),
    ...(d.number ? ([["Receipt", d.number]] as [string, string][]) : []),
    ...(d.invoiceNumber ? ([["Invoice", d.invoiceNumber]] as [string, string][]) : []),
  ]
  const why = d.invoiceNumber ? `You are getting this because you paid invoice ${d.invoiceNumber}.` : "You are getting this because a visit of yours was completed."
  const report = d.report ? visitReport(d.report, "receipt") : null
  const out = customerDoc(d, {
    preheader: `Paid ${dollars(d.amount)}${how ? `, ${how}` : ""}${d.paidOn ? `, on ${longDay(d.paidOn)}` : ""}.`,
    title: "Paid, thank you",
    lead: intro_,
    parts: [
      summary({ key: { label: "Paid", value: dollars(d.amount), note: `${how ? sentence(how) : ""}${how && d.paidOn ? ", " : ""}${d.paidOn ? longDay(d.paidOn) : ""}` || undefined }, facts }),
      moneyBlock(lines, subtotal, d.tax, total),
      ...(report ? [{ html: report.html, text: report.text } as Part] : []),
      ...(d.nextLine ? [paragraph(d.nextLine)] : []),
      button(d.signInUrl, SEE_JOB),
      ...(d.receiptUrl ? [links([{ href: d.receiptUrl, label: "View the receipt" }])] : []),
    ],
    why,
  })
  return { subject: subjectOf("receipt", d as never), ...out }
}

function invoice(d: InvoiceData, title: string, intro_: string, kind: "invoice" | "invoice-reminder"): RenderedEmail {
  const report = d.report ? visitReport(d.report) : null
  const facts: [string, string][] = [["Invoice", d.invoiceNumber], ...(d.address ? ([["Where", d.address]] as [string, string][]) : []), ...(d.day ? ([["Done", doneWords(d.day, d.who)]] as [string, string][]) : [])]
  const out = customerDoc(d, {
    preheader: `Due ${longDay(d.dueOn)}. Pay online, or see it in your account.`,
    title,
    lead: intro_,
    parts: [
      summary({ key: { label: "Amount due", value: dollars(d.total), note: `Due ${longDay(d.dueOn)}` }, facts }),
      button(d.payUrl, `Pay ${dollars(d.total)}`),
      moneyBlock(d.lines, d.amount, d.tax, d.total),
      ...(report ? [{ html: report.html, text: report.text } as Part] : []),
      links([{ href: d.signInUrl, label: SEE_JOB }]),
    ],
    why: `You are getting this about invoice ${d.invoiceNumber} for your ${d.visitName}.`,
  })
  return { subject: subjectOf(kind, d as never), ...out }
}
const where = (d: InvoiceData) => (d.address ? ` at ${d.address}` : "")
export const invoiceEmail = (d: InvoiceData) => invoice(d, "Your invoice is ready", `Here is your invoice for the ${d.visitName}${where(d)}: ${dollars(d.total)}, due ${longDay(d.dueOn)}.`, "invoice")
export const invoiceReminderEmail = (d: InvoiceData) => invoice(d, "A reminder about your invoice", `A reminder that ${dollars(d.total)} for the ${d.visitName} is still unpaid, due ${longDay(d.dueOn)}.`, "invoice-reminder")

const WHY_CARD = `You are getting this about the card in ${account}.`

export function cardFailedEmail(d: CardFailedData): RenderedEmail {
  const intro_ = d.visitName
    ? `Your ${d.visitName}${at(d.address)} is done, but your ${d.card ?? "card"} didn't go through${d.amount !== null ? ` for ${dollars(d.amount)}` : ""}.`
    : `Here is the link to update the card in ${account}.`
  // Corrected words (inventory CP 2): no "right away", no "it takes a minute", no promise of a reply.
  const how = d.updateUrl ? (d.visitName ? "Add a new card." : "") : `Call or text Ryan at ${BUSINESS.phone} to update your card.`
  const out = customerDoc(d, {
    preheader: d.updateUrl ? "The link is good for 24 hours." : `Call or text Ryan at ${BUSINESS.phone}.`,
    title: d.visitName ? "Your card needs a quick update" : "Update your card",
    lead: intro_,
    parts: [...(how ? [paragraph(how)] : []), d.updateUrl ? button(d.updateUrl, "Update your card") : button(d.signInUrl, `Open ${account}`), ...(d.updateUrl ? [small(`The link is good for 24 hours. Your ${ACCOUNT_NAME} can make a new one.`)] : [])],
    why: WHY_CARD,
  })
  return { subject: subjectOf("card-failed", d as never), ...out }
}

export function cardExpiringEmail(d: CardExpiringData): RenderedEmail {
  const card = d.card ?? "card"
  const intro_ = `The card we have for your visits ${d.cardState}${d.left > 0 ? `, and ${dollars(d.left)} of visits are still to come` : ""}.`
  const out = customerDoc(d, {
    preheader: d.updateUrl ? "The link is good for 24 hours." : `Call or text Ryan at ${BUSINESS.phone}.`,
    title: d.cardState.includes("expires") ? "Your card expires soon" : "Your card needs replacing",
    lead: intro_,
    parts: [
      summary({ key: { label: card, value: d.cardState } }),
      ...(d.updateUrl ? [] : [paragraph(`Call or text Ryan at ${BUSINESS.phone} to add a new card.`)]),
      d.updateUrl ? button(d.updateUrl, "Add a new card") : button(d.signInUrl, `Open ${account}`),
      ...(d.updateUrl ? [small("The link is good for 24 hours.")] : []),
    ],
    why: WHY_CARD,
  })
  return { subject: subjectOf("card-expiring", d as never), ...out }
}

// ---- Season Pass and visits canceled ---------------------------------------------------------------------------------------

export function cancelledEmail(d: CancelledData): RenderedEmail {
  const pass = d.season ? `${d.season} Season Pass` : "Season Pass"
  const how = `If you want a visit later, book online or call ${BUSINESS.phone}.`
  const out = customerDoc(d, {
    preheader: "Nothing more will be charged. Book online whenever you want a visit.",
    title: "Your Season Pass is canceled",
    lead: `Your ${pass} is canceled and your remaining visits are off the schedule. We won't charge you again.`,
    parts: [paragraph(how), button(`${d.origin}/book`, "Book a visit")],
    why: `You are getting this because your ${pass} was canceled.`,
  })
  return { subject: subjectOf("cancelled", d as never), ...out }
}

export function visitCancelledEmail(d: VisitCancelledData): RenderedEmail {
  const when = d.day ? ` on ${longDay(d.day)}` : ""
  const link = d.visitUrl ?? d.signInUrl
  const out = customerDoc(d, {
    preheader: "Text or call Ryan whenever you want it back on the schedule.",
    title: `Your ${d.serviceName} is canceled`,
    lead: `Your ${d.serviceName}${at(d.address)}${when} is canceled. ${d.paid > 0 ? `The ${dollars(d.paid)} you paid stays as it is.` : "Nothing was charged."}`,
    parts: [paragraph(`Changed your mind? Text or call Ryan at ${BUSINESS.phone} to add it back.`), button(link, "See your visit")],
    why: "You are getting this because you canceled a visit in your Trailhead account.",
  })
  return { subject: subjectOf("visit-cancelled", d as never), ...out }
}

export function renewalEmail(d: RenewalData, unsubscribeUrl: string): RenderedEmail {
  const out = customerDoc(d, {
    preheader: `Pick your ${d.season} days in the same step. You pay after each visit.`,
    title: `Season Pass ${d.season} is open`,
    lead: `You can reserve your ${d.town} spring turn-on and fall blowout for ${d.season} now and pick your days in the same step.`,
    parts: [paragraph("You pay after each visit, on the card we have on file."), button(d.buyUrl, `Reserve ${d.season}`)],
    why: "You are getting this because you chose to hear about next season.",
    unsubscribeUrl,
  })
  return { subject: subjectOf("renewal", d as never), ...out }
}

/** CONFIRM_LINE without "by text": an email-only customer is not told about a text (inventory CP 12). */
const CONFIRM = CONFIRM_LINE.replace("by text ", "")

export function purchaseConfirmationEmail(d: PurchaseConfirmationData): RenderedEmail {
  const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`
  const allDated = d.visits.every((v) => v.visit)
  const addCard = !d.cardLast4 && d.cardUpdateUrl ? d.cardUpdateUrl : null
  const money = !d.cardLast4 && !addCard ? atVisitMoneyLine(d.visits) : moneyLine(d.visits, d.cardLast4)
  const lines = d.lines ?? []
  const image: Part = {
    html: `<p style="margin:0 0 24px"><a href="${esc(d.signInUrl)}"><img src="${esc(d.passImageUrl)}" width="536" alt="Season Pass ${d.season}${greetingName(d.firstName) ? ` for ${esc(greetingName(d.firstName)!)}` : ""}, ${esc(d.town)}" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:8px"></a></p>`,
    text: [],
  }
  const visits: Part[] = d.visits.map((v) => {
    const day = v.visit ? whenText(v.visit.day, v.visit.startTime) : v.fallback
    const block = summary({ key: { label: capital(v.name), value: day, note: v.note }, facts: v.visit ? [["What Ryan does", RYAN_DOES[v.kind]]] : [] })
    const cal = v.visit ? links([{ href: googleCalendarUrl(v.visit), label: "Add to Google Calendar" }, { href: v.visit.icsUrl, label: "Add to Apple or Outlook calendar" }]) : { html: "", text: [] }
    return { html: block.html + cal.html, text: [...block.text, ...cal.text] }
  })
  const out = customerDoc(d, {
    preheader: "We haven't charged you today. Your days and what you pay are below.",
    title: `Welcome to the ${d.season} season`,
    lead: `Your Season Pass for ${d.town} is reserved for ${d.season}. ${allDated ? "Here are your days." : "Ryan sets the days that are missing and we text them to you."}`,
    parts: [
      image,
      ...visits,
      ...(d.address ? [summary({ facts: [["Where", d.address]] })] : []),
      ...(lines.length ? [summary({ lines: lineRows(lines), total: ["Season total", dollars(lines.reduce((sum, l) => sum + l.amount, 0))] })] : []),
      paragraph(CONFIRM),
      paragraph(money),
      ...(addCard ? [paragraph(ADD_CARD_LINE)] : []),
      addCard ? button(addCard, "Add your card") : button(d.signInUrl, `Open your ${ACCOUNT_NAME}`),
      ...(addCard ? [links([{ href: d.signInUrl, label: `Open your ${ACCOUNT_NAME}` }])] : []),
    ],
    why: `You are getting this because you bought Season Pass ${d.passNumber}.`,
    signOff: "Less time in the yard. More time on the trail.",
  })
  return { subject: subjectOf("purchase-confirmation", d as never), ...out }
}

// ---- account, staff and the paused fallback --------------------------------------------------------------------------------

export function signInEmail(d: SignInData): RenderedEmail {
  const out = compose({
    origin: d.origin,
    preheader: "Your sign-in link works once and for ten minutes.",
    title: "Sign in to Trailhead",
    lead: `Use this link to sign in to Trailhead at ${d.host}.`,
    parts: [button(d.url, "Sign in"), small("The link works one time and expires in 10 minutes. If you didn't ask for it, ignore this email. Your account stays as it is."), fallbackLink(d.url)],
    why: "You are getting this because someone asked to sign in to Trailhead with this email address.",
    signOff: SIGN_OFF,
  })
  return { subject: "Your Trailhead sign-in link", ...out }
}

export function notClosedCrewEmail(d: NotClosedCrewData): RenderedEmail {
  const n = d.visits.length
  const out = compose({
    origin: d.origin,
    preheader: n === 1 ? "Open Home to mark it done." : "Open Home to mark them done.",
    title: "Not marked done",
    lead: n === 1 ? "One visit had its day and was not marked done. Nothing charges until it is." : `${n} visits had their day and were not marked done. Nothing charges until they are.`,
    parts: [summary({ facts: d.visits.map((v) => [v.name, `${v.customer}, ${v.town}, ${longDay(v.day)}`] as [string, string]) }), button(`${d.origin}/admin`, "Open Home")],
    why: "A note for the Trailhead crew.",
  })
  return { subject: subjectOf("not-closed-crew", d as never), ...out }
}

export function adminAlertEmail(d: AdminAlertData): RenderedEmail {
  const out = compose({ origin: d.origin, preheader: "Open it in the admin to see the rest.", title: d.title, lead: d.detail, parts: [button(`${d.origin}${d.path}`, "Open it in the admin")], why: "A note for the Trailhead office." })
  return { subject: d.title, ...out }
}

/** A text sent as an email while texts are paused: the text's own words in the one frame. */
export function plainEmail(d: PlainData, subject: string): RenderedEmail {
  const out = customerDoc({ ...d, accountUrl: `${d.origin}/account` }, {
    preheader: subject,
    title: subject,
    parts: [paragraph(d.plainBody.trim())],
    why: "You are getting this by email instead of a text.",
  })
  return { subject, ...out }
}

// ---- PROTOTYPES: messages that do not exist yet ----------------------------------------------------------------------------

export interface RefundData {
  origin: string
  firstName: string
  accountUrl: string
  signInUrl: string
  amount: number
  serviceName: string
  address: string
  /** "Visa ending 4242", or how the money went back */
  card: string
  /** ISO day of the refund row */
  refundedOn: string
  /** the refund's own receipt number */
  number: string
}

/** The refund receipt. Facts only: the amount, the card, the service and street, the day, the number. No timing sentence (the walkthrough's "5 to 10 days" has no source). */
export function refundEmail(d: RefundData): RenderedEmail {
  const out = customerDoc(d, {
    preheader: `Refunded ${dollars(d.amount)} to your ${d.card}, on ${longDay(d.refundedOn)}.`,
    title: "Refunded",
    lead: `We refunded ${dollars(d.amount)} to your ${d.card} for your ${d.serviceName}${at(d.address)}.`,
    parts: [summary({ key: { label: "Refunded", value: dollars(d.amount), note: `${d.card}, ${longDay(d.refundedOn)}` }, facts: [["Where", d.address], ["Receipt", d.number]] }), button(d.signInUrl, SEE_JOB)],
    why: "You are getting this because a payment of yours was refunded.",
  })
  return { subject: `Refund: ${dollars(d.amount)} to your ${d.card} for your ${d.serviceName}${at(d.address)}`, ...out }
}

export interface CanceledByUsData {
  origin: string
  firstName: string
  accountUrl: string
  signInUrl: string
  serviceName: string
  address: string
  day: string | null
  /** whole dollars already paid on the job; 0 when nothing was paid */
  paid: number
  visitUrl: string
}

/** A visit the office canceled. The fact, what is and is not charged (the same two sentences as a canceled-by-you visit, without the promise), and the phone. */
export function canceledByUsEmail(d: CanceledByUsData): RenderedEmail {
  const when = d.day ? ` on ${longDay(d.day)}` : ""
  const money = d.paid > 0 ? `The ${dollars(d.paid)} you paid stays as it is.` : "Nothing was charged."
  const out = customerDoc(d, {
    preheader: `Text or call Ryan at ${BUSINESS.phone}.`,
    title: `Your ${d.serviceName} is canceled`,
    lead: `Your ${d.serviceName}${at(d.address)}${when} is canceled. ${money}`,
    parts: [paragraph(`Text or call Ryan at ${BUSINESS.phone}.`), button(d.visitUrl, "See your visit")],
    why: "You are getting this because a visit of yours was canceled.",
  })
  return { subject: `Canceled: your ${d.serviceName}${at(d.address)}`, ...out }
}

export interface TipsData {
  origin: string
  firstName: string
  accountUrl: string
  unsubscribeUrl: string
}

/** The tips email: the layout of a marketing message. The tip itself is Ryan's to write, so the words here are marked placeholders, never real advice. */
export function tipsEmail(d: TipsData): RenderedEmail {
  const out = customerDoc(d, {
    preheader: "[Preheader: one line that adds to the subject]",
    title: "[Tip headline goes here]",
    lead: "[One or two sentences from Ryan go here.]",
    parts: [paragraph("[The tip, in Ryan's words, goes here.]"), button(`${d.origin}/book`, "Book Online")],
    why: "You are getting this because you chose marketing emails.",
    unsubscribeUrl: d.unsubscribeUrl,
  })
  return { subject: "[Subject: the tip, in a few words]", ...out }
}
