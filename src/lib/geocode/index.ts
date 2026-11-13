import "server-only"
import { and, desc, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { TOWN_CENTRES } from "@/components/blocks/day-map-helpers"
import type { Town } from "@/lib/admin/types"
import { enqueue } from "@/lib/queue"
import { searchAddress, type NominatimDeps } from "./nominatim"

/** The Nominatim query for a property: street, town, state, country. */
export const addressQuery = (p: { address: string; town: string }) => `${p.address}, ${p.town}, CO, USA`

/**
 * Geocode a property once and keep the answer forever: a property with `geocoded_at` set is never looked up again (a miss is
 * cached too, as a null pair, and the map draws it at the town centre with a hollow pin). Returns the point, or null.
 */
export async function geocodeProperty(db: Database, propertyId: string, deps: NominatimDeps & { now?: Date } = {}) {
  const [p] = await db.select().from(s.property).where(eq(s.property.id, propertyId))
  if (!p) return null
  if (p.geocodedAt) return p.lat !== null && p.lng !== null ? { lat: p.lat, lng: p.lng } : null
  const point = await searchAddress(addressQuery(p), deps)
  await db.update(s.property).set({ lat: point?.lat ?? null, lng: point?.lng ?? null, geocodedAt: deps.now ?? new Date() }).where(eq(s.property.id, propertyId))
  return point
}

/** Queue a geocode, spaced a second after the last queued one so a burst of new properties drains at Nominatim's pace. A property that already has a point is skipped. */
export async function enqueueGeocode(db: Database, organizationId: string, propertyId: string, now = new Date()) {
  const [p] = await db.select({ geocodedAt: s.property.geocodedAt }).from(s.property).where(and(eq(s.property.id, propertyId), eq(s.property.organizationId, organizationId)))
  if (!p || p.geocodedAt) return false
  const [last] = await db.select({ runAfter: s.queueItem.runAfter }).from(s.queueItem)
    .where(and(eq(s.queueItem.kind, "geocode"), eq(s.queueItem.status, "pending"))).orderBy(desc(s.queueItem.runAfter)).limit(1)
  const runAfter = new Date(Math.max(now.getTime(), last ? last.runAfter.getTime() + 1000 : 0))
  return enqueue(db, organizationId, "geocode", propertyId, { propertyId }, runAfter)
}

/** Where the map draws a visit: its own point, else the town's centre (the map's own `TOWN_CENTRES`). `exact` is false for the fallback. */
export function mapPoint(p: { lat: number | null; lng: number | null; town: Town }) {
  if (p.lat !== null && p.lng !== null) return { lat: p.lat, lng: p.lng, exact: true }
  const [lng, lat] = TOWN_CENTRES[p.town]
  return { lat, lng, exact: false }
}
