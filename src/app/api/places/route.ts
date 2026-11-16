import { NextResponse } from "next/server"
import { readOptionalEnv } from "@/lib/env"
import { MIN_QUERY } from "@/lib/places"
import { autocomplete, placeDetails } from "@/lib/places/google-server"

// The checkout's address lookup. `?q=` answers up to five suggestions from
// Google Places, `?id=` the whole address behind one of them. The key stays
// here on the server; without it `q` answers none and `id` answers 404, and
// the checkout falls back to its typed fields. Nothing is cached or stored.

const MAX_QUERY = 200
const NO_STORE = { "Cache-Control": "no-store" }

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const key = readOptionalEnv("GOOGLE_PLACES_KEY")
  const id = params.get("id")
  if (id !== null) {
    const place = key ? await placeDetails(key, id) : null
    return place ? NextResponse.json(place, { headers: NO_STORE }) : NextResponse.json({ error: "No such address" }, { status: 404, headers: NO_STORE })
  }
  const q = (params.get("q") ?? "").trim().slice(0, MAX_QUERY)
  const found = key && q.length >= MIN_QUERY ? await autocomplete(key, q) : []
  return NextResponse.json(found, { headers: NO_STORE })
}
