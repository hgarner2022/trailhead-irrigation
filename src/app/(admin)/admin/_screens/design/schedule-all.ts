import { addDays } from "@/lib/admin/calendar"
import { shortDate } from "@/lib/admin/format"
import type { Person } from "@/lib/admin/types"
import { HORIZON_DAYS } from "@/lib/scheduling/offer"
import type { GridBlock } from "@/components/blocks/time-grid-model"
import { offersFor, type Calendar } from "./schedule-engine"
import { visitOfJob, type ProtoJob, type Target } from "./schedule-prototype-model"

// Schedule all N (docs/plans/2026-11-25-scheduler-holistic-audit.md, row 28): where each job with no day would go, oldest first, from the same offer rule as every other time. Each job is placed on
// a copy of the calendar that already holds the ones before it, so two jobs never take the same hour. A job nothing has room for stays on the list with its reason. A job that already has a day is
// never read: only `jobs` (the Unscheduled list) are planned. Pure.

export interface ScheduleAllRow {
  job: ProtoJob
  /** the place the rule gives it; absent when nothing has room */
  to?: Target & { personName: string }
  /** "No open day before Jan 20. Pick a day yourself." */
  problem?: string
}

export function scheduleAllPlan(cal: Calendar, jobs: readonly ProtoJob[], today: string, people: readonly Person[] = cal.people): ScheduleAllRow[] {
  const sorted = [...jobs].sort((a, b) => a.addedOn.localeCompare(b.addedOn) || a.id.localeCompare(b.id))
  let working: Calendar = cal
  return sorted.map((job): ScheduleAllRow => {
    const offers = offersFor(working, { today, town: job.town, point: typeof job.lat === "number" && typeof job.lng === "number" ? { lat: job.lat, lng: job.lng } : null, minutes: job.minutes, kind: job.kind, count: 1 })
    const offer = offers.find((o) => o.best) ?? offers[0]
    const slot = offer?.slots[0]
    if (!offer || !slot) return { job, problem: `No open day before ${shortDate(addDays(today, HORIZON_DAYS))}. Pick a day yourself.` }
    const [h, m] = slot.start.split(":").map(Number) as [number, number]
    const to = { day: offer.day, personId: slot.personId, start: h * 60 + m }
    const block: GridBlock = { ...visitOfJob(job, to) }
    working = { ...working, visits: [...working.visits, block], meta: { ...working.meta, [job.id]: { customer: job.customer, lat: job.lat ?? 0, lng: job.lng ?? 0 } } }
    return { job, to: { ...to, personName: people.find((p) => p.id === slot.personId)?.name ?? slot.personId } }
  })
}
