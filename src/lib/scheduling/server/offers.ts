import "server-only"
import { and, asc, eq, gte, lte, notInArray } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { routePeople } from "@/api/v1/people/handlers"
import { loadBlocks } from "@/lib/jobber-feed"
import type { Town } from "@/lib/admin/types"
import { addDays } from "../calendar"
import { offerFor, openDaysFor, type BlockedSpan, type BookedVisit, type Offer, type OfferInputs, type OfferPerson, type Open } from "../offer"
import { defaultMinutes, TIME_ZONE } from "../types"

/** What a booking asks the rule: the kind and town, where the customer is, and the visit (if any) that must not count against itself. */
export interface OfferRequest {
  organizationId: string
  kind: string
  town: Town
  point?: { lat: number; lng: number } | null
  /** zones, to pick the service band whose length and dates apply */
  zones?: number
  /** a service by key, over the kind and zones */
  serviceKey?: string
  /** the visit being moved or placed: its own booking leaves the day, and its property and length are the defaults */
  visitId?: string
  /** a pass for a later season starts on January 1 of it */
  season?: number
  today: string
  /** days never offered (the visit's present day) */
  excludeDays?: string[]
  count?: number
  page?: number
}

const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`

/** The Mountain day and minute of an instant. */
function mountainParts(iso: string): { day: string; minute: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(iso))
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]))
  return { day: `${p.year}-${p.month}-${p.day}`, minute: Number(p.hour) * 60 + Number(p.minute) }
}

/** A Jobber calendar block as the busy spans of each Mountain day it touches. */
export function spansOfBlock(b: { personId: string; startAt: string; endAt: string }): BlockedSpan[] {
  const a = mountainParts(b.startAt)
  const z = mountainParts(b.endAt)
  const out: BlockedSpan[] = []
  for (let day = a.day; day <= z.day; day = addDays(day, 1)) {
    const from = day === a.day ? a.minute : 0
    const to = day === z.day ? z.minute : 24 * 60
    if (to > from) out.push({ personId: b.personId, day, start: clock(from), end: clock(to) })
  }
  return out
}

/** The service whose length and dates apply: the key asked for, else the active one of the kind whose zone band holds `zones`, bookable ones first. */
export async function serviceForOffer(db: Database, organizationId: string, req: Pick<OfferRequest, "kind" | "zones" | "serviceKey">) {
  const rows = await db.select().from(s.service).where(and(eq(s.service.organizationId, organizationId), eq(s.service.active, true))).orderBy(asc(s.service.key))
  if (req.serviceKey) return rows.find((r) => r.key === req.serviceKey)
  const ofKind = rows.filter((r) => r.kind === req.kind).sort((a, b) => Number(b.bookable) - Number(a.bookable) || a.slotMinutes - b.slotMinutes)
  const banded = req.zones === undefined ? undefined : ofKind.find((r) => (!r.minZones || req.zones! >= r.minZones) && (!r.maxZones || req.zones! <= r.maxZones))
  return banded ?? ofKind[0]
}

/** The rule's inputs, read from the database: people and their hours and caps, every booked visit with its place and length, busy time, the service's dates. */
export async function loadOfferInputs(db: Database, req: OfferRequest): Promise<OfferInputs> {
  const org = req.organizationId
  const own = req.visitId
    ? (await db.select({ minutes: s.visit.durationMinutes, lat: s.property.lat, lng: s.property.lng, zones: s.property.zones }).from(s.visit).innerJoin(s.property, eq(s.property.id, s.visit.propertyId)).where(and(eq(s.visit.id, req.visitId), eq(s.visit.organizationId, org))))[0]
    : undefined
  // The visit's own yard picks the service band (its length and dates); without zones the smallest band answers.
  const service = await serviceForOffer(db, org, { ...req, zones: req.zones ?? own?.zones ?? undefined })
  const point = req.point ?? (own && own.lat !== null && own.lng !== null ? { lat: own.lat, lng: own.lng } : null)
  const minutes = own?.minutes ?? service?.slotMinutes ?? defaultMinutes(req.kind)
  // A pass for a later season starts on January 1 of it, so the next run of the service's dates is that season's.
  const seasonStart = req.season ? addDays(`${req.season}-01-01`, -1) : req.today
  const today = seasonStart > req.today ? seasonStart : req.today
  const first = addDays(today, 1)
  const last = addDays(first, 400)

  const people = await routePeople({ db, organizationId: org })
  const rows = await db
    .select({ id: s.visit.id, personId: s.visit.personId, day: s.visit.scheduledOn, start: s.visit.startTime, minutes: s.visit.durationMinutes, kind: s.visit.kind, town: s.property.town, lat: s.property.lat, lng: s.property.lng })
    .from(s.visit)
    .innerJoin(s.property, eq(s.property.id, s.visit.propertyId))
    .where(and(eq(s.visit.organizationId, org), gte(s.visit.scheduledOn, first), lte(s.visit.scheduledOn, last), notInArray(s.visit.status, ["cancelled", "skipped"])))
  const booked: BookedVisit[] = rows
    .filter((r) => r.personId && r.day && r.id !== req.visitId)
    .map((r) => ({ personId: r.personId!, day: r.day!, start: r.start, minutes: r.minutes ?? defaultMinutes(r.kind), kind: r.kind, town: r.town, point: r.lat !== null && r.lng !== null ? { lat: r.lat, lng: r.lng } : null }))
  const blocks = await loadBlocks(db, org, new Date(`${addDays(first, -1)}T00:00:00Z`), new Date(`${addDays(last, 2)}T00:00:00Z`))

  const offerPeople: OfferPerson[] = people.map((p) => ({ id: p.id, workingDays: p.workingDays, hoursStart: p.hoursStart, hoursEnd: p.hoursEnd, capsByKind: p.capacityByKind, active: p.active }))
  return {
    today,
    service: { minutes, kind: req.kind, bookableFrom: service?.bookableFrom ?? null, bookableTo: service?.bookableTo ?? null },
    property: { town: req.town, point },
    people: offerPeople,
    booked,
    blocked: blocks.flatMap(spansOfBlock),
    count: req.count,
    page: req.page,
    excludeDays: req.excludeDays,
  }
}

/** An offer's slots with the person's name, the shape the handlers answer. */
export async function namedOffers(db: Database, organizationId: string, offers: Offer[]) {
  const names = new Map((await routePeople({ db, organizationId })).map((p) => [p.id, p.name]))
  return offers.map((o) => ({ ...o, slots: o.slots.map((x) => ({ ...x, personName: names.get(x.personId) ?? "" })) }))
}

/** The offers for one booking, from the database. */
export async function loadOffers(db: Database, req: OfferRequest): Promise<Offer[]> {
  return offerFor(await loadOfferInputs(db, req))
}

/** Every open day (up to `need`, default 60) for the same request, before ranking: what a check of "is this day on offer" and the old `Slot` lists read. */
export async function loadOpenDays(db: Database, req: OfferRequest, need = 60): Promise<{ inputs: OfferInputs; open: Open[] }> {
  const inputs = await loadOfferInputs(db, req)
  return { inputs, open: openDaysFor(inputs, need) }
}
