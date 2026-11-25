// What one visit's page shows, pure (docs/plans/2026-11-18-customer-portal-v2-design.md section 4): the day sentence, where, what is included, what it costs
// or what was paid with its receipts, the invoice waiting, and the buttons the 24-hour rule allows. Every line reads the customer-safe `PortalJob`
// the API sends; the words come from `./words`.
import type { PortalCustomerType, PortalJobType, PortalVisitType } from "@/api/v1/portal/schemas"
import { dayParts, paymentLine, textRyanBody, textRyanHref, upcomingMoney, visitPill, type MoneyTone, type VisitPill } from "./words"

export interface VisitPageReceipt {
  id: string
  /** "Paid Nov 3, card $145" */
  words: string
  href: string
}

export interface VisitPageInvoice {
  id: string
  total: number
  dueOn: string
  status: "sent" | "overdue"
  payHref: string
}

export interface VisitPageModel {
  service: string
  /** "Season Pass 2027" for a pass visit */
  label: string | null
  pill: VisitPill
  dayLine: string
  /** the day as a card heading, and the line under it: the window promise, or the window with who is coming */
  dayHeading: string
  dayDetail: string | null
  /** the first name of who is coming, once the customer has been told (with the time); null before */
  who?: string | null
  /** "12 Elm St, Erie" */
  where: string
  mustBeHome: boolean
  /** what the visit includes, from its lines' descriptions; null when none has one */
  included: string | null
  /** the price words before the visit: "$145, charged to the Visa ending 4242 after the visit"; empty once done or when unpriced */
  priceLine: string
  /** the money word once done: "Paid", "$115 unpaid", "Invoice sent, due Dec 1", "Past due since Dec 1" */
  money: { tone: MoneyTone; label: string }
  receipts: VisitPageReceipt[]
  invoice: VisitPageInvoice | null
  /** which buttons show: Reschedule and Cancel when "yes", Text Ryan and Call Ryan in their place when "text" */
  reschedule: PortalVisitType["reschedule"]
  cancel: PortalVisitType["cancel"]
  canCalendar: boolean
  /** "You can change this until Sunday, April 26, 11:59 pm." */
  changeLine: string | null
  /** the prefilled text for Text Ryan, and its link */
  textBody: string
  textHref: string
}

const cardWords = (card: PortalCustomerType["card"]) => (card?.last4 ? `${card.brand ? `${card.brand[0]!.toUpperCase()}${card.brand.slice(1)}` : "Card"} ending ${card.last4}` : null)

export function visitPageOf(job: PortalJobType, visit: PortalVisitType, customer: PortalCustomerType, today: string): VisitPageModel {
  const own = job.lines.filter((l) => l.visitId === visit.id && !l.cancelledAt)
  const descriptions = own.map((l) => l.description).filter((d): d is string => Boolean(d))
  const upcoming = visit.status === "scheduled" || visit.status === "unscheduled"
  const open = job.invoices.find((i) => i.status !== "paid" && i.payUrl)
  const card = cardWords(customer.card)
  const priceLine = upcoming && visit.price > 0 ? (card ? `$${visit.price}, charged to the ${card} after the visit` : upcomingMoney(visit.price, false)) : ""
  const body = textRyanBody({ name: [customer.firstName, customer.lastName].filter(Boolean).join(" "), address: job.address, service: visit.name, day: visit.scheduledOn })
  const day = dayParts(visit, today, Boolean(customer.phone || customer.email))
  const owes = visit.status === "completed" || visit.money.tone === "invoice-sent" || visit.money.tone === "past-due"
  return {
    service: visit.name,
    label: job.season !== null ? job.name : null,
    pill: visitPill({ status: visit.status, notDoneReason: visit.notDoneReason }),
    dayLine: day.sentence,
    dayHeading: day.heading,
    dayDetail: day.detail,
    who: visit.windowTold && visit.window ? visit.personFirstName : null,
    where: [job.address, job.town].filter(Boolean).join(", "),
    mustBeHome: visit.mustBeHome,
    included: descriptions.length ? descriptions.join(", ") : null,
    priceLine,
    money: { tone: visit.money.tone, label: visit.money.label },
    receipts: visit.money.paymentIds
      .map((id) => job.payments.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({ id: p.id, words: paymentLine(p), href: `/account/receipts/${p.id}` })),
    invoice: open?.payUrl && owes ? { id: open.id, total: open.total, dueOn: open.dueOn, status: open.status as "sent" | "overdue", payHref: open.payUrl } : null,
    reschedule: visit.reschedule,
    cancel: visit.cancel,
    canCalendar: visit.status === "scheduled" && Boolean(visit.scheduledOn),
    changeLine: visit.status === "scheduled" && visit.cancelsBy && (visit.reschedule === "yes" || visit.cancel === "yes") ? `You can ${visit.reschedule === "yes" ? "change" : "cancel"} this${visit.reschedule === "yes" ? "" : " online"} until ${visit.cancelsBy}.` : null,
    textBody: body,
    textHref: textRyanHref(body),
  }
}
