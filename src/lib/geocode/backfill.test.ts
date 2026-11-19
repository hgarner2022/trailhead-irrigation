// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ORG } from "@/api/test-helpers"
import { enqueueMissingGeocodes, geocodeProperty, GEOCODE_BACKFILL_LIMIT } from "./index"
import { autocomplete, placePoint } from "@/lib/places/google-server"

let db: TestDb
const answer = (rows: unknown[]) => vi.fn(async () => new Response(JSON.stringify(rows), { status: 200 })) as unknown as typeof fetch
const pending = () => db.select().from(s.queueItem).where(eq(s.queueItem.kind, "geocode"))

beforeAll(async () => {
  db = await apiDb()
  await db.update(s.property).set({ lat: null, lng: null, geocodedAt: null }).where(eq(s.property.organizationId, ORG))
})
afterAll(() => db.close())

describe("the backfill of points", () => {
  it("queues a lookup for properties with no point, at most 50 a pass, and again queues nothing new", async () => {
    const total = (await db.select({ id: s.property.id }).from(s.property)).length
    expect(total).toBeGreaterThan(0)
    const first = await enqueueMissingGeocodes(db, new Date("2027-04-20T15:00:00Z"))
    expect(first).toBe(Math.min(total, GEOCODE_BACKFILL_LIMIT))
    expect(await enqueueMissingGeocodes(db, new Date("2027-04-20T15:00:00Z"), 1000)).toBe(Math.max(0, total - first))
    expect(await enqueueMissingGeocodes(db, new Date("2027-04-20T15:00:00Z"), 1000)).toBe(0)
    expect((await pending()).length).toBe(total)
  })

  it("a limit of two queues two", async () => {
    await db.delete(s.queueItem).where(eq(s.queueItem.kind, "geocode"))
    expect(await enqueueMissingGeocodes(db, new Date("2027-04-20T15:00:00Z"), 2)).toBe(Math.min(2, (await db.select({ id: s.property.id }).from(s.property)).length))
  })
})

describe("the Places point", () => {
  const prediction = { suggestions: [{ placePrediction: { placeId: "ChIJa", text: { text: "9 Elm St, Erie, CO, USA" }, structuredFormat: { mainText: { text: "9 Elm St" }, secondaryText: { text: "Erie, CO, USA" } } } }] }
  const details = { id: "ChIJa", formattedAddress: "9 Elm St, Erie, CO", location: { latitude: 40.05, longitude: -105.05 } }
  const fetchFn = () => vi.fn(async (url: string) => new Response(JSON.stringify(String(url).includes("autocomplete") ? prediction : details), { status: 200 })) as unknown as typeof fetch

  it("reads the point from the details call, through the fixture fetch, never Google", async () => {
    const f = fetchFn()
    expect(await placePoint({ key: "test-key", fetchFn: f }, "9 Elm St, Erie, CO, USA")).toEqual({ lat: 40.05, lng: -105.05 })
    expect(vi.mocked(f).mock.calls.map((c) => String(c[0]))).toEqual(["https://places.googleapis.com/v1/places:autocomplete", "https://places.googleapis.com/v1/places/ChIJa"])
    expect((vi.mocked(f).mock.calls[1]![1] as { headers: Record<string, string> }).headers["X-Goog-FieldMask"]).toContain("location")
  })

  it("answers null when nothing matches", async () => {
    expect(await placePoint({ key: "test-key", fetchFn: answer([]) }, "nowhere")).toBeNull()
    expect(await autocomplete({ key: "test-key", fetchFn: answer([]) }, "x")).toEqual([])
  })

  it("geocodeProperty prefers the Places point and falls back to Nominatim on a miss", async () => {
    const ids = (await db.select({ id: s.property.id }).from(s.property)).map((r) => r.id)
    vi.stubEnv("GEOCODE_CONTACT", "hello@example.com")
    const nominatim = answer([{ lat: "39.9", lon: "-105.0" }])
    expect(await geocodeProperty(db, ids[0]!, { places: async () => ({ lat: 40.05, lng: -105.05 }), fetch: nominatim })).toEqual({ lat: 40.05, lng: -105.05 })
    expect(nominatim).not.toHaveBeenCalled()
    expect(await geocodeProperty(db, ids[1]!, { places: async () => null, fetch: nominatim, sleep: async () => {} })).toEqual({ lat: 39.9, lng: -105 })
  })
})
