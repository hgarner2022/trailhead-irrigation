// The customer's wording for the portal, pure: one place for what a visit and a payment are called on the account screens
// (docs/plans/2026-11-18-customer-portal-design.md section 4; Hannah's words: Invoice, Unpaid, Past due, Canceled, never request or approve).
// The money words themselves come from `src/lib/money/words.ts`; this file only adds the customer's reading of them.
import { longDay, monthDay, monthName, monthShort, shortDay, weekdayName } from "@/lib/admin/format"
import { firstNameOf } from "@/lib/admin/people"
import { PHONE_DISPLAY } from "@/lib/nav"
import type { TimingPreference } from "@/lib/admin/types"
import { waitingDay } from "./preference-words"

export { firstNameOf }

/**
 * The name a customer reads beside a visit: the first name of a person who has a first and a last name ("Ryan Garner" gives "Ryan"). A one-word name or a label such as
 * "Second truck" (a truck's leftover name, not a person) gives null, and the visit is shown without a person. Customers see first names only.
 */
export function customerFacingFirstName(name: string | null | undefined): string | null {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? []
  if (words.length < 2 || /truck/i.test(name!)) return null
  return firstNameOf(name)
}

/** The day words live in `src/lib/admin/format.ts`; the portal reads them from here. */
export { weekdayName, longDay, shortDay }

/** "Dec 1". */
export const dueDay = (day: string) => `${monthShort(monthDay(day).month)} ${monthDay(day).day}`
/** "November 3, 2026": a sold or paid day in a list. */
export const fullDay = (day: string) => `${monthName(monthDay(day).month)} ${monthDay(day).day}, ${day.slice(0, 4)}`

export interface VisitDayFacts {
  status: string
  scheduledOn: string | null
  completedOn?: string | null
}

/** The one day a visit is read by: a done visit by the day it was done (`completed_on`, the day the pass card shows), any other by its scheduled day; null with neither. */
export const visitDay = (v: VisitDayFacts): string | null => (v.status === "completed" && v.completedOn ? v.completedOn : v.scheduledOn)

/** "Tuesday, May 5" for a visit's day, with the year ("Tuesday, April 27, 2027") when it falls in another year than `today`; null when the visit has no day. Every list and card reads a visit's day through this. */
export function visitDayWords(v: VisitDayFacts, today: string): string | null {
  const day = visitDay(v)
  if (!day) return null
  return day.slice(0, 4) === today.slice(0, 4) ? longDay(day) : `${longDay(day)}, ${day.slice(0, 4)}`
}

/** "Tue, Apr 28" for a row, with the year ("Tue, Apr 28, 2027") when the day falls in another year than `today`. */
export const timelineDay = (day: string, today: string): string => (day.slice(0, 4) === today.slice(0, 4) ? shortDay(day) : `${shortDay(day)}, ${day.slice(0, 4)}`)

/** What a visit that is not done costs, on its row and its page: "$145, charged after the visit" (a card is on file) or "$145, paid after the visit". Empty when it is unpriced. */
export const upcomingMoney = (price: number, hasCard: boolean): string => (price > 0 ? `$${price}, ${hasCard ? "charged" : "paid"} after the visit` : "")

export const CALL_LINE =`call or text Ryan at ${PHONE_DISPLAY}`
/** What a handler answers a customer who tries to change a visit inside the 24 hours; the screen says the same in `TEXT_RYAN_WHY`. */
export const CUTOFF_REFUSAL = `This visit is within 24 hours, so it can't be changed online. Text or call Ryan at ${PHONE_DISPLAY}.`
/** What a handler answers a customer who tries to cancel a visit that is done or otherwise past canceling. */
export const CANCEL_REFUSED = `This visit can't be canceled online. Text or call Ryan at ${PHONE_DISPLAY}.`
/** The one line under Text Ryan and Call Ryan: why a change this close goes through him. */
export const TEXT_RYAN_WHY = "Ryan plans his route the day before, so changes this close go through him."
export const DAY_FAILED = "We couldn't save that day."

