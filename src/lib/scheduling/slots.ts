/**
 * Open truck-days on a 30-minute grid, pure. The booking form reads it for its times and the pass page for its days; the
 * scheduler walks the same capacity rules. A truck-day is open when the truck works the weekday, holds no visit from another
 * area group, has room in visits and in minutes for the service after the buffer, the taken visits and the busy time on its
 * Jobber calendar, and the visit fits between 7:00 and 17:00 Mountain clear of every block.
 */
import { WORKDAY } from "@/lib/admin/calendar"
import { areaIdOf, blocksOn, blockedMinutes, capacityAfterBlocks, capacityFor, isInWindow, addDays, weekdayOf } from "./calendar"
import { TIME_ZONE, type BusyBlock, type CapacityKind, type SchedArea, type SchedSettings, type SchedTruck, type Taken, type Town } from "./types"

export const GRID_MINUTES = 30
const DAY_START = WORKDAY.startHour * 60
const DAY_END = WORKDAY.endHour * 60

export interface OpenSlot {
  day: string
  /** "HH:MM", Mountain, on the grid */
  start: string
  truckId: string
  /** the truck already works this area group that day */
  areaDay: boolean
}

export interface OpenSlotsInput {
  service: { kind: string; slotMinutes: number }
  town: Town
  trucks: SchedTruck[]
  areas: SchedArea[]
  settings: SchedSettings
  /** the floor: the earliest day offered (a booking is tomorrow or later) */
  from: string
  to: string
  taken: Taken[]
  blocks: BusyBlock[]
  /** keep to this window (a pass visit); omitted for a booked service */
  window?: { opensOn: string; closesOn: string }
}

export const capacityKindOf = (kind: string): CapacityKind => (kind === "turn-on" || kind === "inspection" || kind === "blowout" || kind === "repair" ? kind : "other")

const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`

/** Minutes after midnight, Mountain, of an instant on `day`. */
function minuteOf(iso: string): { day: string; minute: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(iso))
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]))
  return { day: `${p.year}-${p.month}-${p.day}`, minute: Number(p.hour) * 60 + Number(p.minute) }
}

/** The busy spans of a truck's day as minutes after midnight, clipped to the working day. */
export function busySpans(blocks: BusyBlock[], truckId: string, day: string): [number, number][] {
  return blocksOn(blocks, truckId, day, TIME_ZONE).map((b) => {
    const a = minuteOf(b.startAt)
    const z = minuteOf(b.endAt)
    return [a.day < day ? DAY_START : Math.max(DAY_START, a.minute), z.day > day ? DAY_END : Math.min(DAY_END, z.minute)] as [number, number]
  })
}

export function openSlots(input: OpenSlotsInput): OpenSlot[] {
  const { service, town, trucks, areas, settings, taken, blocks } = input
  const kind = capacityKindOf(service.kind)
  const mine = areaIdOf(areas, town)
  const windowStart = settings.windows.find((w) => w.kind === service.kind)?.opensOn
  const slots: OpenSlot[] = []
  const first = input.window ? [input.from, input.window.opensOn.slice(0, 10)].sort().at(-1)! : input.from
  const last = input.window ? [input.to, input.window.closesOn.slice(0, 10)].sort()[0]! : input.to
  for (let day = first; day <= last; day = addDays(day, 1)) {
    if (input.window && !isInWindow(input.window, day)) continue
    for (const truck of [...trucks].sort((a, b) => a.id.localeCompare(b.id))) {
      if (truck.active === false || !truck.workingDays.includes(weekdayOf(day))) continue
      const here = taken.filter((t) => t.truckId === truck.id && t.day === day)
      if (here.some((t) => areaIdOf(areas, t.town) !== mine)) continue
      const blocked = blockedMinutes(blocks, truck.id, day, TIME_ZONE)
      const cap = capacityFor(truck, kind, day, settings, windowStart)
      const visitsLeft = capacityAfterBlocks(cap.visits, blocked) - here.filter((t) => capacityKindOf(t.kind) === kind).length
      const minutesLeft = cap.minutes - blocked - here.reduce((sum, t) => sum + t.minutes, 0)
      if (visitsLeft < 1 || minutesLeft < service.slotMinutes) continue
      const spans = busySpans(blocks, truck.id, day)
      // Visits already on the day stack from the open of day; offer starts after them, clear of blocks, ending by 17:00.
      const used = Math.ceil(here.reduce((sum, t) => sum + t.minutes, 0) / GRID_MINUTES) * GRID_MINUTES
      for (let start = DAY_START + used; start + service.slotMinutes <= DAY_END; start += GRID_MINUTES) {
        if (spans.some(([a, z]) => start < z && start + service.slotMinutes > a)) continue
        slots.push({ day, start: clock(start), truckId: truck.id, areaDay: here.length > 0 })
      }
    }
  }
  return slots
}
