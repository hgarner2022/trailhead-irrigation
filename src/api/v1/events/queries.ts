import "server-only"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import { techEvent } from "@/lib/events/words"
import type { EventAbout } from "@/lib/events/kinds"
import type { Ctx } from "../../core/context"
import { afterTimeCursor, cursorPage, type Page } from "../../core/pagination"
import { canSeeContact } from "../shared"
import type { EventOutType } from "./schemas"

export type EventRow = typeof s.event.$inferSelect

/** Which events: the ones of a customer, a job, a visit, or about one record. Every query adds the organization. */
export interface EventFilter {
  customerId?: string
  jobId?: string
  visitId?: string
  about?: EventAbout
  aboutId?: string
}

/** The kinds a caller without the write scope reads, as SQL (the same rule as `techEvent`), so a page of them is a full page. */
const techKinds = sql`(${s.event.kind} = 'note' or ${s.event.kind} = 'job.sold' or ${s.event.kind} like 'pass.%' or ${s.event.kind} like 'visit.%')`

/** An event as the API shows it: a caller without the write scope reads it through `techEvent` (null when it is not theirs to read). */
export function eventOut(ctx: Ctx, row: EventRow, whoName: string | null): EventOutType | null {
  const out: EventOutType = {
    id: row.id, about: row.about as EventOutType["about"], aboutId: row.aboutId, customerId: row.customerId, jobId: row.jobId, visitId: row.visitId,
    kind: row.kind, detail: row.detail, who: row.who, whoName, at: row.at.toISOString(),
  }
  return canSeeContact(ctx) ? out : techEvent(out)
}

const eventCursor = (e: EventOutType) => `${e.at}|${e.id}`

/**
 * A page of events, newest first (`at` then `id`), one organization only, with the name of the person who did each. A caller without
 * the write scope gets only the kinds `techEvent` allows, stripped of money, gate and contact fields.
 */
export async function loadEvents(ctx: Ctx, filter: EventFilter, page: { limit: number; cursor?: string }): Promise<Page<EventOutType>> {
  const rows = await ctx.db
    .select({ event: s.event, whoName: s.person.name })
    .from(s.event)
    .leftJoin(s.person, and(eq(s.person.organizationId, s.event.organizationId), sql`lower(${s.person.email}) = lower(${s.event.who})`))
    .where(
      and(
        eq(s.event.organizationId, ctx.organizationId),
        filter.customerId ? eq(s.event.customerId, filter.customerId) : undefined,
        filter.jobId ? eq(s.event.jobId, filter.jobId) : undefined,
        filter.visitId ? eq(s.event.visitId, filter.visitId) : undefined,
        filter.about ? eq(s.event.about, filter.about) : undefined,
        filter.aboutId ? eq(s.event.aboutId, filter.aboutId) : undefined,
        canSeeContact(ctx) ? undefined : techKinds,
        afterTimeCursor(s.event.at, s.event.id, page.cursor),
      ),
    )
    .orderBy(desc(s.event.at), desc(s.event.id))
    .limit(page.limit + 1)
  const out = rows.map((r) => eventOut(ctx, r.event, r.whoName)).filter((e): e is EventOutType => e !== null)
  return cursorPage(out, page.limit, eventCursor)
}

/** The newest `limit` events of a customer, a job or a visit, as a plain list (a detail view's story). */
export async function recentEvents(ctx: Ctx, filter: EventFilter, limit: number): Promise<EventOutType[]> {
  return (await loadEvents(ctx, filter, { limit })).data
}

/** The text of the newest `note` among events listed newest first, or null: what `VisitOut.notes` and `JobOut.notes` read now that a note is only an event. */
export function newestNoteText(events: readonly Pick<EventOutType, "kind" | "detail">[]): string | null {
  const text = events.find((e) => e.kind === "note")?.detail?.text
  return typeof text === "string" && text ? text : null
}

/** The newest note about each job given (`about` job), by job id; one query for all of them, organization-scoped. */
export async function newestJobNotes(ctx: Ctx, jobIds: readonly string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (jobIds.length === 0) return out
  const rows = await ctx.db
    .select({ aboutId: s.event.aboutId, detail: s.event.detail })
    .from(s.event)
    .where(and(eq(s.event.organizationId, ctx.organizationId), eq(s.event.about, "job"), eq(s.event.kind, "note"), inArray(s.event.aboutId, [...jobIds])))
    .orderBy(desc(s.event.at), desc(s.event.id))
  for (const r of rows) {
    const text = (r.detail as { text?: unknown } | null)?.text
    if (!out.has(r.aboutId) && typeof text === "string" && text) out.set(r.aboutId, text)
  }
  return out
}

/** The name of the person of the organization with this email, or null (`system`, `customer`, `api` and strangers have none). */
export async function whoNameOf(ctx: Ctx, who: string): Promise<string | null> {
  const [row] = await ctx.db
    .select({ name: s.person.name })
    .from(s.person)
    .where(and(eq(s.person.organizationId, ctx.organizationId), sql`lower(${s.person.email}) = lower(${who})`))
  return row?.name ?? null
}

/** An event row as the database hands it inside JSON (the visit query's subselect). */
export interface EventJson {
  id: string
  about: string
  about_id: string
  customer_id: string | null
  job_id: string | null
  visit_id: string | null
  kind: string
  detail: Record<string, unknown>
  who: string
  who_name: string | null
  at: string
}

/** The visit's newest 50 events as one JSON array in the visit query, newest first (the visit's story; `visitOut` shapes it). */
export const visitEventsJson = (visitId: unknown, organizationId: unknown) =>
  sql<EventJson[] | null>`(select json_agg(json_build_object('id', e.id, 'about', e.about, 'about_id', e.about_id, 'customer_id', e.customer_id, 'job_id', e.job_id, 'visit_id', e.visit_id, 'kind', e.kind, 'detail', e.detail, 'who', e.who, 'who_name', (select p.name from person p where p.organization_id = e.organization_id and lower(p.email) = lower(e.who) limit 1), 'at', e.at) order by e.at desc, e.id desc) from (select * from event where event.visit_id = ${visitId} and event.organization_id = ${organizationId} order by event.at desc, event.id desc limit 50) e)`

/** A timestamp as Postgres prints it inside JSON, as an ISO string (zone-less text is UTC). */
export const isoOfJson = (at: string) => new Date(/(Z|[+-]\d\d(:?\d\d)?)$/.test(at) ? at : `${at}Z`).toISOString()

/** The events of the visit query's JSON, as the API shows them to this caller. */
export function eventsOfJson(ctx: Ctx, rows: EventJson[] | null): EventOutType[] {
  return (rows ?? [])
    .map((r): EventOutType | null => {
      const out: EventOutType = {
        id: r.id, about: r.about as EventOutType["about"], aboutId: r.about_id, customerId: r.customer_id, jobId: r.job_id, visitId: r.visit_id,
        kind: r.kind, detail: r.detail ?? {}, who: r.who, whoName: r.who_name, at: isoOfJson(r.at),
      }
      return canSeeContact(ctx) ? out : techEvent(out)
    })
    .filter((e): e is EventOutType => e !== null)
}
