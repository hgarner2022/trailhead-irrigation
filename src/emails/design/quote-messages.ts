// The emails of requests and quotes, on the proposed frame (./frame.ts). Prototypes: nothing sends them and no live renderer is touched. Every sentence is built from a
// fact the message holds (the service, the street, the total, the deposit, the number, the link) by `src/lib/portal/quote-words.ts`, or is Hannah's own answer of
// Nov 20 2026: the thank-you after a request states no call-back time ("Thanks. We've got your request."), a quote is approved or declined from its link, a
// reminder goes only when Ryan presses Remind, and a deposit's receipt always goes out. No promise of a time, no "free", no guarantee, no refund terms and no
// expiry appear anywhere.
import { quoteApprovedLead, quoteApprovedSubject, quoteDeclinedLead, quoteDeclinedSubject, quoteLead, quoteReminderLead, quoteReminderSubject, quoteSubject, REQUEST_THANKS, requestReceivedSubject, type QuoteFacts } from "@/lib/portal/quote-words"
import { BUSINESS, SIGN_OFF, dollars } from "../format"
import { greetingLine } from "../layout"
import type { RenderedEmail } from "../types"
import { button, compose, paragraph, summary, type Part } from "./frame"

export interface QuoteEmailData {
  origin: string
  firstName: string
  accountUrl: string
  /** "Q-2026-0007" */
  number: string
  /** "Christmas lights" */
  serviceName: string
  address: string
  /** the lines frozen in the quote */
  lines: { name: string; description?: string; amount: number }[]
  total: number
  /** whole dollars, only when the quote asks for one */
  deposit: number | null
  /** the deposit went through (an approved quote) */
  depositPaid?: boolean
  quoteUrl: string
}

const facts = (d: QuoteEmailData): QuoteFacts & { depositPaid?: boolean } => ({ first: d.firstName, service: d.serviceName, address: d.address, total: dollars(d.total), ...(d.deposit ? { deposit: dollars(d.deposit) } : {}), number: d.number, link: d.quoteUrl, depositPaid: d.depositPaid })

const customerDoc = (d: QuoteEmailData, o: { preheader: string; title: string; lead: string; parts: Part[]; why: string }) => compose({ origin: d.origin, greeting: greetingLine(d.firstName), accountUrl: d.accountUrl, signOff: SIGN_OFF, ...o })

/** The quote as the customer reads it: the total as the key figure, the lines under it, and the deposit only when there is one. */
const quoteSummary = (d: QuoteEmailData): Part =>
  summary({
    key: { label: "Total", value: dollars(d.total), ...(d.deposit ? { note: `${dollars(d.deposit)} deposit due when you approve` } : {}) },
    facts: [["Quote", d.number], ["Where", d.address]],
    lines: d.lines.map((l) => ({ label: l.name, value: dollars(l.amount), ...(l.description ? { detail: l.description } : {}) })),
  })

const WHY_QUOTE = "You are getting this because Trailhead sent you a quote."

export function quoteEmail(d: QuoteEmailData): RenderedEmail {
  const f = facts(d)
  const out = customerDoc(d, { preheader: `${dollars(d.total)} for ${d.serviceName} at ${d.address}.`, title: "Your quote is ready", lead: quoteLead(f), parts: [quoteSummary(d), button(d.quoteUrl, "View your quote")], why: WHY_QUOTE })
  return { subject: quoteSubject(f), ...out }
}

export function quoteReminderEmail(d: QuoteEmailData): RenderedEmail {
  const f = facts(d)
  const out = customerDoc(d, { preheader: `${dollars(d.total)} for ${d.serviceName} at ${d.address}.`, title: "A reminder about your quote", lead: quoteReminderLead(f), parts: [quoteSummary(d), button(d.quoteUrl, "View your quote")], why: WHY_QUOTE })
  return { subject: quoteReminderSubject(f), ...out }
}

export function quoteApprovedEmail(d: QuoteEmailData): RenderedEmail {
  const f = facts(d)
  const out = customerDoc(d, {
    preheader: `${dollars(d.total)} for ${d.serviceName} at ${d.address}.`,
    title: "Quote approved",
    lead: quoteApprovedLead(f),
    parts: [summary({ key: { label: "Approved", value: dollars(d.total), ...(d.depositPaid && d.deposit ? { note: `${dollars(d.deposit)} deposit received` } : {}) }, facts: [["Quote", d.number], ["Where", d.address]] }), button(d.quoteUrl, "View your quote")],
    why: WHY_QUOTE,
  })
  return { subject: quoteApprovedSubject(f), ...out }
}

