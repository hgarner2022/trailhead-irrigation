// The text versions, one per kind that goes by text: date-set, date-moved and the day-before reminder. Each carries the
// business name, the date (and the window when there is one), a short link and the opt-out line once. Under 160 characters
// where the day and the link allow it.
import { shortDay, windowText } from "@/emails/format"
import type { VisitData } from "@/emails/types"

const OPT_OUT = "Reply STOP to opt out."

const when = (d: VisitData) => `${shortDay(d.visit.day)}${d.visit.startTime ? `, ${windowText(d.visit.startTime)}` : ""}`
const link = (d: VisitData) => d.passUrl

export const dateSetText = (d: VisitData) => `Trailhead: your ${d.visit.name} is ${when(d)}. Calendar and changes: ${link(d)} ${OPT_OUT}`
export const dateMovedText = (d: VisitData) => `Trailhead: your ${d.visit.name} moved to ${when(d)}. Calendar and changes: ${link(d)} ${OPT_OUT}`
export const dateConfirmText = (d: VisitData) => `Trailhead: your ${d.visit.name} is ${when(d)}. Need a different day? ${link(d)} ${OPT_OUT}`
export const dayBeforeText = (d: VisitData) => `Trailhead: we come tomorrow, ${when(d)}, for your ${d.visit.name}. Changes: ${link(d)} ${OPT_OUT}`

export const SMS_TEMPLATES = { "date-set": dateSetText, "date-moved": dateMovedText, "day-before": dayBeforeText, "date-confirm": dateConfirmText }
export type SmsKind = keyof typeof SMS_TEMPLATES
