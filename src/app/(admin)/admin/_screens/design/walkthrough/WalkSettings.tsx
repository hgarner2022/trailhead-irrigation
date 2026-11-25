"use client"

import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { SettingsScreen } from "../../SettingsScreen"
import type { PeopleTimeOff } from "../../settings-tabs/People"
import { timeOffRows, timeOffWords } from "../schedule-prototype-model"
import { useWorldState } from "../schedule-world-store"
import { WALK_PEOPLE } from "./visits-data"
import { WALK_SCHEDULE_WORLD, walkSchedule } from "./walk-schedule"

// The walkthrough's Settings: the live screen over the repo's settings with the walkthrough's two people, and People carries each person's Time off (the Schedule only draws the band).
// Time off lives in the same store as the calendar, so adding it here shows on the Schedule and a visit inside it is left where it is.

const LIVE = snapshot as AdminData
const DATA: AdminData = { ...LIVE, settings: { ...LIVE.settings, people: WALK_PEOPLE } }
const LIVE_TODAY = "2026-11-12T19:56:30Z"

export function WalkSettings() {
  const store = walkSchedule()
  const state = useWorldState(store)
  const timeOff: PeopleTimeOff = {
    list: state.timeOff,
    words: timeOffWords,
    today: WALK_SCHEDULE_WORLD.today,
    onAdd: (v) => {
      for (const row of timeOffRows(v, (d) => `off-${v.personId}-${d}-${Date.now()}`)) store.dispatch({ type: "time-off-save", value: row })
    },
    onRemove: (id) => store.dispatch({ type: "time-off-remove", id }),
  }
  return <SettingsScreen data={DATA} today={LIVE_TODAY} defaultTab="people" timeOff={timeOff} />
}