export function quoteDeclinedEmail(d: QuoteEmailData): RenderedEmail {
  const f = facts(d)
  const out = customerDoc(d, {
    preheader: `Text or call Ryan at ${BUSINESS.phone}.`,
    title: "Quote declined",
    lead: quoteDeclinedLead(f),
    parts: [summary({ facts: [["Quote", d.number], ["Where", d.address], ["Total", dollars(d.total)]] }), paragraph(`Text or call Ryan at ${BUSINESS.phone}.`)],
    why: WHY_QUOTE,
  })
  return { subject: quoteDeclinedSubject(f), ...out }
}

// ---- the request ----------------------------------------------------------------------------------------------------------

export interface RequestReceivedData {
  origin: string
  firstName: string
  /** the service asked for, or empty for a plain question */
  serviceName: string
  address: string
  /** the person's own words */
  words: string
}

/**
 * The one email to a person who asked: that it arrived, and what they asked, so they can see it was read right. No call-back time (Hannah, Nov 20 2026), no account
 * link (a stranger's address could be typed by someone else), no button.
 */
export function requestReceivedEmail(d: RequestReceivedData): RenderedEmail {
  const out = compose({
    origin: d.origin,
    preheader: d.serviceName ? `${d.serviceName}${d.address ? ` at ${d.address}` : ""}.` : "Your request arrived.",
    title: requestReceivedSubject,
    greeting: greetingLine(d.firstName),
    lead: REQUEST_THANKS,
    parts: [summary({ facts: [...(d.serviceName ? [["Asked for", d.serviceName] as [string, string]] : []), ...(d.address ? [["Where", d.address] as [string, string]] : []), ...(d.words ? [["You wrote", d.words] as [string, string]] : [])] })],
    why: "You are getting this because you sent a request on our website.",
    signOff: SIGN_OFF,
  })
  return { subject: requestReceivedSubject, ...out }
}

// ---- to the office ----------------------------------------------------------------------------------------------------------

export interface NewRequestStaffData {
  origin: string
  name: string
  service: string
  town: string
  phone: string
  email: string
  words: string
  requestId: string
}

/** To the owner and admins on every request. The existing alert email stays; this is the same note in the frame, with the person's words. */
export function newRequestStaffEmail(d: NewRequestStaffData): RenderedEmail {
  const out = compose({
    origin: d.origin,
    preheader: "Open it in the admin to accept it or archive it.",
    title: "New request",
    lead: `${d.name}${d.town ? ` in ${d.town}` : ""} asked${d.service ? ` about ${d.service}` : " a question"}.`,
    parts: [summary({ facts: [["Phone", d.phone || "None given"], ["Email", d.email || "None given"], ...(d.words ? [["They wrote", d.words] as [string, string]] : [])] }), button(`${d.origin}/admin/requests?request=${d.requestId}`, "Open it in the admin")],
    why: "A note for the Trailhead office.",
  })
  return { subject: `New request: ${d.name}${d.service ? `, ${d.service}` : ""}${d.town ? `, ${d.town}` : ""}`, ...out }
}

export interface QuoteDecidedStaffData {
  origin: string
  name: string
  number: string
  total: number
  deposit: number | null
  outcome: "approved" | "declined"
  jobPath: string
}

/** To the owner and admins when a customer approves or declines a quote. */
export function quoteDecidedStaffEmail(d: QuoteDecidedStaffData): RenderedEmail {
  const word = d.outcome === "approved" ? "approved" : "declined"
  const out = compose({
    origin: d.origin,
    preheader: "Open it in the admin.",
    title: `Quote ${word}`,
    lead: `${d.name} ${word} quote ${d.number}, ${dollars(d.total)}.`,
    parts: [summary({ facts: [["Quote", d.number], ["Total", dollars(d.total)], ...(d.deposit ? [["Deposit", d.outcome === "approved" ? `${dollars(d.deposit)} paid` : `${dollars(d.deposit)} asked for`] as [string, string]] : [])] }), button(`${d.origin}${d.jobPath}`, "Open it in the admin")],
    why: "A note for the Trailhead office.",
  })
  return { subject: `${d.name} ${word} quote ${d.number}, ${dollars(d.total)}`, ...out }
}
