import { initialState } from "../schedule-prototype-data"
import { createWorldStore, type WorldStore } from "../schedule-world-store"
import type { ProtoWorld } from "../schedule-prototype-model"
import type { View } from "../schedule-prototype-view"
import { allRows, bindLive } from "./jobs-data"
import { WALK_PEOPLE, WALK_SCHEDULE_TODAY, buildWalkWorld, walkRoutePeople } from "./visits-data"

// The walkthrough's Schedule held for the whole session: one store (the calendar, the jobs with no day, the time off), so a click on a visit and the way back find it as it was,
// and a job page's Schedule or Move land on the same calendar. Start over rebuilds it from the world. The view the person left the Schedule in is remembered with it.

let store: WorldStore | null = null
let remembered: { view: View; day: string; panels: { unscheduled: boolean; map: boolean }; hidden?: string[] } = { view: "week", day: WALK_SCHEDULE_TODAY, panels: { unscheduled: false, map: false } }

let building = false
const make = () => {
  building = true
  try {
    const w = buildWalkWorld()
    return initialState({ visits: w.visits, unscheduled: w.unscheduled, meta: w.meta, timeOff: w.timeOff, was: w.was })
  } finally {
    building = false
  }
}

// The rest of the walkthrough reads a visit's day, time and person from this store (jobs-data.ts `bindLive`), once it exists.
bindLive((id) => {
  if (building || !store) return undefined
  const s = store.getSnapshot()
  const v = s.visits.find((b) => b.id === id)
  if (v) return { day: v.day, personName: WALK_PEOPLE.find((p) => p.id === v.personId)?.name ?? "No one yet", start: v.start, done: Boolean(v.done) }
  return s.unscheduled.some((j) => j.id === id) ? { day: null, personName: "No one yet", start: null, done: false } : undefined
})

/** The one store. */
export const walkSchedule = (): WorldStore => (store ??= createWorldStore(make))

/** The world a screen reads for today and the people; the data itself is the store's. */
export const WALK_SCHEDULE_WORLD: ProtoWorld = { today: WALK_SCHEDULE_TODAY, now: { day: WALK_SCHEDULE_TODAY, minutes: 10 * 60 + 20 }, get people() { return walkRoutePeople() }, visits: [], meta: {}, unscheduled: [], timeOff: [] }

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
    if (!(row.stage === "unscheduled" || (row.stage === "scheduled" && row.next === "Unscheduled")) || state.unscheduled.some((j) => j.id === row.id) || state.visits.some((v) => v.id === row.id)) continue
    const job = world.unscheduled.find((j) => j.id === row.id)
    if (job) s.dispatch({ type: "add-unscheduled", job })
  }
}
