// Add-to-calendar, pure: Google's render link and the body of an .ics file. The app serves the .ics at
// /api/visits/[id]/calendar.ics?token=, so Apple and Outlook calendars take it.
import { BUSINESS, type VisitFacts } from "./format"

const TZ = "America/Denver"

const compact = (day: string) => day.slice(0, 10).replaceAll("-", "")
const addOneDay = (day: string) => {
  const [y, m, d] = day.slice(0, 10).split("-").map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}
const wall = (day: string, time: string, plusHours = 0) => {
  const hour = Number(time.slice(0, 2)) + plusHours
  return `${compact(day)}T${String(hour).padStart(2, "0")}${time.slice(3, 5)}00`
}

const title = (v: VisitFacts) => `Trailhead: your ${v.name}`
const details = (v: VisitFacts) => `${BUSINESS.name} is coming for your ${v.name}. Questions: ${BUSINESS.phone}.`

/** The calendar.google.com render link. A visit with a time is two hours long in Mountain time; one without is an all-day event. */
export function googleCalendarUrl(v: VisitFacts): string {
  const dates = v.startTime ? `${wall(v.day, v.startTime)}/${wall(v.day, v.startTime, 2)}` : `${compact(v.day)}/${compact(addOneDay(v.day))}`
  const q = new URLSearchParams({ action: "TEMPLATE", text: title(v), dates, details: details(v), location: v.location })
  if (v.startTime) q.set("ctz", TZ)
  return `https://calendar.google.com/calendar/render?${q.toString()}`
}

const escapeIcs = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")

/** The UTC instant of a Mountain wall-clock time, so the file needs no VTIMEZONE block. */
function mountainToUtc(day: string, time: string, plusHours = 0): string {
  const [y, m, d] = day.slice(0, 10).split("-").map(Number) as [number, number, number]
  const hour = Number(time.slice(0, 2)) + plusHours
  const minute = Number(time.slice(3, 5))
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" })
  for (const offset of [6, 7]) {
    const t = new Date(Date.UTC(y, m - 1, d, hour + offset, minute))
    const got = Object.fromEntries(fmt.formatToParts(t).map((p) => [p.type, Number(p.value)]))
    if (got.hour === hour % 24 && got.minute === minute && got.day === new Date(Date.UTC(y, m - 1, d, hour)).getUTCDate()) return t.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")
  }
  return `${compact(day)}T${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}00Z`
}

export function icsFile(v: VisitFacts, stamp: Date, url: string): string {
  const when = v.startTime
    ? [`DTSTART:${mountainToUtc(v.day, v.startTime)}`, `DTEND:${mountainToUtc(v.day, v.startTime, 2)}`]
    : [`DTSTART;VALUE=DATE:${compact(v.day)}`, `DTEND;VALUE=DATE:${compact(addOneDay(v.day))}`]
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Trailhead Lawn & Irrigation//Season Pass//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT", `UID:visit-${v.id}@trailheadirrigation.com`, `DTSTAMP:${stamp.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")}`, ...when,
    `SUMMARY:${escapeIcs(title(v))}`, `LOCATION:${escapeIcs(v.location)}`, `DESCRIPTION:${escapeIcs(details(v))}`, `URL:${url}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n") + "\r\n"
}
