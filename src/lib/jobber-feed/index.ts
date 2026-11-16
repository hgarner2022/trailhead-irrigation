import "server-only"
import { and, eq, isNotNull, like, lt, or, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { zonedToUtc, WORKDAY } from "@/lib/admin/calendar"
import { parseIcs, type FeedEvent } from "./ical"

export const FEED_ZONE = "America/Denver"
/** Every mirror row this module writes has an id starting with this and the person's id. */
export const feedPrefix = (personId: string) => `feed:${personId}:`

export interface FeedBlock { id: string; personId: string; startAt: Date; endAt: Date; title: string }

/** A person who reads a Jobber calendar feed: what the sync and the cron take. `legacyTruckId` is the truck the person was made from, where there was one. */
export interface FeedPerson { id: string; organizationId: string; calendarFeedUrl: string | null; legacyTruckId?: string | null }

const dayParts = (day: string) => [Number(day.slice(0, 4)), Number(day.slice(5, 7)), Number(day.slice(8, 10))] as const
const nextDay = (day: string) => new Date(Date.parse(`${day}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10)

/** Events to busy blocks. A timed event is one block; an all-day event is one full working-day block (07:00 to 17:00 Mountain) per day it covers. */
export function toBlocks(personId: string, events: FeedEvent[]): FeedBlock[] {
  const out: FeedBlock[] = []
  for (const e of events) {
    const id = `${feedPrefix(personId)}${e.uid}`
    if (!e.allDay) { out.push({ id, personId, startAt: e.start!, endAt: e.end!, title: e.title }); continue }
    for (let day = e.startDay!; day < e.endDay!; day = nextDay(day)) {
      const [y, m, d] = dayParts(day)
      out.push({
        id: `${id}:${day}`, personId, title: e.title,
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
 * Mirror one person's feed into `jobber_visit` as busy blocks (`is_block`, id `feed:<person id>:<uid>`), keyed by event uid so a
 * re-run updates in place; blocks that left the feed are deleted. The row's `truck_id` keeps the truck the person was made from
 * while that column lasts (step 6 drops it); a person made since has none. Rows from other sources are never touched. The delete
 * runs only after every upsert succeeded, so a failed run leaves the old blocks standing. Blocks written before people existed
 * sit under the truck's id (`feed:truck-1:`); the first run under the person's id replaces them.
 */
export async function syncPersonFeed(db: Database, person: FeedPerson, deps: { fetch?: typeof fetch; now?: Date } = {}) {
  if (!person.calendarFeedUrl) return { upserted: 0, removed: 0 }
  const started = deps.now ?? new Date()
  const blocks = toBlocks(person.id, parseIcs(await fetchFeed(person.calendarFeedUrl, deps.fetch), FEED_ZONE))
  for (let i = 0; i < blocks.length; i += 100) {
    const rows = blocks.slice(i, i + 100).map((b) => ({
      id: b.id, organizationId: person.organizationId, truckId: person.legacyTruckId ?? null, title: b.title, startAt: b.startAt, endAt: b.endAt, isBlock: true, syncedAt: started,
    }))
    await db.insert(s.jobberVisit).values(rows).onConflictDoUpdate({
      target: s.jobberVisit.id,
      set: { title: sql`excluded.title`, startAt: sql`excluded.start_at`, endAt: sql`excluded.end_at`, truckId: sql`excluded.truck_id`, syncedAt: sql`excluded.synced_at`, isBlock: sql`excluded.is_block` },
    })
  }
  const mine = or(like(s.jobberVisit.id, `${feedPrefix(person.id)}%`), person.legacyTruckId ? like(s.jobberVisit.id, `${feedPrefix(person.legacyTruckId)}%`) : undefined)
  const gone = await db.delete(s.jobberVisit)
    .where(and(eq(s.jobberVisit.organizationId, person.organizationId), eq(s.jobberVisit.isBlock, true), mine, lt(s.jobberVisit.syncedAt, started)))
    .returning({ id: s.jobberVisit.id })
  return { upserted: blocks.length, removed: gone.length }
}

/** The people in service of an organization (or of every organization) that have a feed URL. */
export async function peopleWithFeed(db: Database, organizationId?: string): Promise<FeedPerson[]> {
  return db.select({ id: s.person.id, organizationId: s.person.organizationId, calendarFeedUrl: s.person.calendarFeedUrl, legacyTruckId: s.person.legacyTruckId }).from(s.person)
    .where(and(isNotNull(s.person.calendarFeedUrl), eq(s.person.active, true), organizationId ? eq(s.person.organizationId, organizationId) : undefined))
}

/**
 * The busy blocks on or after `from` (an instant) for an organization's people, as the calendar helpers take them. A block's
 * person is read from its id (`feed:<person id>:`), else from its `truck_id`; an id or a `truck_id` that is still a truck's
 * ("truck-1", from before people existed) is the person made from that truck. A block nobody owns is left out.
 */
export async function loadBlocks(db: Database, organizationId: string, from: Date, to?: Date) {
  const [rows, people] = await Promise.all([
    db.select().from(s.jobberVisit).where(and(eq(s.jobberVisit.organizationId, organizationId), eq(s.jobberVisit.isBlock, true), isNotNull(s.jobberVisit.startAt), isNotNull(s.jobberVisit.endAt))),
    db.select({ id: s.person.id, legacyTruckId: s.person.legacyTruckId }).from(s.person).where(eq(s.person.organizationId, organizationId)),
  ])
  const ids = new Set(people.map((p) => p.id))
  // step 6: drop the legacy truck id mapping
  const fromTruck = new Map(people.flatMap((p) => (p.legacyTruckId ? [[p.legacyTruckId, p.id] as const] : [])))
  const personOf = (key: string | null | undefined) => (key ? (ids.has(key) ? key : fromTruck.get(key)) : undefined)
  return rows
    .filter((r) => r.endAt! > from && (!to || r.startAt! < to))
    .flatMap((r) => {
      const personId = personOf(/^feed:([^:]+):/.exec(r.id)?.[1]) ?? personOf(r.truckId)
      return personId ? [{ personId, startAt: r.startAt!.toISOString(), endAt: r.endAt!.toISOString(), title: r.title ?? "Busy" }] : []
    })
}
