import { instantOf } from "./shape"

/** What the Last visit column reads of a visit. */
interface LastVisitFacts {
  clientId: string
  status: string
  scheduledOn?: string
  completedOn?: string
}

/**
 * Each client's last visit: the day their newest done visit was done (a visit marked done before its scheduled day counts on the day it was done), as an
 * instant at midday Mountain. A done visit with no done-on day counts on its scheduled day. Never a day after `today`: a day still ahead is not a visit that has happened.
 */
export function lastVisitAt(visits: readonly LastVisitFacts[], today: string): Map<string, string> {
  const newest = new Map<string, string>()
  for (const v of visits) {
    if (v.status !== "completed") continue
    const day = v.completedOn ?? v.scheduledOn
    if (!day || day > today || day <= (newest.get(v.clientId) ?? "")) continue
    newest.set(v.clientId, day)
  }
  return new Map([...newest].map(([id, day]) => [id, instantOf(day, "12:00")]))
}
