/**
 * The clock's arithmetic (docs/plans/2026-11-25-scheduler-design.md, 7.1 to 7.5): minutes to pixels, the 15 minute snap,
 * the hours drawn, side-by-side lanes for overlaps, what a block shows at its height, and where a drop lands. Pure; no
 * React, no dates beyond "YYYY-MM-DD" strings and minutes from midnight. A block is made from the app's own `Visit`.
 */
import { defaultMinutes } from "@/lib/scheduling/types"
import { hoursOf } from "@/lib/admin/people"
import type { Person, Town, Visit, VisitKind } from "@/lib/admin/types"

export const HOUR_PX = 64
export const PHONE_HOUR_PX = 88
export const SNAP_MIN = 15
export const MIN_BLOCK_MIN = 15
export const DEFAULT_RANGE: { start: number; end: number } = { start: 8, end: 17 }

export const minutesToPx = (min: number, hourPx = HOUR_PX) => (min * hourPx) / 60
export const pxToMinutes = (px: number, hourPx = HOUR_PX) => (px * 60) / hourPx
export const snap = (min: number, step = SNAP_MIN) => Math.round(min / step) * step
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** "09:30" to 570; null for anything else. */
export function clockToMinutes(hhmm: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? "")
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/** 570 to "9:30 am"; 720 is "12:00 pm". `bare` leaves the am or pm off. */
export function clockWords(min: number, bare = false): string {
  const h = Math.floor(min / 60) % 24
  const m = String(min % 60).padStart(2, "0")
  return `${h % 12 || 12}:${m}${bare ? "" : h < 12 ? " am" : " pm"}`
}

/** "9:15 to 10:30 am"; both ends carry their word only when they differ ("11:30 am to 1:00 pm"). */
export function rangeWords(start: number, minutes: number): string {
  const end = start + minutes
  const same = Math.floor(start / 720) === Math.floor(end / 720)
  return `${clockWords(start, same)} to ${clockWords(end)}`
}

/** An hour as a gutter label: 9 is "9 am", 12 is "12 pm". */
export const hourWords = (h: number) => `${h % 12 || 12} ${h < 12 ? "am" : "pm"}`

export interface HourRange { start: number; end: number }
/** Whole hours: the earliest start to the latest end of the people shown, at least 8 to 17, widened for any block outside it. */
export function visibleRange(people: readonly Pick<Person, "hoursStart" | "hoursEnd">[], blocks: readonly { start: number | null; minutes: number }[] = []): HourRange {
  let start = DEFAULT_RANGE.start
  let end = DEFAULT_RANGE.end
  for (const p of people) {
    const h = hoursOf(p)
    start = Math.min(start, Math.floor((clockToMinutes(h.start) ?? 540) / 60))
    end = Math.max(end, Math.ceil((clockToMinutes(h.end) ?? 1020) / 60))
  }
  for (const b of blocks) if (b.start !== null) {
    start = Math.min(start, Math.floor(b.start / 60))
    end = Math.max(end, Math.ceil((b.start + b.minutes) / 60))
  }
  return { start, end: Math.min(24, end) }
}

export interface GridBlock {
  id: string
  day: string
  personId: string
  /** minutes from midnight; null is Any time */
  start: number | null
  minutes: number
  /** the street, the block's title */
  title: string
  /** the customer's first name */
  name: string
  kind: VisitKind
  town: Town
  /** the service in words: "Spring turn-on" */
  service: string
  done?: boolean
  waiting?: boolean
  /** an Any time stop's place in the day's order: it follows this timed stop (null: it comes first). Absent: it is driven last. Order the day sets it; a time is never given */
  afterId?: string | null
  /** the order among the Any time stops that follow the same stop */
  order?: number
  /** a reason the place is a problem, said in words; also found by `conflictsIn` */
  conflict?: string
  /** a proposal: dotted edge, with the old place it comes from */
  planned?: { day: string; personId: string; start: number | null }
}

const SERVICE: Record<VisitKind, string> = { "turn-on": "Spring turn-on", inspection: "Mid-season inspection", blowout: "Fall blowout", repair: "Repair", install: "Installation", other: "Visit" }

/** A block from a visit that has a day and a person; null otherwise. The street is the caller's (a visit does not carry it). */
export function blockOf(v: Visit, extra: { title: string } & Partial<Pick<GridBlock, "conflict" | "planned">>): GridBlock | null {
  if (!v.scheduledOn || !v.personId || v.status === "cancelled") return null
  return {
    id: v.id, day: v.scheduledOn, personId: v.personId, start: clockToMinutes(v.startTime), minutes: v.minutes ?? defaultMinutes(v.kind),
    name: v.clientName.split(" ")[0] ?? v.clientName, kind: v.kind, town: v.town, service: SERVICE[v.kind], done: v.status === "completed",
    waiting: v.waiting, ...extra,
  }
}

