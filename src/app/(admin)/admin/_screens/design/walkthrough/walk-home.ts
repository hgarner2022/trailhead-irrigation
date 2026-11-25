import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import type { ProtoState } from "../schedule-prototype-model"
import { visitsOf } from "../schedule-prototype-view"
import { rowOf } from "./jobs-data"
import { WALK_PEOPLE } from "./visits-data"
import { WALK_SCHEDULE_TODAY } from "./visits-data"

// Home on the Schedule's world (docs/plans/2026-11-25-scheduler-holistic-audit.md, rows 3 and 34): the same visits, the same people and the same "now" as the calendar, so today's stops on Home
// are the Schedule's Wednesday and a move there shows here. The repo's snapshot supplies what Home needs that the calendar does not hold (the areas, the settings); its own visits and its
// Needs action rows are left out because they belong to another world. Pure.

const LIVE = snapshot as unknown as AdminData
/** 10:20 am Mountain on the Schedule's today, the instant the calendar's now line is drawn at. */
export const HOME_NOW = `${WALK_SCHEDULE_TODAY}T17:20:00Z`

const pad = (n: number) => String(n).padStart(2, "0")

export function homeData(state: Pick<ProtoState, "visits" | "meta">): AdminData {
  const visits = visitsOf(state.visits, state.meta).map((v) => {
    const b = state.visits.find((x) => x.id === v.id)!
    const person = WALK_PEOPLE.find((p) => p.id === b.personId)
    return {
      ...v,
      personName: person?.name,
      startTime: b.start === null ? undefined : `${pad(Math.floor(b.start / 60))}:${pad(b.start % 60)}`,
      price: rowOf(v.id)?.total ?? 0,
      jobId: v.id,
      completedOn: b.done ? b.day : undefined,
    }
  })
  return { ...LIVE, visits, attention: [], settings: { ...LIVE.settings, people: WALK_PEOPLE } }
}
