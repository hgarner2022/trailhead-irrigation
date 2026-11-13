/**
 * The scheduler, pure. Every "to schedule" visit whose window opens within its lead weeks is placed on a truck-day:
 * sorted by window, then the customer's preference, then the season's town order; walked day by day and truck by truck,
 * each truck-day taking the next area that still has visits left (or the area it already works), under the truck's capacity
 * minus what is taken and what the Jobber calendar blocks. A visit whose customer must be home is never placed here; it
 * waits for the customer's pick. The same inputs give the same answer.
 */
import { addDays, areaIdOf, areaOrder, blockedMinutes, capacityAfterBlocks, capacityFor, isInWindow, weekdayOf } from "./calendar"
import { capacityKindOf } from "./slots"
import { TIME_ZONE, defaultMinutes, seasonOfKind, type BusyBlock, type Placement, type Preference, type SchedArea, type SchedSettings, type SchedTruck, type SchedVisit, type Taken, type Unplaced } from "./types"

export interface ScheduleInput {
  visits: SchedVisit[]
  trucks: SchedTruck[]
  areas: SchedArea[]
  settings: SchedSettings
  /** the day the run happens: nothing lands before it */
  from: string
  taken: Taken[]
  blocks: BusyBlock[]
}

export interface ScheduleResult {
  placed: Placement[]
  unplaced: Unplaced[]
  /** customers who must be home: left for their own pick */
  waiting: string[]
  /** windows that open beyond the lead time, or days beyond what the run may commit: the next run takes them */
  deferred: string[]
}

const RANK: Record<Preference, number> = { earlier: 0, recommended: 1, later: 2 }
const rank = (p?: Preference | null) => RANK[p ?? "recommended"]

/** The third of a window a preference names: Early, Mid or Late (the checkout's words). */
export function preferredRange(window: { opensOn: string; closesOn: string }, preference?: Preference | null): { from: string; to: string } {
  const opens = window.opensOn.slice(0, 10)
  const closes = window.closesOn.slice(0, 10)
  const length = Math.round((Date.parse(closes) - Date.parse(opens)) / 86_400_000) + 1
  const third = Math.max(1, Math.ceil(length / 3))
  const p = preference ?? "recommended"
  if (p === "earlier") return { from: opens, to: addDays(opens, third - 1) }
  if (p === "later") return { from: addDays(closes, -(third - 1)), to: closes }
  return { from: addDays(opens, third), to: addDays(opens, 2 * third - 1) }
}

