import { afterEach, describe, expect, it, vi } from "vitest"
import { isTypedPlace, needsDetails, serviceability, typedPlace } from "./index"
import { parseSecondaryText, suggestionFromDetails, suggestionFromPrediction } from "./google-server"
import { googlePlaceDetails, googlePlaces } from "./google"

afterEach(() => vi.unstubAllGlobals())

describe("typedPlace", () => {
  it("builds the same shape as a picked address, with a typed id, Colorado and the zip when given", () => {
    const place = typedPlace("  480   Briggs St ", "Erie", "80516")
    expect(place).toEqual({ id: "typed:480 briggs st|erie|80516", label: "480 Briggs St, Erie, CO 80516", line1: "480 Briggs St", town: "Erie", state: "CO", zip: "80516" })
    expect(typedPlace("9 Elm St", "Longmont")).toMatchObject({ id: "typed:9 elm st|longmont|", label: "9 Elm St, Longmont, CO", zip: "" })
    expect(isTypedPlace(place.id)).toBe(true)
    expect(serviceability(place)).toEqual({ ok: true, town: "Erie" })
  })

  it("needs no details, unlike a Google suggestion without a zip", () => {
    expect(needsDetails(typedPlace("9 Elm St", "Erie"))).toBe(false)
    expect(needsDetails({ id: "ChIJa", label: "9 Elm St, Erie, CO, USA", line1: "9 Elm St", town: "Erie", state: "CO", zip: "" })).toBe(true)
    expect(needsDetails({ id: "ChIJa", label: "9 Elm St, Erie, CO 80516", line1: "9 Elm St", town: "Erie", state: "CO", zip: "80516" })).toBe(false)
  })
})

describe("parseSecondaryText", () => {
  it("reads the town and the state off Google's secondary text", () => {
    expect(parseSecondaryText("Erie, CO, USA")).toEqual({ town: "Erie", state: "CO" })
    expect(parseSecondaryText("Erie, CO")).toEqual({ town: "Erie", state: "CO" })
    expect(parseSecondaryText("Old Town, Erie, CO, USA")).toEqual({ town: "Old Town, Erie", state: "CO" })
    expect(parseSecondaryText("Louisville, KY, USA")).toEqual({ town: "Louisville", state: "KY" })
    expect(parseSecondaryText("CO, USA")).toEqual({ town: "", state: "CO" })
    expect(parseSecondaryText("Erie")).toEqual({ town: "Erie", state: "" })
    expect(parseSecondaryText("")).toEqual({ town: "", state: "" })
  })

  it("maps a prediction and a details answer, and skips one without an id", () => {
    expect(suggestionFromPrediction({ placeId: "ChIJa", text: { text: "9 Elm St, Erie, CO, USA" }, structuredFormat: { mainText: { text: "9 Elm St" }, secondaryText: { text: "Erie, CO, USA" } } })).toEqual({
      id: "ChIJa",
      label: "9 Elm St, Erie, CO, USA",
      line1: "9 Elm St",
      town: "Erie",
      state: "CO",
      zip: "",
    })
    expect(suggestionFromPrediction({ text: { text: "9 Elm St" } })).toBeNull()
    expect(suggestionFromDetails({})).toBeNull()
    expect(
      suggestionFromDetails({
        id: "ChIJa",
        formattedAddress: "9 Elm St, Erie, CO 80516, USA",
        addressComponents: [
          { longText: "9", shortText: "9", types: ["street_number"] },
          { longText: "Elm Street", shortText: "Elm St", types: ["route"] },
          { longText: "Vista Ridge", shortText: "Vista Ridge", types: ["neighborhood", "political"] },
          { longText: "Colorado", shortText: "CO", types: ["administrative_area_level_1", "political"] },
          { longText: "80516", shortText: "80516", types: ["postal_code"] },
        ],
      }),
    ).toEqual({ id: "ChIJa", label: "9 Elm Street, Vista Ridge, CO 80516", line1: "9 Elm Street", town: "Vista Ridge", state: "CO", zip: "80516" })
  })
})

describe("googlePlaces", () => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

  it("asks the route and passes the abort signal along; a short query asks nothing", async () => {
    const fetchFn = vi.fn(async () => json([{ id: "ChIJa", label: "9 Elm St, Erie, CO, USA", line1: "9 Elm St", town: "Erie", state: "CO", zip: "" }]))
    vi.stubGlobal("fetch", fetchFn)
    const controller = new AbortController()
    await expect(googlePlaces(" 9 Elm ", controller.signal)).resolves.toHaveLength(1)
    expect(fetchFn).toHaveBeenCalledWith("/api/places?q=9%20Elm", { signal: controller.signal })
    await expect(googlePlaces("9 ")).resolves.toEqual([])
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it("throws when the route answers an error, so the box shows its lookup line", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: "x" }, 500)))
    await expect(googlePlaces("9 Elm St")).rejects.toThrow("500")
  })

  it("fetches a suggestion's details and answers null when the route has none", async () => {
    const full = { id: "ChIJa", label: "9 Elm St, Erie, CO 80516", line1: "9 Elm St", town: "Erie", state: "CO", zip: "80516" }
    const fetchFn = vi.fn(async (url: string) => (url.includes("ChIJa") ? json(full) : json({ error: "No such address" }, 404)))
    vi.stubGlobal("fetch", fetchFn)
    await expect(googlePlaceDetails("ChIJa")).resolves.toEqual(full)
    expect(fetchFn).toHaveBeenCalledWith("/api/places?id=ChIJa", { signal: undefined })
    await expect(googlePlaceDetails("ChIJb")).resolves.toBeNull()
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed") }))
    await expect(googlePlaceDetails("ChIJa")).resolves.toBeNull()
  })
})
