import { zonedToUtc } from "@/lib/admin/calendar"

/**
 * A small iCalendar reader for Jobber's calendar subscription feed: just the
 * VEVENT fields busy time needs (UID, DTSTART, DTEND or DURATION, SUMMARY,
 * STATUS). It handles line folding, escaped text, `Z`, floating and `TZID`
 * times and all-day dates. Recurrence rules are not expanded: Jobber writes
 * each visit as its own event. Pure, so it runs anywhere.
 */

export interface FeedEvent {
  uid: string
  title: string
  /** An all-day event: `startDay` to `endDay` (exclusive), no clock times. */
  allDay: boolean
  /** UTC instants for timed events; for all-day events the Mountain-free day bounds are in `startDay`/`endDay`. */
  start: Date | null
  end: Date | null
  startDay: string | null
  endDay: string | null
}

/** Undo RFC 5545 line folding and split into lines. */
function unfold(text: string): string[] {
  const out: string[] = []
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    if ((raw.startsWith(" ") || raw.startsWith("\t")) && out.length) out[out.length - 1] += raw.slice(1)
    else out.push(raw)
  }
  return out
}

interface Prop { name: string; params: Record<string, string>; value: string }

function parseLine(line: string): Prop | null {
  let inQuote = false
  let colon = -1
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') inQuote = !inQuote
    else if (line[i] === ":" && !inQuote) { colon = i; break }
  }
  if (colon < 1) return null
  const [name, ...rest] = line.slice(0, colon).split(";")
  const params: Record<string, string> = {}
  for (const part of rest) {
    const eq = part.indexOf("=")
    if (eq > 0) params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1).replace(/^"|"$/g, "")
  }
  return { name: name!.toUpperCase(), params, value: line.slice(colon + 1) }
}

const unescapeText = (v: string) => v.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim()

function validZone(tz: string | undefined): string | undefined {
  if (!tz) return undefined
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return tz } catch { return undefined }
}

/** Parse DTSTART/DTEND: a date, a UTC time, or a wall-clock time in TZID (or `defaultZone` when floating). */
function parseWhen(p: Prop, defaultZone: string): { date: Date | null; day: string | null } {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(p.value.trim())
  if (!m) return { date: null, day: null }
  const [, y, mo, d, h, mi, s, z] = m
  if (h === undefined) return { date: null, day: `${y}-${mo}-${d}` }
  if (z) return { date: new Date(Date.UTC(+y!, +mo! - 1, +d!, +h, +mi!, +(s ?? 0))), day: null }
  return { date: zonedToUtc(+y!, +mo!, +d!, +h, +mi!, +(s ?? 0), validZone(p.params.TZID) ?? defaultZone), day: null }
}

function parseDuration(v: string): number | null {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(v.trim())
  if (!m) return null
  const ms = (+(m[2] ?? 0) * 7 * 86400 + +(m[3] ?? 0) * 86400 + +(m[4] ?? 0) * 3600 + +(m[5] ?? 0) * 60 + +(m[6] ?? 0)) * 1000
  return m[1] === "-" ? -ms : ms
}

const nextDay = (day: string) => new Date(Date.parse(`${day}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10)

/** Every non-cancelled event of an .ics document with a UID and a start; events without an end last an hour (a day when all-day). */
export function parseIcs(text: string, defaultZone = "America/Denver"): FeedEvent[] {
  const events: FeedEvent[] = []
  let current: Prop[] | null = null
  for (const line of unfold(text)) {
    const upper = line.toUpperCase()
    if (upper === "BEGIN:VEVENT") { current = []; continue }
    if (upper === "END:VEVENT") {
      if (current) { const e = toEvent(current, defaultZone); if (e) events.push(e) }
      current = null
      continue
    }
    if (current) { const p = parseLine(line); if (p) current.push(p) }
  }
  return events
}

function toEvent(props: Prop[], defaultZone: string): FeedEvent | null {
  const get = (n: string) => props.find((p) => p.name === n)
  const uid = get("UID")?.value.trim()
  const dtstart = get("DTSTART")
  if (!uid || !dtstart) return null
  if (get("STATUS")?.value.trim().toUpperCase() === "CANCELLED") return null
  const start = parseWhen(dtstart, defaultZone)
  if (!start.date && !start.day) return null
  const title = unescapeText(get("SUMMARY")?.value ?? "") || "Busy"
  const dtend = get("DTEND")
  const dur = get("DURATION") ? parseDuration(get("DURATION")!.value) : null
  if (start.day) {
    const end = dtend ? parseWhen(dtend, defaultZone).day : dur ? new Date(Date.parse(`${start.day}T12:00:00Z`) + dur).toISOString().slice(0, 10) : null
    return { uid, title, allDay: true, start: null, end: null, startDay: start.day, endDay: end && end > start.day ? end : nextDay(start.day) }
  }
  let end = dtend ? parseWhen(dtend, defaultZone).date : dur !== null ? new Date(start.date!.getTime() + dur) : null
  if (!end || end <= start.date!) end = new Date(start.date!.getTime() + 3_600_000)
  return { uid, title, allDay: false, start: start.date, end, startDay: null, endDay: null }
}
