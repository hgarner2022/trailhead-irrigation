/**
 * The pure parts of Home as Today (owner, 17 Nov 2026, after Jobber's "Today's appointments": "today's visits in our
 * language, a little bit more useful"): which visits are on today, the three groups they fall into, the same visits
 * under each person in route order, and the stops the map draws. Kept apart from home-model.ts so each file stays small
 * and every rule can be tested with a fixed `today`.
 *
 * Today is the Mountain calendar day. A visit is on it when it is scheduled today and not canceled, or when it was
 * done today (a visit done today for a day that has since moved still counts as done today). The three groups, in the
 * words of the screen only: Past its window (the window end has passed and the visit is not done), Ahead today (the
 * window is not over, or there is no window yet) and Done today. Not done, Canceled and Skipped are on no group.
 */
import { areaOf, dayOf } from "@/lib/admin/calendar"
import { TIME_ZONE } from "@/lib/admin/format"
import { visitJob, type MoneyState, type WorkState } from "@/lib/admin/jobs"
import { firstNameOf, initialsOf } from "@/lib/admin/people"
import type { AdminData, Visit } from "@/lib/admin/types"
import { dayOfVisit, kindLabel, timeWords, visitPrice } from "./visit-panel-model"

export type TodayGroupKey = "past" | "ahead" | "done"

/** The window a visit without its own length has, as `timeWords` and the visit panel read it. */
const DEFAULT_WINDOW_MINUTES = 120
const NONE = "none"

export interface TodayRow {
  id: string
  /** "Dana", the first word of the customer's name */
  firstName: string
  town: string
  /** "Spring turn-on", "Repair": the service as the line names it */
  service: string
  /** "8 to 10 am", or "Any time" until the visit has a window */
  window: string
  personId: string
  /** "Ryan Garner", or "No one yet" */
  personName: string
  initials: string
  /** the visit's place in its person's day, the number on the map; undefined with no person */
  route?: number
  /** the area's place in the list, so the bar takes the Schedule legend's colour; -1 when no area has the town */
  areaIndex: number
  group: TodayGroupKey
  work: WorkState
  workLabel: string
  money: MoneyState
  /** "Paid, Venmo", "$95 unpaid", "Invoice sent", "Failed", or nothing before the visit is done */
  moneyWord: string
  /** whole dollars, from the visit's own lines */
  price: number
}

export interface TodayPerson {
  personId: string
  name: string
  initials: string
  rows: TodayRow[]
}

export interface TodayMoney {
  /** every visit that is on today, whole dollars */
  today: number
  /** the visits done today */
  done: number
  /** the visits on today that are not done yet */
  ahead: number
  /** what today's done visits still owe: their price less the succeeded payment rows */
  owed: number
}

export interface TodayView {
  /** Mountain calendar day, YYYY-MM-DD */
  day: string
  rows: TodayRow[]
  groups: Record<TodayGroupKey, TodayRow[]>
  people: TodayPerson[]
  /** today's visits for the map: each with its route number as `stopOrder` */
  stops: Visit[]
}

/** The word on a Done row: "Paid, Venmo", "$95 unpaid", "Invoice sent", "Failed"; nothing for a visit not yet done. */
export function moneyWordOf(money: MoneyState, label: string, price: number): string {
  if (money === "owed") return price > 0 ? `$${price.toLocaleString("en-US")} unpaid` : "Unpaid"
  return money === "not-yet" ? "" : label
}

/** Minutes after midnight, Mountain time, at the instant `iso`. */
export function clockMinutes(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hourCycle: "h23", hour: "numeric", minute: "numeric" }).formatToParts(new Date(iso))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return get("hour") * 60 + get("minute")
}

const clock = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

/** Minutes after midnight, Mountain time, at which the visit's window ends; null before it has a start time. */
export function windowEnd(visit: Pick<Visit, "startTime" | "minutes">): number | null {
  return visit.startTime ? clock(visit.startTime) + (visit.minutes ?? DEFAULT_WINDOW_MINUTES) : null
}

