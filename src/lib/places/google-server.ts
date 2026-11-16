/**
 * Google Places API (New) behind `/api/places`: autocomplete for the type-ahead
 * and place details for the zip. The key is handed in by the route, never
 * read here, and nothing about the customer's query is ever logged. The
 * parsing is pure so the route's tests can feed it Google's shapes.
 */
import type { PlaceSuggestion } from "./index"

const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete"
const DETAILS_URL = "https://places.googleapis.com/v1/places/"
/** Suggestions are biased to a 40 km circle around the six towns. */
const AREA = { center: { latitude: 40.05, longitude: -105.05 }, radius: 40000 }
export const MAX_SUGGESTIONS = 5
/** Google place ids: letters, digits, underscore and hyphen. */
export const PLACE_ID = /^[\w-]{1,300}$/

export type Fetch = typeof fetch

export interface Prediction {
  placeId?: string
  text?: { text?: string }
  structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } }
}

export interface AddressComponent {
  longText?: string
  shortText?: string
  types?: string[]
}

export interface PlaceDetails {
  id?: string
  formattedAddress?: string
  addressComponents?: AddressComponent[]
}

/** "Erie, CO, USA" as the town and the two-letter state; "Erie, CO" the same; a bare "CO, USA" gives no town. */
export function parseSecondaryText(text: string): { town: string; state: string } {
  const parts = text.split(",").map((p) => p.trim()).filter(Boolean)
  const country = /^(usa|us|united states)$/i
  const inCountry = parts.length >= 1 && country.test(parts.at(-1) ?? "") ? parts.slice(0, -1) : parts
  if (inCountry.length === 0) return { town: "", state: "" }
  if (inCountry.length === 1) return /^[A-Z]{2}$/.test(inCountry[0]!) ? { town: "", state: inCountry[0]! } : { town: inCountry[0]!, state: "" }
  return { town: inCountry.slice(0, -1).join(", "), state: inCountry.at(-1) ?? "" }
}

/** One autocomplete prediction as the box lists it: no zip yet, the details call gives that. */
export function suggestionFromPrediction(p: Prediction): PlaceSuggestion | null {
  if (!p.placeId) return null
  const line1 = p.structuredFormat?.mainText?.text ?? p.text?.text ?? ""
  const { town, state } = parseSecondaryText(p.structuredFormat?.secondaryText?.text ?? "")
  return { id: p.placeId, label: p.text?.text ?? line1, line1, town, state, zip: "" }
}

const component = (components: AddressComponent[], type: string, short = false) => {
  const found = components.find((c) => c.types?.includes(type))
  return (short ? found?.shortText : found?.longText) ?? ""
}

/** A place's details as the whole address: street number and route, the town, the state and the zip. */
export function suggestionFromDetails(place: PlaceDetails): PlaceSuggestion | null {
  if (!place.id) return null
  const parts = place.addressComponents ?? []
  const line1 = [component(parts, "street_number"), component(parts, "route")].filter(Boolean).join(" ")
  const town = component(parts, "locality") || component(parts, "sublocality") || component(parts, "neighborhood")
  const state = component(parts, "administrative_area_level_1", true)
  const zip = component(parts, "postal_code")
  const label = line1 && town ? `${line1}, ${town}, ${state}${zip ? ` ${zip}` : ""}` : (place.formattedAddress ?? line1)
  return { id: place.id, label, line1: line1 || (place.formattedAddress ?? ""), town, state, zip }
}

/** One warning, naming the call and the status only: never the key, never what the customer typed. */
const warn = (call: string, status: number | string) => console.warn(`Google Places ${call} answered ${status}`)

/** Up to five street addresses for what the customer typed, in the US, biased to the six towns. An error answers none. */
export async function autocomplete(key: string, input: string, fetchFn: Fetch = fetch): Promise<PlaceSuggestion[]> {
  try {
    const response = await fetchFn(AUTOCOMPLETE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
      body: JSON.stringify({ input, includedRegionCodes: ["us"], includedPrimaryTypes: ["street_address", "premise", "subpremise"], locationBias: { circle: AREA } }),
    })
    if (!response.ok) {
      warn("autocomplete", response.status)
      return []
    }
    const body = (await response.json()) as { suggestions?: { placePrediction?: Prediction }[] }
    return (body.suggestions ?? [])
      .map((s) => (s.placePrediction ? suggestionFromPrediction(s.placePrediction) : null))
      .filter((s): s is PlaceSuggestion => s !== null)
      .slice(0, MAX_SUGGESTIONS)
  } catch (error) {
    warn("autocomplete", error instanceof Error ? error.name : "an error")
    return []
  }
}

/** The whole address behind a place id; null when Google has no such place or the call fails. */
export async function placeDetails(key: string, id: string, fetchFn: Fetch = fetch): Promise<PlaceSuggestion | null> {
  if (!PLACE_ID.test(id)) return null
  try {
    const response = await fetchFn(`${DETAILS_URL}${id}`, { headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "id,formattedAddress,addressComponents" } })
    if (!response.ok) {
      if (response.status !== 404) warn("details", response.status)
      return null
    }
    return suggestionFromDetails((await response.json()) as PlaceDetails)
  } catch (error) {
    warn("details", error instanceof Error ? error.name : "an error")
    return null
  }
}
