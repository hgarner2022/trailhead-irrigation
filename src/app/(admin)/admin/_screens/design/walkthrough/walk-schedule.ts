import { initialState } from "../schedule-prototype-data"
import { createWorldStore, type WorldStore } from "../schedule-world-store"
import type { ProtoWorld } from "../schedule-prototype-model"
import type { View } from "../schedule-prototype-view"
import { allRows } from "./jobs-data"
import { WALK_PEOPLE, WALK_SCHEDULE_TODAY, buildWalkWorld } from "./visits-data"

// The walkthrough's Schedule held for the whole session: one store (the calendar, the jobs with no day, the time off), so a click on a visit and the way back find it as it was,
// and a job page's Schedule or Move land on the same calendar. Start over rebuilds it from the world. The view the person left the Schedule in is remembered with it.

let store: WorldStore | null = null
let remembered: { view: View; day: string; panels: { unscheduled: boolean; map: boolean } } = { view: "week", day: WALK_SCHEDULE_TODAY, panels: { unscheduled: false, map: false } }

const make = () => {
  const w = buildWalkWorld()
  return initialState({ visits: w.visits, unscheduled: w.unscheduled, meta: w.meta, timeOff: w.timeOff, was: w.was })
}

/** The one store. */
export const walkSchedule = (): WorldStore => (store ??= createWorldStore(make))

/** The world a screen reads for today and the people; the data itself is the store's. */
export const WALK_SCHEDULE_WORLD: ProtoWorld = { today: WALK_SCHEDULE_TODAY, now: { day: WALK_SCHEDULE_TODAY, minutes: 10 * 60 + 20 }, people: WALK_PEOPLE, visits: [], meta: {}, unscheduled: [], timeOff: [] }

export const rememberedView = () => remembered
export const rememberView = (v: typeof remembered) => void (remembered = v)

/** Start over: the calendar is read from the world again and the view goes back to this week. */
export function resetWalkSchedule() {
  remembered = { view: "week", day: WALK_SCHEDULE_TODAY, panels: { unscheduled: false, map: false } }
  store?.reset()
}

/** A job made in the walkthrough (New job) with no day joins Unscheduled the first time the Schedule or a dialog needs it. */
export function syncWalkSchedule() {
  const s = walkSchedule()
  const state = s.getSnapshot()
  const world = buildWalkWorld()
  for (const row of allRows()) {
    if (row.stage !== "unscheduled" || state.unscheduled.some((j) => j.id === row.id) || state.visits.some((v) => v.id === row.id)) continue
    const job = world.unscheduled.find((j) => j.id === row.id)
    if (job) s.dispatch({ type: "add-unscheduled", job })
  }
}
