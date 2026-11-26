"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useCalendarKeys } from "@/components/blocks/use-calendar-keys"
import { useMedia } from "@/components/blocks/use-media"
import type { ExternalDrop, MoveEvent, ResizeEvent } from "@/components/blocks/time-grid-types"
import type { UnscheduledJob } from "@/components/blocks/scheduler-panels-types"
import type { MoneyOf } from "./schedule-admin-data"
import { initialState } from "./schedule-prototype-data"
import { bestTimesFor, suggestionFor } from "./schedule-best-times"
import { placementProblems, type Action, type ProtoState, type ProtoWorld, type Target } from "./schedule-prototype-model"
import { shift, type View } from "./schedule-prototype-view"
import { orderDay } from "./schedule-order"
import { createWorldStore, useWorldState, type WorldStore } from "./schedule-world-store"
import type { ScheduleResult } from "./ScheduleDialog"
import { startFromWords, buildWalkWorld } from "./walkthrough/visits-data"
import { walkMoney } from "./walkthrough/walk-home"

// The Schedule prototype's one hook: the calendar's data in a store (the walkthrough holds one for the session, a story makes its own), and state for what is open (the view and
// day, the two panels, the dialogs). Every route that moves a visit (drag, resize, the keyboard, a row dropped from Unscheduled, Edit visit) ends in
// `commit` or `schedule`: no problem with the place and it goes through; a problem opens "Move anyway?" first. A click on a block opens the peek (`peekId`); its Open job goes to
// `onOpenJob` (the job page). Nothing is sent.

export type Dialog =
  | { kind: "confirm"; action: Action; problems: string[] }
  /** the one Schedule dialog: for a visit on the calendar (Move) or a job with no day (Schedule, from a row, with the row's suggestion picked) */
  | { kind: "schedule"; id: string; job: boolean; pickId?: string }
  /** Order the day for one person's day (Day view) */
  | { kind: "order"; personId: string }
  /** Schedule all: the preview of where each job with no day would go */
  | { kind: "schedule-all" }

export interface ProtoInitial {
  view?: View
  day?: string
  panels?: { unscheduled?: boolean; map?: boolean }
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
  onState?: (s: { view: View; day: string; panels: { unscheduled: boolean; map: boolean }; hidden: string[] }) => void
  /** the people hidden from the view when it opens (the walkthrough remembers them; else this browser's last choice) */
  hidden?: string[]
  /** what a visit is worth and what was paid, for the List; the walkthrough reads its Jobs rows */
  moneyOf?: MoneyOf
  /** toast seconds: 0 keeps it up (the stories); the prototype closes it after 10, or 4 with no action */
  toastSeconds?: number
}

const HIDDEN_KEY = "trailhead.schedule.hidden"
/** This browser's last choice, kept to the people that exist; storage can throw (a private window), so it is wrapped. */
function storedHidden(people: ProtoWorld["people"]): string[] {
  try {
    const v: unknown = JSON.parse(window.localStorage.getItem(HIDDEN_KEY) ?? "[]")
    return Array.isArray(v) ? v.filter((id): id is string => typeof id === "string" && people.some((p) => p.id === id)) : []
  } catch {
    return []
  }
}

export const personIdOf = (people: ProtoWorld["people"], name: string) => people.find((p) => p.name === name)?.id