/** Whether the visit belongs on Today: scheduled for the day, or done on it; never cancelled or skipped. */
export function isOnToday(visit: Visit, day: string): boolean {
  if (visit.status === "cancelled" || visit.skipped) return false
  const done = visit.status === "completed" || Boolean(visit.completedOn)
  return done ? (visit.completedOn ?? dayOfVisit(visit)) === day : dayOfVisit(visit) === day
}

const byRoute = (a: Visit, b: Visit) => (a.stopOrder ?? 1e9) - (b.stopOrder ?? 1e9) || (a.startAt ?? "").localeCompare(b.startAt ?? "") || a.id.localeCompare(b.id)

/** The groups' order inside: by the minute the window opens, a visit with no window after them, then the name. */
const opens = (v: Visit | undefined) => (v?.startTime ? clock(v.startTime) : 1e9)

export function todayView(data: AdminData, today: string): TodayView {
  const day = dayOf(today, TIME_ZONE)
  const now = clockMinutes(today)
  const names = new Map(data.settings.people.map((p) => [p.id, p]))
  const visits = data.visits.filter((v) => isOnToday(v, day))

  // Each person's route: the Schedule's stop order, then the start time. The number is the place in this list.
  const route = new Map<string, number>()
  const owners = [...new Set(visits.map((v) => v.personId ?? NONE))]
  for (const owner of owners) {
    if (owner === NONE) continue
    visits.filter((v) => v.personId === owner).sort(byRoute).forEach((v, i) => route.set(v.id, i + 1))
  }

  const rows = visits.map((v): TodayRow => {
    const price = visitPrice(data, v)
    const job = visitJob(v, day, TIME_ZONE)
    const person = v.personId ? names.get(v.personId) : undefined
    const personName = person?.name ?? v.personName ?? ""
    const end = windowEnd(v)
    const done = job.work === "done"
    const area = areaOf(v.town, data.settings.areas)
    return {
      id: v.id,
      firstName: firstNameOf(v.clientName) ?? v.clientName,
      town: v.town,
      service: kindLabel(v),
      window: timeWords(v) || "Any time",
      personId: v.personId ?? NONE,
      personName: personName || "No one yet",
      initials: personName ? (person?.initials ?? initialsOf(personName)) : "",
      ...(route.has(v.id) ? { route: route.get(v.id) } : {}),
      areaIndex: area ? data.settings.areas.indexOf(area) : -1,
      group: done ? "done" : end !== null && now > end ? "past" : "ahead",
      work: job.work,
      workLabel: job.workLabel,
      money: job.money,
      moneyWord: done ? moneyWordOf(job.money, job.moneyLabel, price) : "",
      price,
    }
  })

  const groups: TodayView["groups"] = { past: [], ahead: [], done: [] }
  for (const row of rows) groups[row.group].push(row)
  const order = new Map(visits.map((v) => [v.id, v]))
  for (const key of Object.keys(groups) as TodayGroupKey[]) groups[key].sort((a, b) => opens(order.get(a.id)) - opens(order.get(b.id)) || a.firstName.localeCompare(b.firstName))

  // The same rows under each person, in route order; someone off the schedule still files under their name, and a visit nobody has goes last.
  const people: TodayPerson[] = [...data.settings.people.map((p) => p.id), NONE]
    .map((id) => {
      const mine = rows.filter((r) => r.personId === id || (id === NONE && !names.has(r.personId)))
      mine.sort((a, b) => byRoute(order.get(a.id)!, order.get(b.id)!))
      const first = mine[0]
      return { personId: id, name: first?.personName ?? "", initials: first?.initials ?? "", rows: mine }
    })
    .filter((p) => p.rows.length > 0)

  const stops = visits.map((v) => (route.has(v.id) ? { ...v, stopOrder: route.get(v.id) } : v))
  return { day, rows, groups, people, stops }
}
