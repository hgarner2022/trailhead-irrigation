import "server-only"
import { and, eq, gte, lte, notInArray } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { routePeople } from "@/api/v1/people/handlers"
import { loadBlocks } from "@/lib/jobber-feed"
import { addDays } from "../calendar"
import { defaultMinutes, type BusyBlock, type SchedArea, type SchedSettings, type SchedPerson, type Taken } from "../types"

export interface SchedulerWorld {
  settings: SchedSettings
  /** the people on the schedule: in service with a truck, owner first */
  people: SchedPerson[]
  areas: SchedArea[]
  blocks: BusyBlock[]
}

/** Settings, the people on the schedule, areas and the Jobber calendar's busy blocks between two Mountain days: what the pure scheduler takes. */
export async function loadWorld(db: Database, organizationId: string, from: string, to: string): Promise<SchedulerWorld> {
  const [org] = await db.select({ settings: s.organization.settings }).from(s.organization).where(eq(s.organization.id, organizationId))
  if (!org) throw new Error("Organization not found")
  const [people, areas] = await Promise.all([
    routePeople({ db, organizationId }),
    db.select().from(s.area).where(eq(s.area.organizationId, organizationId)),
  ])
  const blocks = await loadBlocks(db, organizationId, new Date(`${addDays(from, -1)}T00:00:00Z`), new Date(`${addDays(to, 2)}T00:00:00Z`))
  return { settings: org.settings, people: people.map((p) => ({ id: p.id, name: p.name, truck: p.truck, workingDays: p.workingDays, capacityByKind: p.capacityByKind, active: p.active })), areas, blocks }
}

/** Visits already assigned to someone between two days (cancelled and skipped ones excluded), as what each takes from that person's day. `exceptId` leaves one visit out, so a move does not collide with itself. */
export async function loadTaken(db: Database, organizationId: string, from: string, to: string, exceptIds: string[] = []): Promise<Taken[]> {
  const rows = await db
    .select({ id: s.visit.id, personId: s.visit.personId, day: s.visit.scheduledOn, kind: s.visit.kind, minutes: s.visit.durationMinutes, town: s.property.town })
    .from(s.visit)
    .innerJoin(s.property, eq(s.property.id, s.visit.propertyId))
    .where(and(eq(s.visit.organizationId, organizationId), gte(s.visit.scheduledOn, from), lte(s.visit.scheduledOn, to), notInArray(s.visit.status, ["cancelled", "skipped"])))
  return rows
    .filter((r) => r.personId && r.day && !exceptIds.includes(r.id))
    .map((r) => ({ personId: r.personId!, day: r.day!, kind: r.kind, town: r.town, minutes: r.minutes ?? defaultMinutes(r.kind) }))
}
