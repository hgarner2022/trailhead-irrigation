import "server-only"
import { and, eq, inArray, lt } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { mountainDay, addDays } from "@/api/v1/shared"
import { weekOf } from "@/lib/admin/calendar"
import { readAppUrl } from "@/lib/env"
import { currentSeason } from "@/lib/pass/season"
import { kindName } from "@/lib/pass/server/messages"
import { baseData, loadVisitFacts } from "@/lib/messaging/data"
import { queueMessage, queueStaffMessage } from "@/lib/messaging/queue"
import { enqueue } from "@/lib/queue"
import { crewSummary, twoHourWindow } from "../summary"
import { TIME_ZONE } from "../types"

export interface DailyResult {
  dayBefore: number
  notClosed: number
  runsQueued: number
  summaries: number
}

/** Visits whose day has passed with no completion become `not-closed`, which Home shows as "not closed yet". Nothing charges on its own. Returns how many. */
export async function notClosedCheck(db: Database, organizationId: string, today: string): Promise<number> {
  const rows = await db
    .update(s.visit)
    .set({ status: "not-closed" })
    .where(and(eq(s.visit.organizationId, organizationId), eq(s.visit.status, "scheduled"), lt(s.visit.scheduledOn, today)))
    .returning({ id: s.visit.id })
  return rows.length
}

/** The day-before text (email with no mobile number) for every scheduled visit tomorrow, with the two-hour window once the stops are ordered. */
export async function dayBeforeMessages(db: Database, organizationId: string, tomorrow: string): Promise<number> {
  const rows = await db
    .select({ visit: s.visit, customer: s.customer })
    .from(s.visit)
    .innerJoin(s.customer, eq(s.customer.id, s.visit.customerId))
    .where(and(eq(s.visit.organizationId, organizationId), eq(s.visit.status, "scheduled"), eq(s.visit.scheduledOn, tomorrow)))
  let queued = 0
  for (const { visit, customer } of rows) {
    const origin = readAppUrl()
    const facts = await loadVisitFacts(db, visit.id, origin)
    if (!facts) continue
    if (await queueMessage(db, { organizationId, customerId: customer.id, visitId: visit.id, kind: "day-before", key: `${visit.id}-${tomorrow}`, data: { ...baseData(origin, customer), visit: facts } })) queued++
  }
  return queued
}

/** Queue a `schedule-run` for each window that is inside its lead weeks with no run recorded for its season. */
export async function queueDueRuns(db: Database, organizationId: string, today: string): Promise<number> {
  const [org] = await db.select({ settings: s.organization.settings }).from(s.organization).where(eq(s.organization.id, organizationId))
  const runs = await db.select({ season: s.scheduleRun.season, window: s.scheduleRun.window }).from(s.scheduleRun).where(eq(s.scheduleRun.organizationId, organizationId))
  let queued = 0
  for (const w of org?.settings.windows ?? []) {
    const season = Number(w.opensOn.slice(0, 4)) || currentSeason(today)
    const due = today >= addDays(w.opensOn.slice(0, 10), -w.leadWeeks * 7) && today <= w.closesOn.slice(0, 10)
    if (!due || runs.some((r) => r.window === w.kind && r.season === season)) continue
    if (await enqueue(db, organizationId, "schedule-run", `${w.kind}:${season}:first`, { window: w.kind, season, by: "system" })) queued++
  }
  return queued
}

/** The crew note to every admin: one `message` queue row each, sent by the messaging layer. */
export async function crewSummaryEmails(db: Database, organizationId: string, today: string): Promise<number> {
  const tomorrow = addDays(today, 1)
  const rows = await db
    .select({ visit: s.visit, truckName: s.truck.name, town: s.property.town })
    .from(s.visit)
    .innerJoin(s.property, eq(s.property.id, s.visit.propertyId))
    .leftJoin(s.truck, eq(s.truck.id, s.visit.truckId))
    .where(eq(s.visit.organizationId, organizationId))
  const live = rows.filter((r) => r.visit.status !== "cancelled" && r.visit.status !== "skipped")
  const weekStart = weekOf(today, TIME_ZONE)
  const going = live.filter((r) => r.visit.scheduledOn === tomorrow && r.truckName).map((r) => ({ truckName: r.truckName!, town: r.town }))
  const text = crewSummary({
    tomorrow: going,
    movedInJobber: live.filter((r) => r.visit.exception && r.visit.scheduledOn && r.visit.scheduledOn >= weekStart && r.visit.scheduledOn <= addDays(weekStart, 6)).length,
    notMarkedDone: live.filter((r) => r.visit.status === "not-closed" && r.visit.scheduledOn === addDays(today, -1)).length,
  })
  const origin = readAppUrl()
  const title = going.length === 0 ? "Tomorrow: nothing on the calendar" : `Tomorrow: ${going.length} ${going.length === 1 ? "visit" : "visits"}`
  let queued = await queueStaffMessage(db, organizationId, "admin-alert", `crew-summary:${tomorrow}`, { origin, title, detail: text, path: "/admin/schedule" })
  const unclosed = live.filter((r) => r.visit.status === "not-closed" && r.visit.scheduledOn === addDays(today, -1))
  if (unclosed.length > 0) {
    const named = await db.select({ id: s.visit.id, kind: s.visit.kind, day: s.visit.scheduledOn, first: s.customer.firstName, last: s.customer.lastName, town: s.property.town }).from(s.visit).innerJoin(s.customer, eq(s.customer.id, s.visit.customerId)).innerJoin(s.property, eq(s.property.id, s.visit.propertyId)).where(inArray(s.visit.id, unclosed.map((r) => r.visit.id)))
    queued += await queueStaffMessage(db, organizationId, "not-closed-crew", `not-closed:${today}`, { origin, visits: named.map((v) => ({ customer: [v.first, v.last].filter(Boolean).join(" "), name: kindName(v.kind), day: v.day!, town: v.town })) })
  }
  return queued
}

/**
 * The daily run, once a day: flag visits nobody closed, text tomorrow's customers, queue a Schedule run for any window now
 * inside its lead weeks that has not run, and send the crew its note. Every step is idempotent on its day, so a second run the
 * same day adds nothing.
 */
export async function daily(db: Database, now: Date = new Date()): Promise<DailyResult> {
  const today = mountainDay(now)
  const orgs = await db.select({ id: s.organization.id }).from(s.organization)
  const total: DailyResult = { dayBefore: 0, notClosed: 0, runsQueued: 0, summaries: 0 }
  for (const { id } of orgs) {
    total.notClosed += await notClosedCheck(db, id, today)
    total.dayBefore += await dayBeforeMessages(db, id, addDays(today, 1))
    total.runsQueued += await queueDueRuns(db, id, today)
    total.summaries += await crewSummaryEmails(db, id, today)
  }
  return total
}
