import "server-only"
import { and, eq, isNotNull, like, lt, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { zonedToUtc, WORKDAY } from "@/lib/admin/calendar"
import { parseIcs, type FeedEvent } from "./ical"

export const FEED_ZONE = "America/Denver"
/** Every mirror row this module writes has an id starting with this and the truck's id. */
export const feedPrefix = (truckId: string) => `feed:${truckId}:`

export interface FeedBlock { id: string; truckId: string; startAt: Date; endAt: Date; title: string }

const dayParts = (day: string) => [Number(day.slice(0, 4)), Number(day.slice(5, 7)), Number(day.slice(8, 10))] as const
const nextDay = (day: string) => new Date(Date.parse(`${day}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10)

/** Events to busy blocks. A timed event is one block; an all-day event is one full working-day block (07:00 to 17:00 Mountain) per day it covers. */
export function toBlocks(truckId: string, events: FeedEvent[]): FeedBlock[] {
  const out: FeedBlock[] = []
  for (const e of events) {
    const id = `${feedPrefix(truckId)}${e.uid}`
    if (!e.allDay) { out.push({ id, truckId, startAt: e.start!, endAt: e.end!, title: e.title }); continue }
    for (let day = e.startDay!; day < e.endDay!; day = nextDay(day)) {
      const [y, m, d] = dayParts(day)
      out.push({
        id: `${id}:${day}`, truckId, title: e.title,
        startAt: zonedToUtc(y, m, d, WORKDAY.startHour, 0, 0, FEED_ZONE),
        endAt: zonedToUtc(y, m, d, WORKDAY.endHour, 0, 0, FEED_ZONE),
      })
    }
  }
  return out
}

/** Fetch an iCal feed. `webcal://` is `https://`. Injectable so tests never touch the network. */
export async function fetchFeed(url: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const res = await fetchImpl(url.replace(/^webcal:/i, "https:"), { headers: { accept: "text/calendar" }, signal: AbortSignal.timeout(15_000), cache: "no-store" })
  if (!res.ok) throw new Error(`calendar feed answered ${res.status}`)
  const text = await res.text()
  if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error("calendar feed is not an iCalendar document")
  return text
}

/**
 * Mirror one truck's feed into `jobber_visit` as busy blocks (`is_block`, `truck_id`), keyed by event uid so a re-run updates in
 * place; blocks that left the feed are deleted. Rows from other sources are never touched. The delete runs only after every upsert
 * succeeded, so a failed run leaves the old blocks standing.
 */
export async function syncTruckFeed(db: Database, truck: { id: string; organizationId: string; calendarFeedUrl: string | null }, deps: { fetch?: typeof fetch; now?: Date } = {}) {
  if (!truck.calendarFeedUrl) return { upserted: 0, removed: 0 }
  const started = deps.now ?? new Date()
  const blocks = toBlocks(truck.id, parseIcs(await fetchFeed(truck.calendarFeedUrl, deps.fetch), FEED_ZONE))
  for (let i = 0; i < blocks.length; i += 100) {
    const rows = blocks.slice(i, i + 100).map((b) => ({
      id: b.id, organizationId: truck.organizationId, truckId: b.truckId, title: b.title, startAt: b.startAt, endAt: b.endAt, isBlock: true, syncedAt: started,
    }))
    await db.insert(s.jobberVisit).values(rows).onConflictDoUpdate({
      target: s.jobberVisit.id,
      set: { title: sql`excluded.title`, startAt: sql`excluded.start_at`, endAt: sql`excluded.end_at`, truckId: sql`excluded.truck_id`, syncedAt: sql`excluded.synced_at`, isBlock: sql`excluded.is_block` },
    })
  }
  const gone = await db.delete(s.jobberVisit)
    .where(and(eq(s.jobberVisit.organizationId, truck.organizationId), eq(s.jobberVisit.truckId, truck.id), like(s.jobberVisit.id, `${feedPrefix(truck.id)}%`), lt(s.jobberVisit.syncedAt, started)))
    .returning({ id: s.jobberVisit.id })
  return { upserted: blocks.length, removed: gone.length }
}

/** The trucks of an organization (or of every organization) that have a feed URL. */
export async function trucksWithFeed(db: Database, organizationId?: string) {
  return db.select({ id: s.truck.id, organizationId: s.truck.organizationId, calendarFeedUrl: s.truck.calendarFeedUrl }).from(s.truck)
    .where(and(isNotNull(s.truck.calendarFeedUrl), eq(s.truck.active, true), organizationId ? eq(s.truck.organizationId, organizationId) : undefined))
}

/** The busy blocks on or after `from` (an instant) for an organization's trucks, as the calendar helpers take them. */
export async function loadBlocks(db: Database, organizationId: string, from: Date, to?: Date) {
  const rows = await db.select().from(s.jobberVisit)
    .where(and(eq(s.jobberVisit.organizationId, organizationId), eq(s.jobberVisit.isBlock, true), isNotNull(s.jobberVisit.truckId), isNotNull(s.jobberVisit.startAt), isNotNull(s.jobberVisit.endAt)))
  return rows
    .filter((r) => r.endAt! > from && (!to || r.startAt! < to))
    .map((r) => ({ truckId: r.truckId!, startAt: r.startAt!.toISOString(), endAt: r.endAt!.toISOString(), title: r.title ?? "Busy" }))
}
