"use client"

import { useCallback, useMemo, useReducer, useState } from "react"
import { addDays } from "@/lib/admin/calendar"
import { useCalendarKeys } from "@/components/blocks/use-calendar-keys"
import { useMedia } from "@/components/blocks/use-media"
import type { PlanStatus } from "@/components/blocks/PlanStrip"
import type { TimeOffValue } from "@/components/blocks/TimeOffDialog"
import { clockToMinutes, type TimeOff } from "@/components/blocks/time-grid-model"
import type { BlockAction } from "@/components/blocks/TimeBlock"
import type { ExternalDrop, MoveEvent, ResizeEvent, TimeOffDragEvent } from "@/components/blocks/time-grid-types"
import { NOW, PEOPLE, TODAY, initialState } from "./schedule-prototype-data"
import { placementProblems, reduce, type Action, type ProtoState, type Target } from "./schedule-prototype-model"
import { shift, type View } from "./schedule-prototype-view"
import { useJevProto } from "./use-jev-proto"
import { useNewJobProto, type NewJobInit } from "./use-new-job-proto"

// The Schedule prototype's one hook: the reducer for the data, and state for what is open (the view and day, the two panels, the visit panel, the dialogs). Every route that moves
// a visit (drag, resize, keyboard, block menu, a row dropped from Unscheduled, Jev's plan) ends in `commit`: no problem with the place and it goes through; a problem opens the
// "Move anyway?" question first. `ProtoInitial` is what a story opens in. Nothing is sent.

export type Dialog =
  | { kind: "notify"; ids: string[] }
  | { kind: "confirm"; action: Action; problems: string[] }
  | { kind: "time-off"; mode: "add" | "edit"; value: TimeOffValue; id?: string }
  | { kind: "move"; id: string }

