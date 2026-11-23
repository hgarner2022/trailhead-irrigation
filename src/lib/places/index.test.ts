import { describe, it, expect } from "vitest"
import { outOfAreaMessage, serviceability, typedPlace, zipCityMismatch } from "./index"
import { FIXTURE_PLACES, fixturePlaces, matchPlaces } from "./fixture"

describe("serviceability", () => {
  it("is decided by the ZIP: a served ZIP gives its town whatever the city says", () => {
    expect(serviceability({ town: "Unincorporated Weld County", state: "CO", zip: "80516" })).toEqual({ ok: true, town: "Erie" })
    expect(serviceability({ town: "Boulder", state: "CO", zip: "80501" })).toEqual({ ok: true, town: "Longmont" })
  })

  it("refuses a ZIP we do not serve even when the city is one of ours", () => {
    expect(serviceability({ town: "Erie", state: "CO", zip: "80302" })).toEqual({ ok: false, place: "Erie" })
    expect(serviceability({ town: "", state: "CO", zip: "80302" })).toEqual({ ok: false, place: "80302" })
  })

  it("reads the town name only while there is no ZIP yet, which a Google suggestion has until its details answer", () => {
    expect(serviceability({ town: "erie", state: "CO", zip: "" })).toEqual({ ok: true, town: "Erie" })
    expect(serviceability({ town: "Broomfield", state: "CO", zip: "" })).toEqual({ ok: true, town: "Broomfield" })
    expect(serviceability({ town: "Boulder", state: "CO", zip: "" })).toEqual({ ok: false, place: "Boulder" })
  })

  it("checks a typed city against its ZIP and says so quietly; a picked address is never checked", () => {
    const typed = (town: string, zip: string) => typedPlace("9 Elm St", town, zip)
    expect(zipCityMismatch(typed("Longmont", "80516"))).toBe("ZIP 80516 is in Erie.")
    expect(zipCityMismatch(typed("erie", "80516"))).toBeNull()
    expect(zipCityMismatch(typed("Boulder", "80302"))).toBeNull()
    expect(zipCityMismatch(typed("", "80516"))).toBeNull()
    expect(zipCityMismatch({ id: "ChIJ", town: "Frederick", zip: "80516" })).toBeNull()
  })

  it("refuses other towns, and the same name in another state", () => {
    expect(serviceability({ town: "Boulder", state: "CO", zip: "80302" })).toEqual({ ok: false, place: "Boulder" })
    expect(serviceability({ town: "Louisville", state: "KY", zip: "40202" })).toEqual({ ok: false, place: "Louisville, KY" })
    expect(outOfAreaMessage({ ok: false, place: "Boulder" })).toBe("We don't serve Boulder yet. We work in Erie, Longmont, Louisville, Lafayette, Firestone and Broomfield.")
  })
})

describe("fixture provider", () => {
  it("matches every typed word against the start of a word in the address, after three characters", () => {
    expect(matchPlaces("12")).toEqual([])
    expect(matchPlaces("123 tr").map((p) => p.line1)).toEqual(["123 Trailhead Way"])
    expect(matchPlaces("lowell").map((p) => p.town)).toEqual(["Broomfield", "Westminster"])
    expect(matchPlaces("Louisville").map((p) => p.state)).toEqual(["CO", "KY"])
    expect(matchPlaces("1", FIXTURE_PLACES, 3)).toEqual([])
    expect(matchPlaces("1 ", FIXTURE_PLACES, 3)).toEqual([])
    expect(matchPlaces("100", FIXTURE_PLACES, 3)).toHaveLength(1)
  })

  it("answers after a wait and rejects when aborted", async () => {
    await expect(fixturePlaces("480 Br")).resolves.toHaveLength(1)
    const controller = new AbortController()
    const pending = fixturePlaces("480 Br", controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: "AbortError" })
  })
})