export function useScheduleProto(init: ProtoInitial = {}) {
  const [world] = useState<ProtoWorld>(() => init.world ?? buildWalkWorld())
  const [store] = useState<WorldStore>(() => init.store ?? createWorldStore(() => initialState({ visits: world.visits, unscheduled: world.unscheduled, meta: world.meta, timeOff: world.timeOff, was: world.was, ...init.state })))
  const state = useWorldState(store)
  const dispatch = store.dispatch
  const [view, setView] = useState<View>(init.view ?? (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? "day" : "week"))  // a phone opens on the day: "what is my day"
  const [day, setDay] = useState(init.day ?? world.today)
  const [panels, setPanels] = useState({ unscheduled: init.panels?.unscheduled ?? false, map: init.panels?.map ?? false })
  const [mapPick, setMapPick] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | undefined>(init.selectedId)
  const [dialog, setDialog] = useState<Dialog | null>(init.dialog ?? null)
  const wide = useMedia("(min-width: 1280px)")
  /** the visit peek is a floating card from 768 and a full-height sheet only on a phone */
  const peekFloats = useMedia("(min-width: 768px)")
  const [hidden, setHidden] = useState<string[]>(() => { const h = init.hidden ?? storedHidden(world.people); return h.length >= world.people.length ? [] : h })

  const { onState } = init
  useEffect(() => onState?.({ view, day, panels, hidden }), [onState, view, day, panels, hidden])
  const { people, today } = world
  // who is shown: hiding is a view, not a rule, so the best times and suggestions below still read `people`; at least one person always stays on
  const shown = useMemo(() => (people.filter((p) => !hidden.includes(p.id)).length ? people.filter((p) => !hidden.includes(p.id)) : people), [people, hidden])
  const togglePerson = (id: string) =>
    setHidden((h) => {
      const next = h.includes(id) ? h.filter((x) => x !== id) : people.length - h.length > 1 ? [...h, id] : h
      try { window.localStorage.setItem(HIDDEN_KEY, JSON.stringify(next)) } catch { /* a private window keeps it for the session only */ }
      return next
    })
  const keys = useCalendarKeys({ onView: setView, onToday: () => setDay(today), onNext: () => setDay((d) => shift(view, d, 1)), onPrev: () => setDay((d) => shift(view, d, -1)) })

  // a place that breaks a rule asks first; one that breaks none goes through
  const commit = useCallback((action: Action, place: Parameters<typeof placementProblems>[2]) => {
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
    if (job) commit({ type: "place", jobId: job.id, to: { day: d.day, personId: d.personId, start: d.start } }, { id: job.id, day: d.day, personId: d.personId, start: d.start, minutes: job.minutes, town: job.town, kind: job.kind, point: typeof job.lat === "number" && typeof job.lng === "number" ? { lat: job.lat, lng: job.lng } : null })
  }
  /** a click or Enter on a block opens the peek; another block swaps its content; Esc or Close shuts it */
  const onSelect = (id: string) => (setSelectedId(id), wide || setPanels({ unscheduled: false, map: false }))
  const closePeek = () => setSelectedId(undefined)
  const openJob = (id: string) => init.onOpenJob?.(id, id)
  /** Mark done: the walkthrough's visits have a job page with the reviewed flow (Done on, then How is this paid?), so it opens there; a standalone Schedule marks it in place */
  const markDone = (id: string) => (init.onOpenJob ? init.onOpenJob(id, id) : dispatch({ type: "mark-done", id }))

  const setPanel = (k: "unscheduled" | "map", open: boolean) => setPanels((p) => (wide ? { ...p, [k]: open } : { unscheduled: k === "unscheduled" && open, map: k === "map" && open }))
  const togglePanel = (k: "unscheduled" | "map") => setPanel(k, !panels[k])
  const openDay = (d: string) => { setDay(d); setView("day") }

  const notify = (ids: string[]) => dispatch({ type: "ask-notify", ids })

  /** the best times for a job with no day or a visit being moved, over the calendar as it stands */
  const bestFor = useCallback((s: Omit<Parameters<typeof bestTimesFor>[0], "state" | "people" | "today">) => bestTimesFor({ state, people, today, ...s }), [state, people, today])

  /** the Unscheduled rows with their one suggested line */
  const jobs: (UnscheduledJob & { pickId?: string })[] = useMemo(
    () => state.unscheduled.map((j) => {
      const s = suggestionFor(j, { state, people, today })
      return { ...j, suggestion: s?.words, pickId: s?.rowId }
    }),
    [state, people, today],
  )

  /** the Schedule dialog was confirmed: Schedule and notify (the customer is told) or without notifying */
  const schedule = (d: Extract<Dialog, { kind: "schedule" }>, r: ScheduleResult) => {
    const personId = personIdOf(people, r.person)
    if (!personId || !r.dayIso) return
    const to: Target = { day: r.dayIso, personId, start: startFromWords(r.time) }
    dispatch(d.job ? { type: "place", jobId: d.id, to, notified: r.notify, minutes: r.minutes } : { type: "move", id: d.id, to, notified: r.notify, minutes: r.minutes })
    // on a phone the full-screen peek would cover the result and hold the toast back, so it closes when the change is saved
    if (!peekFloats) setSelectedId(undefined)
  }

  /** the people whose day in view has an Any time stop to order (Day view only) */
  const orderable = useMemo(() => (view === "day" ? shown.filter((p) => state.visits.some((b) => b.day === day && b.personId === p.id && b.start === null && !b.done) && orderDay({ people, visits: state.visits, meta: state.meta, timeOff: state.timeOff }, p, day).moves.length > 0) : []), [view, shown, state.visits, day])

  return {
    shown, hidden, togglePerson, orderable, mapPick, setMapPick,
    state, store, dispatch, people, wide, peekFloats, view, setView, day, setDay, panels, setPanel, togglePanel, hoverId, setHoverId, selectedId, setSelectedId, dialog, setDialog,
    moneyOf: init.moneyOf ?? walkMoney, keys, openDay, notify, now: world.now, today, toastSeconds: init.toastSeconds, jobs, bestFor, schedule,
    commit, move, onMove, onResize, onDropExternal, onSelect, closePeek, openJob, markDone, onNewJob: init.onNewJob, onOpenSettings: init.onOpenSettings,
  }
}

export type Proto = ReturnType<typeof useScheduleProto>
export type { ProtoState }