export interface ProtoInitial {
  view?: View
  day?: string
  panels?: { unscheduled?: boolean; map?: boolean }
  tab?: "unscheduled" | "not-told"
  selectedId?: string
  dialog?: Dialog
  state?: Parameters<typeof initialState>[0]
  jev?: PlanStatus | null
  /** how long Jev works, in milliseconds; a story that holds the drafting state gives it a very long one */
  jevDelayMs?: number
  findDelayMs?: number
  newJob?: NewJobInit
  /** toast seconds: 0 keeps it up (the stories); the prototype closes it after 10 */
  toastSeconds?: number
}

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`

export function useScheduleProto(init: ProtoInitial = {}) {
  const [state, dispatch] = useReducer(reduce, undefined, () => initialState(init.state))
  const [view, setView] = useState<View>(init.view ?? "week")
  const [day, setDay] = useState(init.day ?? TODAY)
  const [panels, setPanels] = useState({ unscheduled: init.panels?.unscheduled ?? false, map: init.panels?.map ?? false })
  const [tab, setTab] = useState<{ tab: "unscheduled" | "not-told"; key: number }>({ tab: init.tab ?? "unscheduled", key: 0 })
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | undefined>(init.selectedId)
  const [dialog, setDialog] = useState<Dialog | null>(init.dialog ?? null)
  const wide = useMedia("(min-width: 1280px)")

  const people = PEOPLE
  const newJob = useNewJobProto({ state, people, today: TODAY, findDelayMs: init.findDelayMs, init: init.newJob })
  const jev = useJevProto({ visits: state.visits, dispatch, delayMs: init.jevDelayMs, init: init.jev })
  const keys = useCalendarKeys({ onView: setView, onToday: () => setDay(TODAY), onNext: () => setDay((d) => shift(view, d, 1)), onPrev: () => setDay((d) => shift(view, d, -1)) })

  // a place that breaks a rule asks first; one that breaks none goes through
  const commit = useCallback((action: Action, place: { id: string; day: string; personId: string; start: number | null; minutes: number }) => {
    const problems = placementProblems(state, people, place)
    if (problems.length) setDialog({ kind: "confirm", action, problems })
    else dispatch(action)
  }, [state, people])

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
  const onAction = (id: string, a: BlockAction) => { if (a === "move") setDialog({ kind: "move", id }) }

  const timeOffValue = (o: Partial<TimeOffValue> = {}): TimeOffValue => ({ personId: people[0]!.id, allDay: false, from: day, to: day, startTime: "14:00", endTime: "16:00", note: "", ...o })
  const openTimeOff = (o?: Partial<TimeOffValue>) => setDialog({ kind: "time-off", mode: "add", value: timeOffValue(o) })
  const onTimeOffDrag = (s: TimeOffDragEvent) => openTimeOff({ personId: s.personId, from: s.day, to: s.day, startTime: hhmm(s.start), endTime: hhmm(s.end) })
  const onTimeOffClick = (id: string) => {
    const o = state.timeOff.find((x) => x.id === id)
    if (o) setDialog({ kind: "time-off", mode: "edit", id, value: timeOffValue({ personId: o.personId, from: o.day, to: o.day, allDay: o.start === null, startTime: o.start === null ? "09:00" : hhmm(o.start), endTime: o.end === null ? "17:00" : hhmm(o.end) }) })
  }
  const saveTimeOff = (v: TimeOffValue, id?: string) => {
    if (id) dispatch({ type: "time-off-remove", id })
    const days: string[] = []
    for (let d = v.from; d <= v.to && days.length < 31; d = addDays(d, 1)) days.push(d)
    days.forEach((d, i): void => {
      const row: TimeOff = { id: id && i === 0 ? id : `off-${state.timeOff.length + 1}-${d}`, personId: v.personId, day: d, start: v.allDay ? null : clockToMinutes(v.startTime), end: v.allDay ? null : clockToMinutes(v.endTime) }
      dispatch({ type: "time-off-save", value: row })
    })
  }
  /** visits inside a time off as it stands, for the dialog's "N visits are inside this time" */
  const visitsInside = (v: TimeOffValue) => state.visits.filter((b) => b.personId === v.personId && b.day >= v.from && b.day <= v.to && b.start !== null && (v.allDay || (b.start < (clockToMinutes(v.endTime) ?? 0) && (clockToMinutes(v.startTime) ?? 0) < b.start + b.minutes))).map((b) => ({ id: b.id, label: `${b.name}, ${b.town}` }))

  const setPanel = (k: "unscheduled" | "map", open: boolean) => setPanels((p) => (wide ? { ...p, [k]: open } : { unscheduled: k === "unscheduled" && open, map: k === "map" && open }))
  const togglePanel = (k: "unscheduled" | "map") => setPanel(k, !panels[k])
  const openNotTold = () => { setPanels((p) => (wide ? { ...p, unscheduled: true } : { unscheduled: true, map: false })); setTab((t) => ({ tab: "not-told", key: t.key + 1 })) }
  const openDay = (d: string) => { setDay(d); setView("day") }

  const notify = (ids: string[]) => setDialog({ kind: "notify", ids })
  const told = (ids: string[]) => dispatch({ type: "told", ids })

  /** picking a Find a time row shows its week and, on a wide screen, the map with its pin */
  const pickRow = (id: string) => {
    newJob.set({ pickId: id, ticked: false })
    const row = [...newJob.found.openings, ...newJob.found.forced].find((r) => r.id === id)
    if (row) { setDay(row.day); setView((v) => (v === "month" || v === "list" ? "week" : v)) }
    if (wide) setPanels((p) => ({ ...p, map: true }))
  }

  return {
    state, dispatch, people, wide, view, setView, day, setDay, panels, setPanel, togglePanel, tab, openNotTold, hoverId, setHoverId, selectedId, setSelectedId, dialog, setDialog,
    newJob, jev, keys, openDay, notify, told, openTimeOff, saveTimeOff, visitsInside, pickRow, now: NOW, today: TODAY, toastSeconds: init.toastSeconds ?? 10,
    commit, move, onMove, onResize, onDropExternal, onAction, onTimeOffDrag, onTimeOffClick,
    notToldCount: useMemo(() => state.visits.filter((b) => b.notTold).length, [state.visits]),
  }
}

export type Proto = ReturnType<typeof useScheduleProto>
export type { ProtoState }
