import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, AdminPayment, Person } from "@/lib/admin/types"
import type { ProtoState } from "./schedule-prototype-model"
import { visitsOf } from "./schedule-prototype-view"

// The Schedule's calendar as the product's own `AdminData` (docs/plans/2026-11-25-scheduler-holistic-audit.md, rows 3, 14 and 34): the same visits, people and "now", so Home's Today and the List
// view's grid read the calendar the Schedule is drawing and never a world of their own. The repo's snapshot supplies what the calendar does not hold (areas, settings); its own visits and Needs
// action rows belong to another world and are left out. Pure.

const LIVE = snapshot as unknown as AdminData
const pad = (n: number) => String(n).padStart(2, "0")

/** 10:20 am Mountain on a day, the instant the calendar's now line is drawn at. */
export const nowOn = (day: string) => `${day}T17:20:00Z`

/** What a visit is worth and what was paid for it, where the world knows (the walkthrough's Jobs rows); a visit nothing is known about is unpriced and unpaid. */
export type MoneyOf = (visitId: string) => { price: number; payment?: AdminPayment }

export function adminDataOf(state: Pick<ProtoState, "visits" | "meta">, people: readonly Person[], moneyOf: MoneyOf = () => ({ price: 0 })): AdminData {
  const visits = visitsOf(state.visits, state.meta).map((v) => {
    const b = state.visits.find((x) => x.id === v.id)!
    return {
      ...v,
      personName: people.find((p) => p.id === b.personId)?.name,
      startTime: b.start === null ? undefined : `${pad(Math.floor(b.start / 60))}:${pad(b.start % 60)}`,
      price: moneyOf(v.id).price,
      ...(moneyOf(v.id).payment ? { payments: [moneyOf(v.id).payment!] } : {}),
      jobId: v.id,
      completedOn: b.done ? b.day : undefined,
    }
  })
  return { ...LIVE, visits, attention: [], settings: { ...LIVE.settings, people: [...people] } }
}
