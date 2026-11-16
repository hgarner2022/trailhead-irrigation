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
export function typedPlace(line1: string, town: Town, zip = ""): PlaceSuggestion {
  const street = squash(line1)
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
