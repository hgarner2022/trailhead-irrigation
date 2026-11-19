// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"
import { GET } from "./route"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const call = (query: string) => GET(new Request(`https://x.test/api/places?${query}`))
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

const prediction = (placeId: string, main: string, secondary: string) => ({
  placePrediction: { placeId, text: { text: `${main}, ${secondary}` }, structuredFormat: { mainText: { text: main }, secondaryText: { text: secondary } } },
})

const details = {
  id: "ChIJbriggs",
  formattedAddress: "480 Briggs St, Erie, CO 80516, USA",
  addressComponents: [
    { longText: "480", shortText: "480", types: ["street_number"] },
    { longText: "Briggs Street", shortText: "Briggs St", types: ["route"] },
    { longText: "Erie", shortText: "Erie", types: ["locality", "political"] },
    { longText: "Weld County", shortText: "Weld County", types: ["administrative_area_level_2", "political"] },
    { longText: "Colorado", shortText: "CO", types: ["administrative_area_level_1", "political"] },
    { longText: "United States", shortText: "US", types: ["country", "political"] },
    { longText: "80516", shortText: "80516", types: ["postal_code"] },
  ],
}

describe("GET /api/places", () => {
  it("answers no suggestions and a 404 for details while the key is unset, without calling Google", async () => {
    const fetchFn = vi.fn()
    vi.stubGlobal("fetch", fetchFn)
    const found = await call("q=480+Briggs")
    expect(found.status).toBe(200)
    expect(await found.json()).toEqual([])
    expect((await call("id=ChIJbriggs")).status).toBe(404)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it("answers no suggestions for a short query without calling Google", async () => {
    vi.stubEnv("GOOGLE_PLACES_KEY", "k")
    const fetchFn = vi.fn()
    vi.stubGlobal("fetch", fetchFn)
    expect(await (await call("q=48")).json()).toEqual([])
    expect(await (await call("q=")).json()).toEqual([])
    expect(await (await call("")).json()).toEqual([])
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it("turns Google's predictions into suggestions, five at most, with the town and state from the secondary text and no zip yet", async () => {
    vi.stubEnv("GOOGLE_PLACES_KEY", "k")
    vi.stubEnv("APP_URL", "https://preview.test/")
    const fetchFn = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("https://places.googleapis.com/v1/places:autocomplete")
      expect(init.method).toBe("POST")
      expect(init.headers).toMatchObject({ "X-Goog-Api-Key": "k", Referer: "https://preview.test/" })
      const body = JSON.parse(init.body as string)
      expect(body).toEqual({
        input: "480 Briggs",
        includedRegionCodes: ["us"],
        includedPrimaryTypes: ["street_address", "premise", "subpremise"],
        locationBias: { circle: { center: { latitude: 40.05, longitude: -105.05 }, radius: 40000 } },
      })
      return json({
        suggestions: [
          prediction("ChIJa", "480 Briggs St", "Erie, CO, USA"),
          { queryPrediction: { text: { text: "480 briggs" } } },
          prediction("ChIJb", "480 Briggs Ave", "Louisville, KY, USA"),
          prediction("ChIJc", "480 Briggs Ct", "Longmont, CO, USA"),
          prediction("ChIJd", "480 Briggs Dr", "Lafayette, CO, USA"),
          prediction("ChIJe", "480 Briggs Ln", "Firestone, CO, USA"),
          prediction("ChIJf", "480 Briggs Pl", "Broomfield, CO, USA"),
          prediction("ChIJg", "480 Briggs Way", "Erie, CO, USA"),
        ],
      })
    })
    vi.stubGlobal("fetch", fetchFn)
    const response = await call("q=480+Briggs")
    expect(response.headers.get("cache-control")).toBe("no-store")
    const found = await response.json()
    expect(found).toHaveLength(5)
    expect(found[0]).toEqual({ id: "ChIJa", label: "480 Briggs St, Erie, CO, USA", line1: "480 Briggs St", town: "Erie", state: "CO", zip: "" })
    expect(found[1]).toMatchObject({ id: "ChIJb", town: "Louisville", state: "KY" })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it("answers the whole address for a place id, with the zip", async () => {
    vi.stubEnv("GOOGLE_PLACES_KEY", "k")
    const fetchFn = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("https://places.googleapis.com/v1/places/ChIJbriggs")
      expect(init.headers).toMatchObject({ "X-Goog-Api-Key": "k", "X-Goog-FieldMask": "id,formattedAddress,addressComponents,location", Referer: "https://www.trailheadirrigation.com/" })
      return json(details)
    })
    vi.stubGlobal("fetch", fetchFn)
    const response = await call("id=ChIJbriggs")
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: "ChIJbriggs", label: "480 Briggs Street, Erie, CO 80516", line1: "480 Briggs Street", town: "Erie", state: "CO", zip: "80516" })
  })

  it("answers 404 for an id Google does not know or that is not a place id", async () => {
    vi.stubEnv("GOOGLE_PLACES_KEY", "k")
    const fetchFn = vi.fn(async () => json({ error: { code: 404 } }, 404))
    vi.stubGlobal("fetch", fetchFn)
    expect((await call("id=ChIJnope")).status).toBe(404)
    expect((await call("id=../../etc")).status).toBe(404)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it("answers nothing and warns once, without the key or the query, when Google answers an error or the call fails", async () => {
    vi.stubEnv("GOOGLE_PLACES_KEY", "secret-key")
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: "denied" }, 403)))
    expect(await (await call("q=480+Briggs+St")).json()).toEqual([])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.join(" ")).not.toMatch(/secret-key|Briggs/)
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed") }))
    expect(await (await call("q=480+Briggs+St")).json()).toEqual([])
    expect((await call("id=ChIJbriggs")).status).toBe(404)
    expect(warn).toHaveBeenCalledTimes(3)
    expect(warn.mock.calls.flat().join(" ")).not.toMatch(/secret-key|Briggs/)
  })
})
