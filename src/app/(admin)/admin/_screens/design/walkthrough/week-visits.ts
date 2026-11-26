// The walkthrough's week, from ONE source (Nov 25 2026): each record is a visit of the week of Mon Nov 16 (today is Wed Nov 18). The calendar draws it, the Jobs grid row reads its day and
// who, and the job page's Day, Time and Who are written from it (`weekFacts`), so the three cannot disagree. Records with a new id are new jobs for customers who already exist in the world;
// the others are existing Jobs rows (g-sam, g-ana and the 2026 done jobs) given their place on the week. Pure data and words, no imports.

export const WEEK_TODAY = "2026-11-18"
export type WeekWho = "Ryan Garner" | "Hannah Garner"
export interface WeekVisit {
  id: string
  /** an id already in the Jobs grid keeps its row; otherwise a new row is made for `name` */
  isNew: boolean
  name: string
  service: "Sprinkler repair" | "Fall blowout"
  property: string
  day: string
  /** minutes from midnight; null is Any time */
  start: number | null
  minutes: number
  who: WeekWho
  done?: boolean
  waiting?: boolean
  /** moved and the customer has not been notified: where it was */
  was?: { day: string; start: number | null }
}

const R: WeekWho = "Ryan Garner"
const H: WeekWho = "Hannah Garner"
const v = (id: string, isNew: boolean, name: string, service: WeekVisit["service"], property: string, day: string, start: number | null, minutes: number, who: WeekWho, more: Partial<WeekVisit> = {}): WeekVisit => ({ id, isNew, name, service, property, day, start, minutes, who, ...more })
const h = (hh: number, mm = 0) => hh * 60 + mm

export const WEEK_VISITS: WeekVisit[] = [
  v("g-dana", false, "Dana Cho", "Fall blowout", "18 Cedar Way, Erie", "2026-11-16", h(8), 30, R, { done: true }),
  v("g-ana", false, "Ana Ruiz", "Sprinkler repair", "9 Laurel St, Louisville", "2026-11-16", null, 60, R),
  v("g-priya", false, "Priya Shah", "Sprinkler repair", "330 Elm Dr, Lafayette", "2026-11-16", h(9), 60, H, { done: true }),
  v("g-lena", false, "Lena Park", "Sprinkler repair", "7 Oak Ct, Lafayette", "2026-11-17", h(10), 120, R, { done: true }),
  v("g-greg", false, "Greg Olsen", "Fall blowout", "5 Birch Ln, Erie", "2026-11-17", h(8, 30), 30, H, { done: true }),
  v("g-reese", false, "Reese Holloway", "Fall blowout", "51 Shadow Ln, Firestone", "2026-11-17", h(13), 30, H, { done: true }),
  v("g-sam", false, "Sam Ortiz", "Sprinkler repair", "14 Aspen Dr, Firestone", "2026-11-18", h(9), 60, R),
  v("w-owen", true, "Greg Olsen", "Sprinkler repair", "5 Birch Ln, Erie", "2026-11-18", h(9, 30), 60, R),
  v("w-ravi", true, "Ravi Shah", "Fall blowout", "8 Willow Dr, Firestone", "2026-11-18", h(8), 30, H),
  v("w-beth", true, "Joe Alvarez", "Sprinkler repair", "22 Pine St, Louisville", "2026-11-18", h(10), 120, H, { waiting: true }),
  v("w-joe", true, "Joe Alvarez", "Sprinkler repair", "22 Pine St, Louisville", "2026-11-18", h(14), 60, H),
  v("w-lena", true, "Priya Shah", "Sprinkler repair", "330 Elm Dr, Lafayette", "2026-11-19", h(8, 30), 60, R),
  v("w-greg", true, "Greg Olsen", "Fall blowout", "5 Birch Ln, Erie", "2026-11-19", h(10), 30, R, { was: { day: "2026-11-19", start: h(9) } }),
  v("w-priya", true, "Sam Ortiz", "Sprinkler repair", "14 Aspen Dr, Firestone", "2026-11-19", h(9), 60, H),
  v("w-ana", true, "Ana Ruiz", "Sprinkler repair", "9 Laurel St, Louisville", "2026-11-19", null, 60, H),
  v("w-sam", true, "Sam Ortiz", "Fall blowout", "14 Aspen Dr, Firestone", "2026-11-20", h(8), 30, R),
  v("w-owen2", true, "Greg Olsen", "Sprinkler repair", "5 Birch Ln, Erie", "2026-11-20", h(11), 60, R, { was: { day: "2026-11-19", start: h(13) } }),
  v("w-joe2", true, "Joe Alvarez", "Sprinkler repair", "22 Pine St, Louisville", "2026-11-20", h(9), 60, H),
]

export const weekVisitOf = (id: string) => WEEK_VISITS.find((x) => x.id === id)

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const dayParts = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`)
  return { wd: DAYS[d.getUTCDay()]!, mon: MONTHS[d.getUTCMonth()]!, n: d.getUTCDate() }
}
/** "Tue, Nov 17" */
export const weekDayShort = (iso: string) => { const p = dayParts(iso); return `${p.wd}, ${p.mon} ${p.n}` }
const clock = (m: number) => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, "0")} ${m < 720 ? "am" : "pm"}`

/** The Day, Time and Who the job page shows, written from the record: Today reads "Today, Wed Nov 18"; a done visit reads when it was finished. */
export function weekFacts(w: WeekVisit): { day: string; time: string; who: string } {
  const p = dayParts(w.day)
  const day = w.day === WEEK_TODAY ? `Today, ${p.wd} ${p.mon} ${p.n}` : weekDayShort(w.day)
  const time = w.start === null ? "Any time" : w.done ? `Done at ${clock(w.start + w.minutes)}` : clock(w.start)
  return { day, time, who: w.who }
}

/** What the Jobs grid's Next column says: Today, or "Tue, Nov 24"; a done visit has none. */
export const weekNext = (w: WeekVisit) => (w.done ? "None" : w.day === WEEK_TODAY ? "Today" : weekDayShort(w.day))