export interface TimeOff {
  id: string
  personId: string
  day: string
  /** minutes from midnight; both null is the whole day */
  start: number | null
  end: number | null
}
export const timeOffLabel = (o: TimeOff, who: string): string => `${who} off ${o.start === null || o.end === null ? "all day" : hoursSpan(o.start, o.end)}`
/** "12 to 2 pm", "9:30 am to 12 pm". */
export function hoursSpan(start: number, end: number): string {
  const f = (m: number, bare: boolean) => (m % 60 === 0 ? `${Math.floor(m / 60) % 12 || 12}${bare ? "" : Math.floor(m / 60) % 24 < 12 ? " am" : " pm"}` : clockWords(m, bare))
  const same = Math.floor(start / 720) === Math.floor(end / 720)
  return `${f(start, same)} to ${f(end, false)}`
}

export type Detail = "line" | "two" | "full"
/** What a block shows at its length: 30 minutes is one line, 45 adds the time line, 60 and up adds service and town. */
export const detailFor = (minutes: number): Detail => (minutes < 40 ? "line" : minutes < 60 ? "two" : "full")

export interface Placed { block: GridBlock; top: number; height: number; lane: number; lanes: number }

/** Timed blocks of ONE person on ONE day, packed side by side where they overlap; top is in px from the range start. */
export function packLanes(blocks: readonly GridBlock[], range: HourRange, hourPx = HOUR_PX): Placed[] {
  const timed = blocks.filter((b): b is GridBlock & { start: number } => b.start !== null).sort((a, b) => a.start - b.start || b.minutes - a.minutes)
  const out: Placed[] = []
  let cluster: Placed[] = []
  let clusterEnd = -1
  const flush = () => { const n = Math.max(1, ...cluster.map((p) => p.lane + 1)); for (const p of cluster) p.lanes = n; out.push(...cluster); cluster = [] }
  for (const b of timed) {
    if (b.start >= clusterEnd) { flush(); clusterEnd = -1 }
    const taken = new Set(cluster.filter((p) => p.block.start! + p.block.minutes > b.start).map((p) => p.lane))
    let lane = 0
    while (taken.has(lane)) lane++
    cluster.push({ block: b, lane, lanes: 1, top: minutesToPx(b.start - range.start * 60, hourPx), height: Math.max(minutesToPx(b.minutes, hourPx), minutesToPx(MIN_BLOCK_MIN, hourPx)) })
    clusterEnd = Math.max(clusterEnd, b.start + b.minutes)
  }
  flush()
  return out
}

export interface Target { day: string; personId: string; start: number | null }
export interface MoveResult extends Target { minutes: number; label: string }

/** Where a block lands on a drop: the start snapped to 15 minutes and kept inside the drawn hours; null keeps it Any time. */
export function moveResult(block: Pick<GridBlock, "minutes" | "start">, target: Target, range: HourRange): MoveResult {
  const lo = range.start * 60
  const hi = range.end * 60 - block.minutes
  const start = target.start === null ? null : clamp(snap(target.start), lo, Math.max(lo, hi))
  return { ...target, start, minutes: block.minutes, label: start === null ? "Any time" : rangeWords(start, block.minutes) }
}

/** The minute under a pointer: `y` is px from the column's top edge. */
export const minuteAt = (y: number, range: HourRange, hourPx = HOUR_PX) => range.start * 60 + pxToMinutes(y, hourPx)

/** A new length from dragging the bottom edge by `deltaPx`, snapped, at least 15 minutes, ending inside the drawn hours. */
export function resizeResult(block: Pick<GridBlock, "minutes" | "start">, deltaPx: number, range: HourRange, hourPx = HOUR_PX): number {
  const room = block.start === null ? 8 * 60 : range.end * 60 - block.start
  return clamp(snap(block.minutes + pxToMinutes(deltaPx, hourPx)), MIN_BLOCK_MIN, Math.max(MIN_BLOCK_MIN, room))
}

const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1

/** The words for what a place breaks, or null. `names` turns a person id into a first name. */
export function conflictFor(c: { id: string; day: string; personId: string; start: number | null; minutes: number }, blocks: readonly GridBlock[], off: readonly TimeOff[], names: (personId: string) => string): string | null {
  if (c.start === null) return null
  const end = c.start + c.minutes
  const who = names(c.personId)
  const clash = blocks.find((b) => b.id !== c.id && b.day === c.day && b.personId === c.personId && b.start !== null && !b.planned && overlaps(c.start!, end, b.start, b.start + b.minutes))
  if (clash) return `${who} has ${clash.title} at ${clockWords(clash.start!)}.`
  const away = off.find((o) => o.day === c.day && o.personId === c.personId && (o.start === null || o.end === null || overlaps(c.start!, end, o.start, o.end)))
  if (away) return `${who} is off ${away.start === null || away.end === null ? "all day" : hoursSpan(away.start, away.end)}.`
  return null
}

/** Every block that clashes, by id: its own `conflict` wins over what the rules find. */
export function conflictMap(blocks: readonly GridBlock[], off: readonly TimeOff[], names: (personId: string) => string): Map<string, string> {
  const map = new Map<string, string>()
  for (const b of blocks) {
    if (b.planned) continue
    const why = b.conflict ?? conflictFor(b, blocks, off, names)
    if (why) map.set(b.id, why)
  }
  return map
}
