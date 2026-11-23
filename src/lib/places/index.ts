/**
 * Address search for the checkout and the booking form. A `PlaceProvider`
 * turns what the customer has typed into a short list of real addresses (the
 * fixture provider in stories and tests; `googlePlaces` in google.ts, which
 * asks `/api/places`, on the live site) and `serviceability` says whether a
 * picked address is in one of the six towns. A customer the search cannot
 * find types the address instead (`typedPlace`), and the rest of the checkout
 * cannot tell the two apart. No key lives here: client-safe.
 */
import type { Town } from "@/lib/admin/types"

export interface PlaceSuggestion {
  /** the provider's id: a Google place id, or `typed:` and the address when the customer typed it */
  id: string
  /** the whole address on one line, as the box shows it once picked */
  label: string
  line1: string
  town: string
  /** two letters */
  state: string
  /** empty on a Google suggestion until its details answer, and on a typed address with no zip */
  zip: string
  /** the point Google's details give (WGS84); absent on a typed address and on a suggestion before its details */
  lat?: number
  lng?: number
}

export type PlaceProvider = (query: string, signal?: AbortSignal) => Promise<PlaceSuggestion[]>

/** Fewer characters than this and the provider is not asked. */
export const MIN_QUERY = 3
/** A query this long that finds nothing opens the typed fields on its own. */
export const NO_MATCH_QUERY = 5
/** The id prefix of an address the customer typed rather than picked. */
export const TYPED_PREFIX = "typed:"

export const isTypedPlace = (id: string) => id.startsWith(TYPED_PREFIX)

/** A Google suggestion carries no zip until its details are fetched; a typed address and the fixture are complete as they are. */
export const needsDetails = (place: PlaceSuggestion) => place.zip === "" && !isTypedPlace(place.id)

const squash = (text: string) => text.trim().replace(/\s+/g, " ")

/** The address as the customer typed it in the three fields: the same shape as a picked one, so the checkout treats it the same. */
export function typedPlace(line1: string, city: string, zip = ""): PlaceSuggestion {
  const street = squash(line1)
  const town = squash(city)
  const code = zip.trim()
  return {
    id: `${TYPED_PREFIX}${street.toLowerCase()}|${town.toLowerCase()}|${code}`,
    label: `${street}, ${town}, CO${code ? ` ${code}` : ""}`,
    line1: street,
    town,
    state: "CO",
    zip: code,
  }
}

export const SERVICE_TOWNS: readonly Town[] = ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"]

/**
 * USPS zip codes of the six towns: the ZIP decides whether Trailhead serves a
 * yard (a county address with an Erie mailing address carries the Erie zip).
 * Ryan confirms this list before the checkout or the booking form goes live
 * (wiring plan, Phase 8).
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

/** Five digits: a ZIP code a person can have typed or a provider can have answered. */
export const isZip = (zip: string) => /^\d{5}$/.test(zip.trim())

/**
 * Whether Trailhead serves the address. **The ZIP decides** (Hannah, Nov 22 2026: "we are validating the city by ZIP code, that's our region"): a ZIP in `SERVICE_ZIPS` is served and gives the town,
 * any other ZIP is outside, whatever the city says. Only an address with no ZIP yet (a Google suggestion before its details answer) falls back to the town name in Colorado for the moment the
 * details take to come. `SERVICE_ZIPS` is still to be confirmed by Ryan.
 */
export function serviceability(place: Pick<PlaceSuggestion, "town" | "state" | "zip">): Serviceability {
  const zip = place.zip.trim()
  if (isZip(zip)) {
    const byZip = SERVICE_ZIPS[zip]
    if (byZip) return { ok: true, town: byZip }
    const city = place.state && place.state !== "CO" ? `${place.town}, ${place.state}` : place.town
    return { ok: false, place: city.trim() || zip }
  }
  const town = SERVICE_TOWNS.find((t) => t.toLowerCase() === place.town.trim().toLowerCase())
  if (town && place.state === "CO") return { ok: true, town }
  return { ok: false, place: place.town || "that address" }
}

/**
 * The quiet error for a typed address whose city is not the town of its ZIP ("ZIP 80516 is in Erie."), or null when they agree, the ZIP is not one we serve (that is the out-of-area line), or no city
 * has been typed. A picked address is never checked: the provider's own city is not ours to second-guess.
 */
export function zipCityMismatch(place: Pick<PlaceSuggestion, "id" | "town" | "zip">): string | null {
  const town = SERVICE_ZIPS[place.zip.trim()]
  if (!isTypedPlace(place.id) || !town || place.town.trim() === "") return null
  return place.town.trim().toLowerCase() === town.toLowerCase() ? null : `ZIP ${place.zip.trim()} is in ${town}.`
}

export const SERVICE_AREA_SENTENCE = "We work in Erie, Longmont, Louisville, Lafayette, Firestone and Broomfield."

/** The line under the box when the picked address is outside the six towns. */
export function outOfAreaMessage(s: Extract<Serviceability, { ok: false }>): string {
  return `We don't serve ${s.place} yet. ${SERVICE_AREA_SENTENCE}`
}