/** "10:30 am" from a start "HH:MM": the one exact time a customer reads, never a window or a span. Null before a start time is set. */
export function timePhrase(startTime: string | null | undefined): string | null {
  const match = startTime?.match(/^(\d{2}):(\d{2})/)
  if (!match) return null
  const h = Number(match[1])
  return `${h % 12 === 0 ? 12 : h % 12}:${match[2]} ${h < 12 ? "am" : "pm"}`
}

export type VisitPill = { status: "scheduled" | "done" | "needs-a-day" | "cancelled" | "skipped"; label: string }

export interface PillFacts {
  status: string
  notDoneReason?: string | null
}

/** What the customer reads on a visit: Booked, Done, Not scheduled yet, Needs a new day, or Canceled (a skipped visit reads Canceled too). Never a prompt to pick a day: we schedule a visit with no day. */
export function visitPill(v: PillFacts): VisitPill {
  // a booked visit whose day has passed and is not closed yet still reads Booked
  if (v.status === "scheduled" || v.status === "not-closed") return { status: "scheduled", label: "Booked" }
  if (v.status === "completed") return { status: "done", label: "Done" }
  if (v.status === "cancelled") return { status: "cancelled", label: "Canceled" }
  // one customer word for skipped and canceled: a pass visit the customer (or Ryan) skipped is Canceled to them
  if (v.status === "skipped") return { status: "skipped", label: "Canceled" }
  if (v.notDoneReason) return { status: "needs-a-day", label: "Needs a new day" }
  return { status: "needs-a-day", label: "Not scheduled yet" }
}

export interface MoneyFacts {
  owed: number
  /** the stored words: "Paid", "$115 unpaid", "2 of 3 paid, $115 unpaid", "Invoice sent" or "" */
  words: string
  invoice?: { dueOn: string; status: "sent" | "overdue" } | null
}

export type MoneyTone = "paid" | "unpaid" | "invoice-sent" | "past-due" | "none"

/** The money word on a job row or the Money block: Paid, "$145 unpaid", "Invoice sent, due Dec 1" or "Past due since Dec 1". */
export function moneyWord(m: MoneyFacts): { tone: MoneyTone; label: string } {
  if (m.invoice && m.owed > 0) {
    return m.invoice.status === "overdue" ? { tone: "past-due", label: `Past due since ${dueDay(m.invoice.dueOn)}` } : { tone: "invoice-sent", label: `Invoice sent, due ${dueDay(m.invoice.dueOn)}` }
  }
  if (m.words === "Paid") return { tone: "paid", label: "Paid" }
  if (!m.words) return { tone: "none", label: "" }
  return { tone: "unpaid", label: m.words === "Invoice sent" ? "Unpaid" : m.words }
}

/** How a payment came, for the Money block and the receipt: "card", "check", "Venmo", "cash", "invoice". */
export const METHOD_PHRASE: Record<string, string> = { card_on_file: "card", card_now: "card", check: "check", venmo: "Venmo", cash: "cash", bill: "card" }

/** "Paid Nov 3, card $145" for a payment row; a refund reads "Refunded Nov 5, card $145". */
export function paymentLine(p: { amount: number; method: string; paidOn: string | null }): string {
  const how = METHOD_PHRASE[p.method] ?? p.method
  const on = p.paidOn ? ` ${dueDay(p.paidOn)}` : ""
  return p.amount < 0 ? `Refunded${on}, ${how} $${-p.amount}` : `Paid${on}, ${how} $${p.amount}`
}

/** The line for a visit that has a day and no time yet: the day-before text states the time. */
export const TIME_LATER = "We'll text you the time the day before."

export interface DayLineFacts extends VisitDayFacts {
  canceledOn?: string | null
  windowTold: boolean
  /** the exact start, "10:30 am"; null while the visit has a day and no time we have told */
  window: string | null
  personFirstName: string | null
  kind?: string
  /** the Season Pass timing wanted for a visit with no day yet */
  preference?: TimingPreference | null
}

/**
 * A visit's day in two parts (design section 5), for a card with a heading and a line under it and for the one sentence on the visit page. A booked visit with a time is "Wednesday, April 28 at 10:30 am" and who is coming; one with a day and no time yet says the day-before text states it. Done and canceled visits say so
 * with their day; a visit with no day says it is coming. A customer with neither a mobile nor an email can never be texted a window, so the line says to call.
 */
