import "server-only"
import { readGeocodeContact } from "@/lib/env"

export interface Point { lat: number; lng: number }

const MIN_GAP_MS = 1000
let lastCallAt = 0

/** Nominatim's policy is one request a second; this holds a lookup back until a second has passed since the last one in this process. */
async function throttle(sleep: (ms: number) => Promise<void>, clock: () => number) {
  const wait = lastCallAt + MIN_GAP_MS - clock()
  if (wait > 0) await sleep(wait)
  lastCallAt = clock()
}

export const resetThrottle = () => { lastCallAt = 0 }

export interface NominatimDeps { fetch?: typeof fetch; sleep?: (ms: number) => Promise<void>; clock?: () => number }

/** One search for an address; `null` when Nominatim has no match, a throw when it fails (so the queue retries). */
export async function searchAddress(query: string, deps: NominatimDeps = {}): Promise<Point | null> {
  const contact = readGeocodeContact()
  await throttle(deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))), deps.clock ?? Date.now)
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ format: "jsonv2", q: query, limit: "1" })}`
  const res = await (deps.fetch ?? fetch)(url, { headers: { "user-agent": `trailheadirrigation.com (${contact})`, accept: "application/json" }, signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`Nominatim answered ${res.status}`)
  const rows = (await res.json()) as { lat?: string; lon?: string }[]
  const first = rows[0]
  if (!first?.lat || !first.lon) return null
  const lat = Number(first.lat)
  const lng = Number(first.lon)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}
