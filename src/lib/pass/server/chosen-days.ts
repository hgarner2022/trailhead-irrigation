import "server-only"
import { and, eq } from "drizzle-orm"
import { emitEvent } from "@/api/v1/webhooks/deliver"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { orderDay } from "@/lib/scheduling/server/order-day"
import { openSlots, truckFor, type Slot } from "./area-days"

export interface ChosenDayInput {
  kind: "turn-on" | "inspection" | "blowout"
  day: string
  truckId: string
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
 * Holds the days the customer picked on the pending pass's visits: day, truck and the start of the window, the visit still
 * `unscheduled`. A held day counts against its truck-day (the scheduler reads every visit with a truck), so two buyers are not
 * offered the last place. A day that is not open any more is not stored; that visit waits for the scheduler.
 */
export async function holdChosenDays(db: Database, passId: string, days: ChosenDayInput[], town: string, season: number, today: string): Promise<number> {
  let held = 0
  const visits = await db.select().from(s.visit).where(eq(s.visit.passId, passId))
  for (const v of visits) {
    const chosen = days.find((d) => d.kind === v.kind)
    if (!chosen) continue
    const slots = await openSlots(db, pickable(v, town), today, season)
    if (!slots.some((x) => x.day === chosen.day && x.truckId === chosen.truckId)) continue
    await db.update(s.visit).set({ truckId: chosen.truckId, scheduledOn: chosen.day, startTime: chosen.start, awaitingPick: false }).where(eq(s.visit.id, v.id))
    held++
  }
  return held
}

/** The slot a visit takes when its chosen day filled up: the next open day after it, else the earliest open one; none when nothing is open. */
export function nextOpen(slots: Slot[], chosenDay: string): Slot | undefined {
  const later = slots.filter((x) => x.day > chosenDay)
  const days = [...new Set((later.length ? later : slots).map((x) => x.day))].sort()
  return days[0] ? truckFor(slots, days[0]) : undefined
}

/**
 * Turns the held days into scheduled visits once the pass is active: each goes on its chosen truck-day, or, when that filled up
 * since, on the next open day. The touched truck-days are ordered. A visit with no held day stays for the scheduler; one that is
 * already scheduled is left alone, so the webhook and the page both calling this changes nothing the second time.
 */
export async function scheduleChosenDays(db: Database, passId: string, town: string, season: number, today: string): Promise<ShiftedDay[]> {
  const visits = await db.select().from(s.visit).where(and(eq(s.visit.passId, passId), eq(s.visit.status, "unscheduled")))
  const shifted: ShiftedDay[] = []
  const touched = new Map<string, { truckId: string; day: string }>()
  for (const v of visits) {
    if (!v.scheduledOn || !v.truckId) continue
    const slots = await openSlots(db, pickable(v, town), today, season)
    const stillOpen = slots.some((x) => x.day === v.scheduledOn && x.truckId === v.truckId)
    const slot = stillOpen ? { truckId: v.truckId, day: v.scheduledOn } : nextOpen(slots, v.scheduledOn)
    if (!slot) {
      await db.update(s.visit).set({ truckId: null, scheduledOn: null, startTime: null }).where(eq(s.visit.id, v.id))
      shifted.push({ visitId: v.id, kind: v.kind, from: v.scheduledOn, to: "" })
      continue
    }
    await db.update(s.visit).set({ status: "scheduled", truckId: slot.truckId, scheduledOn: slot.day, stopOrder: null, ...(stillOpen ? {} : { startTime: null }) }).where(eq(s.visit.id, v.id))
    touched.set(`${slot.truckId}|${slot.day}`, { truckId: slot.truckId, day: slot.day })
    if (!stillOpen) shifted.push({ visitId: v.id, kind: v.kind, from: v.scheduledOn, to: slot.day })
    await emitEvent(db, v.organizationId, "visit.scheduled", { visitId: v.id, truckId: slot.truckId, scheduledOn: slot.day, from: null })
  }
  for (const t of touched.values()) await orderDay(db, t)
  return shifted
}
