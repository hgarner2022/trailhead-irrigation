"use client"

import { useMemo, useState, type ReactNode } from "react"
import { SchedulePrototype } from "../SchedulePrototype"
import { bestTimesFor } from "../schedule-best-times"
import { BestTimesContext, type BestTimesContextValue } from "../best-times-context"
import { useWorldState } from "../schedule-world-store"
import { personIdOf } from "../use-schedule-prototype"
import { startFromWords } from "./visits-data"
import { WALK_SCHEDULE_WORLD, rememberView, rememberedView, syncWalkSchedule, walkSchedule } from "./walk-schedule"

// The walkthrough's Schedule step (docs/plans/2026-11-25-scheduler-reconciliation.md, Part C step 2): the Schedule prototype over the walkthrough's calendar, which is read from the job
// pages. A click on a visit opens that job's page; New job is the shell's sheet; a time off band goes to Settings, People. It opens as it was left (view, day, panels) because the
// calendar lives in one store for the session. `WalkBestTimes` hands the best times to the Schedule and Move dialog of any job page.

export function WalkSchedule({ day, onOpenJob, onNewJob, onOpenSettings }: { day?: string; onOpenJob: (jobId: string, visitId: string) => void; onNewJob: () => void; onOpenSettings: () => void }) {
  const [start] = useState(() => (syncWalkSchedule(), rememberedView()))
  return (
    <SchedulePrototype
      store={walkSchedule()}
      world={WALK_SCHEDULE_WORLD}
      view={day ? "day" : start.view}
      day={day ?? start.day}
      panels={start.panels}
      onState={rememberView}
      onOpenJob={onOpenJob}
      onNewJob={onNewJob}
      onOpenSettings={onOpenSettings}
      withOverlays={false}
    />
  )
}

/** Under a job's page: its Schedule and Move dialog lists the best times over the calendar and, once confirmed, puts the visit there. A job the calendar does not hold (a pass, an old job) keeps the reviewed dialog. */
export function WalkBestTimes({ jobId, children }: { jobId: string; children: ReactNode }) {
  const store = walkSchedule()
  const state = useWorldState(store)
  const value = useMemo<BestTimesContextValue | null>(() => {
    const visit = state.visits.find((v) => v.id === jobId)
    const job = state.unscheduled.find((j) => j.id === jobId)
    const hold = visit ?? job
    if (!hold) return null
    const { people, today } = WALK_SCHEDULE_WORLD
    return {
      best: bestTimesFor({ state, people, today, town: hold.town, minutes: hold.minutes, excludeId: visit?.id, currentDay: visit?.day }),
      record: (r) => {
        const personId = personIdOf(people, r.person)
        if (!personId || !r.dayIso) return
        const to = { day: r.dayIso, personId, start: startFromWords(r.time) }
        store.dispatch(job ? { type: "place", jobId, to, notified: r.notify } : { type: "move", id: jobId, to, notified: r.notify })
      },
    }
  }, [state, jobId, store])
  return <BestTimesContext.Provider value={value}>{children}</BestTimesContext.Provider>
}
