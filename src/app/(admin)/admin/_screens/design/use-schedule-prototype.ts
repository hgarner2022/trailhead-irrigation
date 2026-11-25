"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useCalendarKeys } from "@/components/blocks/use-calendar-keys"
import { useMedia } from "@/components/blocks/use-media"
import { dayShort } from "@/components/blocks/find-a-time-model"
import type { BlockAction } from "@/components/blocks/TimeBlock"
import type { ExternalDrop, MoveEvent, ResizeEvent } from "@/components/blocks/time-grid-types"
import type { UnscheduledJob } from "@/components/blocks/scheduler-panels-types"
import { initialState } from "./schedule-prototype-data"
import { bestTimesFor, suggestionFor } from "./schedule-best-times"
import { placementProblems, type Action, type ProtoState, type ProtoWorld, type Target } from "./schedule-prototype-model"
import { shift, type View } from "./schedule-prototype-view"
import { createWorldStore, useWorldState, type WorldStore } from "./schedule-world-store"
import type { ScheduleResult } from "./ScheduleDialog"
import { startFromWords, buildWalkWorld } from "./walkthrough/visits-data"

// The Schedule prototype's one hook: the calendar's data in a store (the walkthrough holds one for the session, a story makes its own), and state for what is open (the view and
// day, the two panels, the dialogs). Every route that moves a visit (drag, resize, the keyboard, a block's menu, a row dropped from Unscheduled, the Schedule dialog) ends in
// `commit` or `schedule`: no problem with the place and it goes through; a problem opens "Move the visit" first. Moving by anything but "Schedule and notify the customer" leaves
// the customer not notified. A click on a block goes to `onOpenJob` (the job page); without it the block is only selected. Nothing is sent.

export type Dialog =
  | { kind: "confirm"; action: Action; problems: string[] }
  /** the one Schedule dialog: for a visit on the calendar (Move) or a job with no day (Schedule, from a row, with the row's suggestion picked) */
  | { kind: "schedule"; id: string; job: boolean; pickId?: string }

export interface ProtoInitial {
  view?: View
  day?: string
  panels?: { unscheduled?: boolean; map?: boolean }
  tab?: "unscheduled" | "not-notified"
  selectedId?: string
  dialog?: Dialog
  /** the calendar's world; the walkthrough's by default */
  world?: ProtoWorld
  /** the walkthrough keeps one store for the whole session so a job page's Schedule and Move reach the same calendar; a story makes its own */
  store?: WorldStore
  /** story overrides of the starting state */
  state?: Parameters<typeof initialState>[0]
  /** a block was pressed: open that job's page with the visit in focus */
  onOpenJob?: (jobId: string, visitId: string) => void
  /** the header's New job */
  onNewJob?: (day?: string) => void
  /** a time off band was pressed: Settings, People */
  onOpenSettings?: () => void
  /** the view, day and panels as they change, so a screen that unmounts (a job page opened from a block) can open again as it was left */
  onState?: (s: { view: View; day: string; panels: { unscheduled: boolean; map: boolean } }) => void
  /** toast seconds: 0 keeps it up (the stories); the prototype closes it after 10 */
  toastSeconds?: number
}

export const personIdOf = (people: ProtoWorld["people"], name: string) => people.find((p) => p.name === name)?.id

