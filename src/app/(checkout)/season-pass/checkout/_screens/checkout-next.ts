import { googleCalendarUrl } from "@/emails/calendar"
import { CONFIRM_LINE, RYAN_DOES, filledLine, longDay, moneyLine, windowText } from "@/emails/format"
import type { Pass } from "@/lib/admin/types"

/** The two calendar buttons under a dated visit: Google's link, and the signed .ics file for Apple and Outlook once the server has one. */
export interface CalendarLinks {
  google: string
  ics?: string
}

/** One line of "What happens next": the visit's day (the lead, in the display face), what Ryan does there, and its calendar buttons. */
export interface NextLine {
  key: string
  lead: string
  text: string
  /** said when the day the customer picked filled up before the card was saved */
  note?: string
  calendar?: CalendarLinks
}

const NAME = { "turn-on": "spring turn-on", inspection: "mid-season inspection", blowout: "fall blowout" } as const

const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`

/**
 * What the pass the customer holds promises, from the visits on it (a visit past its window is not on the pass, so it is not here):
 * each dated visit with its day and window, what Ryan does and the calendar buttons; a visit with no day says Ryan sets it. Then
 * the confirmation timeline and the money line with the amounts the pass holds. `chosen` is what the customer picked, so a day
 * that moved says so.
 */
export function nextLines(pass: Pass, chosen: readonly { kind: string; day: string }[] = []): NextLine[] {
  const visits = pass.visits.filter((v) => v.kind === "turn-on" || v.kind === "inspection" || v.kind === "blowout")
  const lines: NextLine[] = visits.map((v) => {
    const name = capital(NAME[v.kind])
    if (!v.scheduledOn) return { key: v.kind, lead: v.window, text: `${name}. Ryan sets the day and we text it to you.` }
    const when = v.startTime ? `${name}, between ${windowText(v.startTime).replace(" to ", " and ")}.` : `${name}.`
    const wanted = chosen.find((c) => c.kind === v.kind)?.day
    const google = googleCalendarUrl({ id: v.id ?? v.kind, name: NAME[v.kind], day: v.scheduledOn, startTime: v.startTime ?? null, crew: null, location: `${pass.town}, CO`, icsUrl: v.calendarUrl ?? "" })
    return { key: v.kind, lead: longDay(v.scheduledOn), text: `${when} ${RYAN_DOES[v.kind]}`, ...(wanted && wanted !== v.scheduledOn ? { note: filledLine(wanted, v.scheduledOn) } : {}), calendar: { google, ...(v.calendarUrl ? { ics: v.calendarUrl } : {}) } }
  })
  if (visits.length > 0) {
    lines.push({ key: "confirm", lead: "Before each visit", text: CONFIRM_LINE })
    lines.push({ key: "charge", lead: "What you pay", text: moneyLine(visits.map((v) => ({ name: NAME[v.kind], amount: v.amount })), pass.cardLast4) })
  }
  return lines
}
