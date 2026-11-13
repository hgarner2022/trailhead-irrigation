/**
 * The address provider for stories and the prototype: fourteen addresses,
 * nine in the six towns and five outside, matched on the words typed. Street
 * numbers are invented. The real provider (Google Places behind
 * `/api/v1/places/suggest`) replaces it in the wiring plan's Phase 8.
 */
import { MIN_QUERY, type PlaceProvider, type PlaceSuggestion } from "./index"

function place(line1: string, town: string, zip: string, state = "CO"): PlaceSuggestion {
  return { id: `${line1} ${zip}`.toLowerCase().replace(/\W+/g, "-"), label: `${line1}, ${town}, ${state} ${zip}`, line1, town, state, zip }
}

export const FIXTURE_PLACES: readonly PlaceSuggestion[] = [
  place("123 Trailhead Way", "Erie", "80516"),
  place("480 Briggs St", "Erie", "80516"),
  place("1250 Vivian St", "Longmont", "80501"),
  place("2100 Nelson Rd", "Longmont", "80503"),
  place("950 Spruce St", "Louisville", "80027"),
  place("311 S Public Rd", "Lafayette", "80026"),
  place("8200 Colorado Blvd", "Firestone", "80520"),
  place("1 DesCombes Dr", "Broomfield", "80020"),
  place("14000 Lowell Blvd", "Broomfield", "80023"),
  place("1200 Pearl St", "Boulder", "80302"),
  place("7300 Lowell Blvd", "Westminster", "80030"),
  place("100 N College Ave", "Fort Collins", "80524"),
  place("1600 Broadway", "Denver", "80202"),
  place("1 Riverfront Plaza", "Louisville", "40202", "KY"),
]

/** The first address, the one stories and tests pick. */
export const FIXTURE_HOME = FIXTURE_PLACES[0]

/** Matches when every word typed starts a word of the address; at most `limit`. */
export function matchPlaces(query: string, places: readonly PlaceSuggestion[] = FIXTURE_PLACES, limit = 5): PlaceSuggestion[] {
  if (query.trim().length < MIN_QUERY) return []
  const words = query.toLowerCase().split(/[\s,]+/).filter(Boolean)
  return places
    .filter((p) => {
      const target = p.label.toLowerCase().split(/[\s,]+/)
      return words.every((w) => target.some((t) => t.startsWith(w)))
    })
    .slice(0, limit)
}

/** Answers after a short wait, like a real lookup, and honours the abort signal. */
export const fixturePlaces: PlaceProvider = (query, signal) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(matchPlaces(query)), 120)
    signal?.addEventListener("abort", () => {
      clearTimeout(timer)
      reject(new DOMException("Aborted", "AbortError"))
    })
  })
