/**
 * The live address provider: asks the site's own `/api/places` route, which
 * holds the Google Places key. Client-safe, nothing secret here. Without a
 * key the route answers nothing, and the checkout opens its typed fields.
 */
import { MIN_QUERY, type PlaceProvider, type PlaceSuggestion } from "./index"

export const PLACES_ROUTE = "/api/places"

export const googlePlaces: PlaceProvider = async (query, signal) => {
  if (query.trim().length < MIN_QUERY) return []
  const response = await fetch(`${PLACES_ROUTE}?q=${encodeURIComponent(query.trim())}`, { signal })
  if (!response.ok) throw new Error(`Address lookup answered ${response.status}`)
  return (await response.json()) as PlaceSuggestion[]
}

/** The whole address behind a suggestion (its zip above all); null when the route cannot give it. Never throws. */
export async function googlePlaceDetails(id: string, signal?: AbortSignal): Promise<PlaceSuggestion | null> {
  try {
    const response = await fetch(`${PLACES_ROUTE}?id=${encodeURIComponent(id)}`, { signal })
    if (!response.ok) return null
    return (await response.json()) as PlaceSuggestion
  } catch {
    return null
  }
}