export function dayParts(v: DayLineFacts, today: string, reachable = true): { heading: string; detail: string | null; sentence: string } {
  if (v.status === "completed") {
    const heading = `Done ${visitDayWords(v, today) ?? ""}`.trim()
    return { heading, detail: null, sentence: `${heading}.` }
  }
  if (v.status === "cancelled" || v.status === "skipped") {
    const heading = v.canceledOn ? `Canceled ${timelineDay(v.canceledOn, today)}` : "Canceled"
    return { heading, detail: null, sentence: `${heading}.` }
  }
  const day = visitDayWords(v, today)
  if (!day) {
    const waiting = waitingDay(v.kind ?? "", v.preference)
    return { heading: waiting.heading, detail: waiting.detail, sentence: `${waiting.heading}. ${waiting.detail}` }
  }
  if (v.windowTold && !v.window) {
    // The day-before text went out but the visit has no start time (a one-off left at Any time): say who is coming that day, never promise a window again.
    const note = v.personFirstName ? `${v.personFirstName} will be there that day.` : "We'll be there that day."
    return { heading: day, detail: note, sentence: `${day}. ${note}` }
  }
  if (v.window) {
    const heading = `${day} at ${v.window}`
    const note = v.personFirstName ? `${v.personFirstName} is coming.` : null
    return { heading, detail: note, sentence: note ? `${heading}. ${note}` : `${heading}.` }
  }
  const note = reachable ? TIME_LATER : "Call Ryan for the time."
  return { heading: day, detail: note, sentence: `${day}. ${note}` }
}

/** The one sentence under a visit's title on its page. */
export const dayLine = (v: DayLineFacts, today: string, reachable = true): string => dayParts(v, today, reachable).sentence

export interface CancelFacts {
  /** the visit is on a Season Pass */
  pass: boolean
  /** other live visits on its job */
  otherVisits: number
  /** whole dollars already paid on its job; a cancel never moves money */
  paid: number
}

/** What the Cancel step says before the tap (design section 4): the consequence in one sentence. */
export function cancelConsequence(f: CancelFacts): string {
  if (f.paid > 0) return `Nothing more is charged. The $${f.paid} you already paid stays as it is, and Ryan will contact you about it.`
  if (f.pass) return "Nothing is charged. Your Season Pass stays and this visit comes off it."
  return f.otherVisits > 0 ? "Nothing is charged for this visit. Your other visits stay." : "Nothing is charged."
}

/** The facts `cancelConsequence` reads, from the job and visit the API sent. */
export function cancelFactsOf(job: { season: number | null; visits: readonly { id: string; status: string }[]; payments: readonly { amount: number; visitId: string | null }[] }, visitId: string): CancelFacts {
  return {
    pass: job.season !== null,
    otherVisits: job.visits.filter((v) => v.id !== visitId && v.status !== "cancelled" && v.status !== "skipped").length,
    // what is held on this visit: its own payments and any made on the job as a whole, not another visit's
    paid: Math.max(0, job.payments.filter((p) => p.visitId === visitId || p.visitId === null).reduce((sum, p) => sum + p.amount, 0)),
  }
}

/** What the customer reads once a visit is canceled. */
export const CANCELED_DONE = "Canceled. We texted you a note."
export const CANCEL_CHANGED_MIND = "Changed your mind?"
/** After "Text Ryan": until our own booking is live a canceled visit is added back by text (architecture section 8); once it is, this becomes Book Online. */
export const ADD_IT_BACK = "to add it back."

/** The body of the text Text Ryan opens: who, where and what, with no ids. */
export const textRyanBody = (p: { name: string; address: string; service: string; day: string | null }): string => `Hi Ryan, it's ${p.name} at ${p.address} about my ${p.service.toLowerCase()}${p.day ? ` on ${longDay(p.day)}` : ""}.`

/** The `sms:` link for Text Ryan; the text lands in the two-way thread by phone number. */
export const textRyanHref = (body: string): string => `sms:+19706927270?&body=${encodeURIComponent(body)}`
