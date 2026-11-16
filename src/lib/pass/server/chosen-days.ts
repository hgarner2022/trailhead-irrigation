import "server-only"
import { and, eq } from "drizzle-orm"
import { emitEvent } from "@/api/v1/webhooks/deliver"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { orderDay } from "@/lib/scheduling/server/order-day"
import { openSlots, personFor, type Slot } from "./area-days"

export interface ChosenDayInput {
  kind: "turn-on" | "inspection" | "blowout"
  day: string
  personId: string
  start: string
}

/** Where a visit ended up when its chosen day was gone: the day it was asked for and the day it got. */
export interface ShiftedDay {
  visitId: string
  kind: string
  from: string
  to: string
}

const pickable = (row: { id: string; organizationId: string; kind: string }, town: string) => ({ id: row.id, organizationId: row.organizationId, kind: row.kind, town })

/**
 * Holds the days the customer picked on the pending pass's visits: day, person and the start of the window, the visit still
 * `unscheduled`. A held day counts against that person's day (the scheduler reads every visit assigned to someone), so two buyers are not
 * offered the last place. A day that is not open any more is not stored; that visit waits for the scheduler.
 */
export async function holdChosenDays(db: Database, passId: string, days: ChosenDayInput[], town: string, season: number, today: string): Promise<number> {
  let held = 0
  const visits = await db.select().from(s.visit).where(eq(s.visit.passId, passId))
  for (const v of visits) {
    const chosen = days.find((d) => d.kind === v.kind)
    if (!chosen) continue
    const slots = await openSlots(db, pickable(v, town), today, season)
    if (!slots.some((x) => x.day === chosen.day && x.personId === chosen.personId)) continue
    await db.update(s.visit).set({ personId: chosen.personId, scheduledOn: chosen.day, startTime: chosen.start, awaitingPick: false }).where(eq(s.visit.id, v.id))
    held++
  }
  return held
}

/**
 * Holds the days the office typed on a pass's visits, one day per visit kind. An open day is held with the person `personFor` picks,
 * with its window start; a day that is not open (a weekend, a full day, outside the window) is held as typed with the first
 * person with any open day, so `scheduleChosenDays` moves it to the next open day and records the move for the confirmation.
 * A kind with no open day at all is left with no day yet. Returns the kinds held.
 */
export async function holdOfficeDays(db: Database, passId: string, days: Partial<Record<ChosenDayInput["kind"], string | undefined>>, town: string, season: number, today: string): Promise<string[]> {
  const held: string[] = []
  const visits = await db.select().from(s.visit).where(eq(s.visit.passId, passId))
  for (const v of visits) {
    const day = days[v.kind as ChosenDayInput["kind"]]
    if (!day) continue
    const slots = await openSlots(db, pickable(v, town), today, season)
    const slot = personFor(slots, day) ?? slots[0]
    if (!slot) continue
    const open = slot.day === day
    await db.update(s.visit).set({ personId: slot.personId, scheduledOn: day, startTime: open ? slot.start : null, awaitingPick: false }).where(eq(s.visit.id, v.id))
    held.push(v.kind)
  }
  return held
}

/** The slot a visit takes when its chosen day filled up: the next open day after it, else the earliest open one; none when nothing is open. */
export function nextOpen(slots: Slot[], chosenDay: string): Slot | undefined {
  const later = slots.filter((x) => x.day > chosenDay)
  const days = [...new Set((later.length ? later : slots).map((x) => x.day))].sort()
  return days[0] ? personFor(slots, days[0]) : undefined
}

/**
 * Turns the held days into scheduled visits once the pass is active: each goes to its chosen person and day, or, when that filled up
 * since, on the next open day. The touched days are ordered. A visit with no held day stays for the scheduler; one that is
 * already scheduled is left alone, so the webhook and the page both calling this changes nothing the second time.
 */
export async function scheduleChosenDays(db: Database, passId: string, town: string, season: number, today: string): Promise<ShiftedDay[]> {
  const visits = await db.select().from(s.visit).where(and(eq(s.visit.passId, passId), eq(s.visit.status, "unscheduled")))
  const shifted: ShiftedDay[] = []
  const touched = new Map<string, { personId: string; day: string }>()
  for (const v of visits) {
    if (!v.scheduledOn || !v.personId) continue
    const slots = await openSlots(db, pickable(v, town), today, season)
    const stillOpen = slots.some((x) => x.day === v.scheduledOn && x.personId === v.personId)
    const slot = stillOpen ? { personId: v.personId, day: v.scheduledOn } : nextOpen(slots, v.scheduledOn)
    if (!slot) {
      await db.update(s.visit).set({ personId: null, scheduledOn: null, startTime: null }).where(eq(s.visit.id, v.id))
      shifted.push({ visitId: v.id, kind: v.kind, from: v.scheduledOn, to: "" })
      continue
    }
    await db.update(s.visit).set({ status: "scheduled", personId: slot.personId, scheduledOn: slot.day, stopOrder: null, ...(stillOpen ? {} : { startTime: null }) }).where(eq(s.visit.id, v.id))
    touched.set(`${slot.personId}|${slot.day}`, { personId: slot.personId, day: slot.day })
    if (!stillOpen) shifted.push({ visitId: v.id, kind: v.kind, from: v.scheduledOn, to: slot.day })
    await emitEvent(db, v.organizationId, "visit.scheduled", { visitId: v.id, personId: slot.personId, scheduledOn: slot.day, from: null })
  }
  for (const t of touched.values()) await orderDay(db, t)
  return shifted
}