export function scheduleVisits(input: ScheduleInput): ScheduleResult {
  const { trucks, areas, settings, from, blocks } = input
  const placed: Placement[] = []
  const unplaced: Unplaced[] = []
  const waiting: string[] = []
  const deferred: string[] = []

  interface Candidate { visit: SchedVisit; window: { opensOn: string; closesOn: string }; horizon: string; minutes: number; range: { from: string; to: string }; done: boolean }
  const candidates: Candidate[] = []
  for (const visit of input.visits) {
    const window = settings.windows.find((w) => w.kind === visit.kind)
    if (!window) continue
    const opens = window.opensOn.slice(0, 10)
    const horizon = addDays(from, window.leadWeeks * 7)
    if (window.closesOn.slice(0, 10) < from) continue
    if (visit.needsCustomerHome) { waiting.push(visit.id); continue }
    if (opens > horizon) { deferred.push(visit.id); continue }
    const range = preferredRange(window, visit.preference)
    // A customer's preferred third that the lead time cannot reach yet is the next run's, not a reason to place them early.
    if (range.from > horizon) { deferred.push(visit.id); continue }
    candidates.push({ visit, window, horizon, minutes: visit.durationMinutes ?? defaultMinutes(visit.kind), range, done: false })
  }
  const orderIndex = new Map<string, Map<string, number>>()
  for (const season of ["spring", "fall"] as const) orderIndex.set(season, new Map(areaOrder(areas, season).map((a, i) => [a.id, i])))
  const areaRank = (c: Candidate) => orderIndex.get(seasonOfKind(c.visit.kind))!.get(areaIdOf(areas, c.visit.town)) ?? 99
  candidates.sort((a, b) => a.window.opensOn.localeCompare(b.window.opensOn) || rank(a.visit.preference) - rank(b.visit.preference) || areaRank(a) - areaRank(b) || a.visit.id.localeCompare(b.visit.id))

  const load = new Map<string, { areaId?: string; visits: Record<string, number>; minutes: number }>()
  const key = (truckId: string, day: string) => `${truckId}|${day}`
  const dayLoad = (truckId: string, day: string) => {
    let l = load.get(key(truckId, day))
    if (!l) {
      l = { visits: {}, minutes: 0 }
      for (const t of input.taken.filter((x) => x.truckId === truckId && x.day === day)) {
        l.areaId ??= areaIdOf(areas, t.town)
        const k = capacityKindOf(t.kind)
        l.visits[k] = (l.visits[k] ?? 0) + 1
        l.minutes += t.minutes
      }
      load.set(key(truckId, day), l)
    }
    return l
  }
  const fits = (truck: SchedTruck, day: string, c: Candidate) => {
    const l = dayLoad(truck.id, day)
    const kind = capacityKindOf(c.visit.kind)
    const blocked = blockedMinutes(blocks, truck.id, day, TIME_ZONE)
    const cap = capacityFor(truck, kind, day, settings, c.window.opensOn)
    return (l.visits[kind] ?? 0) < capacityAfterBlocks(cap.visits, blocked) && l.minutes + c.minutes <= cap.minutes - blocked
  }

  const sortedTrucks = [...trucks].filter((t) => t.active !== false).sort((a, b) => a.id.localeCompare(b.id))
  const reach = candidates.reduce((max, c) => { const end = [c.window.closesOn.slice(0, 10), c.horizon].sort()[0]!; return end > max ? end : max }, from)

  /** One walk over the days; `wide` lets every visit use its whole window, otherwise only its preferred third. */
  const walk = (wide: boolean) => {
    for (let day = from; day <= reach; day = addDays(day, 1)) {
      for (const truck of sortedTrucks) {
        if (!truck.workingDays.includes(weekdayOf(day))) continue
        const eligible = (c: Candidate) => !c.done && isInWindow(c.window, day) && day <= c.horizon && (wide || (day >= c.range.from && day <= c.range.to))
        const l = dayLoad(truck.id, day)
        let areaId = l.areaId
        if (!areaId) {
          // The next area, in the season's order, that still has a visit this truck could take today.
          const open = candidates.filter((c) => eligible(c) && fits(truck, day, c))
          const best = open.sort((a, b) => areaRank(a) - areaRank(b) || candidates.indexOf(a) - candidates.indexOf(b))[0]
          if (!best) continue
          areaId = areaIdOf(areas, best.visit.town)
        }
        for (const c of candidates) {
          if (!eligible(c) || areaIdOf(areas, c.visit.town) !== areaId || !fits(truck, day, c)) continue
          l.areaId = areaId
          const kind = capacityKindOf(c.visit.kind)
          l.visits[kind] = (l.visits[kind] ?? 0) + 1
          l.minutes += c.minutes
          c.done = true
          placed.push({ visitId: c.visit.id, truckId: truck.id, day, durationMinutes: c.minutes })
        }
      }
    }
  }
  walk(false)
  walk(true)

  for (const c of candidates) {
    if (c.done) continue
    // Left over: beyond what this run may commit it is the next run's, inside it nothing had room.
    if (c.window.closesOn.slice(0, 10) > c.horizon) deferred.push(c.visit.id)
    else unplaced.push({ visitId: c.visit.id, reason: `No ${c.visit.kind} truck-day has room before ${c.window.closesOn.slice(0, 10)}` })
  }
  placed.sort((a, b) => a.day.localeCompare(b.day) || a.truckId.localeCompare(b.truckId) || a.visitId.localeCompare(b.visitId))
  return { placed, unplaced, waiting, deferred }
}
