// The customer's wording for the portal, pure: one place for what a visit and a payment are called on the account screens
// (docs/plans/2026-11-18-customer-portal-design.md section 4; Hannah's words: Invoice, Unpaid, Past due, Canceled, never request or approve).
// The money words themselves come from `src/lib/money/words.ts`; this file only adds the customer's reading of them.
import { monthDay, monthName, monthShort, writtenDate } from "@/lib/admin/format"
import { firstNameOf } from "@/lib/admin/people"
import { PHONE_DISPLAY } from "@/lib/nav"

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

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
export const weekdayName = (day: string) => WEEKDAYS[new Date(`${day}T12:00:00Z`).getUTCDay()]!

/** "Tuesday, May 5". */
export const longDay = (day: string) => `${weekdayName(day)}, ${writtenDate(day)}`
/** "Tue, Apr 28". */
export const shortDay = (day: string) => `${weekdayName(day).slice(0, 3)}, ${monthShort(monthDay(day).month)} ${monthDay(day).day}`
/** "Dec 1". */
export const dueDay = (day: string) => `${monthShort(monthDay(day).month)} ${monthDay(day).day}`
/** "November 3, 2026": a sold or paid day in a list. */
export const fullDay = (day: string) => `${monthName(monthDay(day).month)} ${monthDay(day).day}, ${day.slice(0, 4)}`

export const CALL_LINE = `call or text Ryan at ${PHONE_DISPLAY}`
export const DAY_FAILED = `We couldn't save that day. Try another, or call Ryan at ${PHONE_DISPLAY}.`

function clock(minutes: number): { hour: number; minute: number; meridiem: "am" | "pm" } {
  const m = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  return { hour: h % 12 === 0 ? 12 : h % 12, minute: m % 60, meridiem: h < 12 ? "am" : "pm" }
}
const part = (c: ReturnType<typeof clock>) => (c.minute ? `${c.hour}:${String(c.minute).padStart(2, "0")}` : `${c.hour}`)

/** "Arrive between 9 and 11 am" from a start "HH:MM" and the minutes the window runs (two hours when the visit has none); null before a start time is set. */
export function arrivalWindow(startTime: string | null | undefined, minutes?: number | null): string | null {
  const match = startTime?.match(/^(\d{2}):(\d{2})/)
  if (!match) return null
  const start = clock(Number(match[1]) * 60 + Number(match[2]))
  const end = clock(Number(match[1]) * 60 + Number(match[2]) + (minutes && minutes > 0 ? minutes : 120))
  return start.meridiem === end.meridiem ? `Arrive between ${part(start)} and ${part(end)} ${end.meridiem}` : `Arrive between ${part(start)} ${start.meridiem} and ${part(end)} ${end.meridiem}`
}

export type VisitPill = { status: "scheduled" | "done" | "needs-a-day" | "cancelled" | "skipped"; label: string }

export interface PillFacts {
  status: string
  notDoneReason?: string | null
  /** days are on offer, or there is nothing to pick from */
  canPick?: boolean
}

/** What the customer reads on a visit: Booked, Done, Pick a day or Day coming soon, Needs a new day, Canceled or Skipped. */
export function visitPill(v: PillFacts): VisitPill {
  // a booked visit whose day has passed and is not closed yet still reads Booked
  if (v.status === "scheduled" || v.status === "not-closed") return { status: "scheduled", label: "Booked" }
  if (v.status === "completed") return { status: "done", label: "Done" }
  if (v.status === "cancelled") return { status: "cancelled", label: "Canceled" }
  if (v.status === "skipped") return { status: "skipped", label: "Skipped" }
  if (v.notDoneReason) return { status: "needs-a-day", label: "Needs a new day" }
  return { status: "needs-a-day", label: v.canPick ? "Pick a day" : "Day coming soon" }
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
