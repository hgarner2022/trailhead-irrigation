/**
 * Address search for the checkout and the booking form. A `PlaceProvider`
 * turns what the customer has typed into a short list of real addresses (the
 * fixture provider in stories and the prototype; Google Places behind a
 * server route once wired) and `serviceability` says whether a picked
 * address is in one of the six towns. No key lives here: client-safe.
 */
import type { Town } from "@/lib/admin/types"

export interface PlaceSuggestion {
  /** the provider's id (a Google place id once wired) */
  id: string
  /** the whole address on one line, as the box shows it once picked */
  label: string
  line1: string
  town: string
  /** two letters */
  state: string
  zip: string
}

export type PlaceProvider = (query: string, signal?: AbortSignal) => Promise<PlaceSuggestion[]>

/** Fewer characters than this and the provider is not asked. */
export const MIN_QUERY = 3

export const SERVICE_TOWNS: readonly Town[] = ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"]

/**
 * USPS zip codes of the six towns, the second check behind the town name: a
 * county address with an Erie mailing address carries the Erie zip. Ryan
 * confirms this list before the checkout goes live (wiring plan, Phase 8).
 */
export const SERVICE_ZIPS: Readonly<Record<string, Town>> = {
  "80516": "Erie",
  "80501": "Longmont",
  "80503": "Longmont",
  "80504": "Longmont",
  "80027": "Louisville",
  "80026": "Lafayette",
  "80520": "Firestone",
  "80020": "Broomfield",
  "80021": "Broomfield",
  "80023": "Broomfield",
}

export type Serviceability = { ok: true; town: Town } | { ok: false; place: string }

/** Whether Trailhead serves the address: by its town name in Colorado first, then by its zip. */
export function serviceability(place: Pick<PlaceSuggestion, "town" | "state" | "zip">): Serviceability {
  const town = SERVICE_TOWNS.find((t) => t.toLowerCase() === place.town.trim().toLowerCase())
  if (town && place.state === "CO") return { ok: true, town }
  const byZip = SERVICE_ZIPS[place.zip]
  if (byZip) return { ok: true, town: byZip }
  const outside = place.state && place.state !== "CO" ? `${place.town}, ${place.state}` : place.town
  return { ok: false, place: outside || "that address" }
}

export const SERVICE_AREA_SENTENCE = "We work in Erie, Longmont, Louisville, Lafayette, Firestone and Broomfield."

/** The line under the box when the picked address is outside the six towns. */
export function outOfAreaMessage(s: Extract<Serviceability, { ok: false }>): string {
  return `We don't serve ${s.place} yet. ${SERVICE_AREA_SENTENCE}`
}