export function useScheduleProto(init: ProtoInitial = {}) {
  const [world] = useState<ProtoWorld>(() => init.world ?? buildWalkWorld())
  const [store] = useState<WorldStore>(() => init.store ?? createWorldStore(() => initialState({ visits: world.visits, unscheduled: world.unscheduled, meta: world.meta, timeOff: world.timeOff, was: world.was, ...init.state })))
  const state = useWorldState(store)
  const dispatch = store.dispatch
  const [view, setView] = useState<View>(init.view ?? "week")
  const [day, setDay] = useState(init.day ?? world.today)
  const [panels, setPanels] = useState({ unscheduled: init.panels?.unscheduled ?? false, map: init.panels?.map ?? false })
  const [tab, setTab] = useState<{ tab: "unscheduled" | "not-notified"; key: number }>({ tab: init.tab ?? "unscheduled", key: 0 })
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | undefined>(init.selectedId)
  const [dialog, setDialog] = useState<Dialog | null>(init.dialog ?? null)
  const wide = useMedia("(min-width: 1280px)")

  const { onState } = init
  useEffect(() => onState?.({ view, day, panels }), [onState, view, day, panels])
  const { people, today } = world
  const keys = useCalendarKeys({ onView: setView, onToday: () => setDay(today), onNext: () => setDay((d) => shift(view, d, 1)), onPrev: () => setDay((d) => shift(view, d, -1)) })

  // a place that breaks a rule asks first; one that breaks none goes through
  const commit = useCallback((action: Action, place: { id: string; day: string; personId: string; start: number | null; minutes: number }) => {
    const problems = placementProblems(state, people, place)
    if (problems.length) setDialog({ kind: "confirm", action, problems })
    else dispatch(action)
  }, [state, people, dispatch])

  const minutesOf = (id: string) => state.visits.find((b) => b.id === id)?.minutes ?? 60
  const move = (id: string, to: Target) => commit({ type: "move", id, to }, { id, ...to, minutes: minutesOf(id) })
  const onMove = (m: MoveEvent) => move(m.id, { day: m.day, personId: m.personId, start: m.start })
  const onResize = (r: ResizeEvent) => {
    const b = state.visits.find((x) => x.id === r.id)
    if (b) commit({ type: "resize", id: r.id, minutes: r.minutes }, { id: r.id, day: b.day, personId: b.personId, start: b.start, minutes: r.minutes })
  }
  const onDropExternal = (d: ExternalDrop) => {
    const job = state.unscheduled.find((j) => j.id === d.id)
    if (job) commit({ type: "place", jobId: job.id, to: { day: d.day, personId: d.personId, start: d.start } }, { id: job.id, day: d.day, personId: d.personId, start: d.start, minutes: job.minutes })
  }
  /** a block's menu: Move and Set a time are the one Schedule dialog */
  const onAction = (id: string, a: BlockAction) => { if (a === "move") setDialog({ kind: "schedule", id, job: false }) }
  const onSelect = (id: string) => (init.onOpenJob ? init.onOpenJob(id, id) : setSelectedId(id))

  const setPanel = (k: "unscheduled" | "map", open: boolean) => setPanels((p) => (wide ? { ...p, [k]: open } : { unscheduled: k === "unscheduled" && open, map: k === "map" && open }))
  const togglePanel = (k: "unscheduled" | "map") => setPanel(k, !panels[k])
  const openNotNotified = () => { setPanels((p) => (wide ? { ...p, unscheduled: true } : { unscheduled: true, map: false })); setTab((t) => ({ tab: "not-notified", key: t.key + 1 })) }
  const openDay = (d: string) => { setDay(d); setView("day") }

  const notify = (ids: string[]) => dispatch({ type: "ask-notify", ids })
  const dontNotify = (ids: string[]) => dispatch({ type: "told", ids })

  /** the best times for a job with no day or a visit being moved, over the calendar as it stands */
  const bestFor = useCallback((s: Omit<Parameters<typeof bestTimesFor>[0], "state" | "people" | "today">) => bestTimesFor({ state, people, today, ...s }), [state, people, today])

  /** the Unscheduled rows with their one suggested line */
  const jobs: (UnscheduledJob & { pickId?: string })[] = useMemo(
    () => state.unscheduled.map((j) => {
      const s = suggestionFor(j, { state, people, today }, dayShort)
      return { ...j, suggestion: s?.words, pickId: s?.rowId }
    }),
    [state, people, today],
  )

  /** the Schedule dialog was confirmed: Schedule and notify (the customer is told) or without notifying */
  const schedule = (d: Extract<Dialog, { kind: "schedule" }>, r: ScheduleResult) => {
    const personId = personIdOf(people, r.person)
    if (!personId || !r.dayIso) return
    const to: Target = { day: r.dayIso, personId, start: startFromWords(r.time) }
    dispatch(d.job ? { type: "place", jobId: d.id, to, notified: r.notify } : { type: "move", id: d.id, to, notified: r.notify })
  }

  return {
    state, store, dispatch, people, wide, view, setView, day, setDay, panels, setPanel, togglePanel, tab, openNotNotified, hoverId, setHoverId, selectedId, setSelectedId, dialog, setDialog,
    keys, openDay, notify, dontNotify, now: world.now, today, toastSeconds: init.toastSeconds ?? 10, jobs, bestFor, schedule,
    commit, move, onMove, onResize, onDropExternal, onAction, onSelect, onNewJob: init.onNewJob, onOpenSettings: init.onOpenSettings,
    notNotifiedCount: useMemo(() => state.visits.filter((b) => b.notTold).length, [state.visits]),
  }
}

export type Proto = ReturnType<typeof useScheduleProto>
export type { ProtoState }
