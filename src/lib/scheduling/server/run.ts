import "server-only"
import { and, eq, inArray, isNull } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { emitEvent } from "@/api/v1/webhooks/deliver"
import { shortDate } from "@/lib/admin/format"
import { currentSeason } from "@/lib/pass/season"
import { weekOf } from "@/lib/admin/calendar"
import { scheduleVisits } from "../schedule"
import { TIME_ZONE, type SchedVisit } from "../types"
import { loadTaken, loadWorld } from "./inputs"
import { queueDateMessage } from "./notify"
import { orderDay } from "./order-day"

export type RunWindow = "turn-on" | "inspection" | "blowout"

export interface RunResult {
  runId: string
  placed: number
  unplaced: number
  waiting: number
  deferred: number
}

const PLURAL: Record<RunWindow, string> = { "turn-on": "turn-ons", inspection: "inspections", blowout: "blowouts" }

/** "12 turn-ons scheduled for the week of May 3; 2 could not be placed." */
export function runSummary(window: RunWindow, placedDays: string[], placed: number, unplaced: number): string {
  const first = [...placedDays].sort()[0]
  const week = first ? ` for the week of ${shortDate(weekOf(first, TIME_ZONE))}` : ""
  const head = `${placed} ${placed === 1 ? PLURAL[window].replace(/s$/, "") : PLURAL[window]} scheduled${week}`
  return unplaced > 0 ? `${head}; ${unplaced} could not be placed` : head
}

/**
 * Schedule: every "to schedule" pass visit of the window whose window opens within its lead weeks goes onto a truck-day, in one
 * step. The result is written as scheduled visits (day, truck, length), the day's stops are ordered, each customer is queued
 * their date, and Home gets one line for the run plus a row for each visit that could not be placed. A visit marked as waiting for
 * its customer's pick is left for it. Running it twice places nothing the second time.
 */
export async function runSchedule(db: Database, input: { organizationId: string; window: RunWindow; season?: number; today: string; now?: Date; by?: string }): Promise<RunResult> {
  const { organizationId, window, today } = input
  const now = input.now ?? new Date()
  const season = input.season ?? currentSeason(today)
  const [config] = (await db.select({ settings: s.organization.settings }).from(s.organization).where(eq(s.organization.id, organizationId))).map((o) => o.settings.windows.find((w) => w.kind === window))
  const closes = config?.closesOn.slice(0, 10) ?? today

  const rows = await db
    .select({ visit: s.visit, firstName: s.customer.firstName, town: s.property.town })
    .from(s.visit)
    .innerJoin(s.seasonPass, eq(s.seasonPass.id, s.visit.passId))
    .innerJoin(s.customer, eq(s.customer.id, s.visit.customerId))
    .innerJoin(s.property, eq(s.property.id, s.visit.propertyId))
    .where(and(eq(s.visit.organizationId, organizationId), eq(s.visit.kind, window), eq(s.visit.status, "unscheduled"), eq(s.seasonPass.status, "active"), eq(s.seasonPass.season, season)))
  const world = await loadWorld(db, organizationId, today, closes)
  const taken = await loadTaken(db, organizationId, today, closes)
  const visits: SchedVisit[] = rows.map((r) => ({ id: r.visit.id, kind: r.visit.kind, town: r.town, preference: r.visit.preference, needsCustomerHome: r.visit.awaitingPick, durationMinutes: r.visit.durationMinutes }))
  const result = scheduleVisits({ visits, ...world, from: today, taken, blocks: world.blocks })
  const byId = new Map(rows.map((r) => [r.visit.id, r]))

  // The write: scheduled directly, no step between. The `unscheduled` guard keeps a repeat from moving a visit twice.
  for (const p of result.placed) {
    await db
      .update(s.visit)
      .set({ status: "scheduled", truckId: p.truckId, scheduledOn: p.day, durationMinutes: p.durationMinutes, awaitingPick: false, startTime: null, stopOrder: null })
      .where(and(eq(s.visit.id, p.visitId), eq(s.visit.status, "unscheduled")))
  }
  const touched = new Map(result.placed.map((p) => [`${p.truckId}|${p.day}`, p]))
  for (const p of touched.values()) await orderDay(db, { truckId: p.truckId, day: p.day })
  for (const p of result.placed) {
    const r = byId.get(p.visitId)!
    await queueDateMessage(db, r.visit, "date-set", p.day)
    await emitEvent(db, organizationId, "visit.scheduled", { visitId: p.visitId, truckId: p.truckId, scheduledOn: p.day, from: null })
  }
  if (result.waiting.length) await db.update(s.visit).set({ awaitingPick: true }).where(inArray(s.visit.id, result.waiting))

  const [run] = await db
    .insert(s.scheduleRun)
    .values({ organizationId, season, window, ranAt: now, ranBy: input.by ?? "system", counts: { placed: result.placed.length, unplaced: result.unplaced.length, waiting: result.waiting.length, deferred: result.deferred.length } })
    .returning({ id: s.scheduleRun.id })

  if (result.placed.length) {
    await db.update(s.adminAlert).set({ resolvedAt: now }).where(and(eq(s.adminAlert.organizationId, organizationId), eq(s.adminAlert.kind, "unplaced"), isNull(s.adminAlert.resolvedAt), inArray(s.adminAlert.key, result.placed.map((p) => p.visitId))))
  }
  for (const u of result.unplaced) {
    const r = byId.get(u.visitId)!
    const message = `${r.firstName}'s ${r.visit.kind.replace("-", " ")} could not be placed: ${u.reason}`
    await db.insert(s.adminAlert).values({ organizationId, kind: "unplaced", key: u.visitId, passId: r.visit.passId, message }).onConflictDoUpdate({ target: [s.adminAlert.organizationId, s.adminAlert.kind, s.adminAlert.key], set: { message, resolvedAt: null } })
  }
  if (result.placed.length || result.unplaced.length) {
    await db.insert(s.adminAlert).values({ organizationId, kind: "scheduled", key: run!.id, message: runSummary(window, result.placed.map((p) => p.day), result.placed.length, result.unplaced.length) }).onConflictDoNothing()
  }
  return { runId: run!.id, placed: result.placed.length, unplaced: result.unplaced.length, waiting: result.waiting.length, deferred: result.deferred.length }
}
