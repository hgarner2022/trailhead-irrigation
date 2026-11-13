// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ORG } from "@/api/test-helpers"
import { drain } from "@/lib/queue"
import { handlers } from "@/lib/queue/handlers"
import { enqueueGeocode, geocodeProperty, mapPoint } from "./index"
import { resetThrottle, searchAddress } from "./nominatim"

let db: TestDb
let ids: string[]
const answer = (rows: unknown[], status = 200) => vi.fn(async () => new Response(JSON.stringify(rows), { status })) as unknown as typeof fetch
const prop = (id: string) => db.select().from(s.property).where(eq(s.property.id, id)).then((r) => r[0]!)

beforeAll(async () => {
  db = await apiDb()
  ids = (await db.select({ id: s.property.id }).from(s.property)).map((r) => r.id).slice(0, 3)
  await db.update(s.property).set({ lat: null, lng: null, geocodedAt: null }).where(eq(s.property.organizationId, ORG))
})
beforeEach(() => { vi.stubEnv("GEOCODE_CONTACT", "hello@example.com"); resetThrottle() })
afterAll(() => db.close())

describe("searchAddress", () => {
  it("asks Nominatim for one result with a User-Agent naming the site and a contact", async () => {
    const fetchStub = answer([{ lat: "40.05", lon: "-105.05" }])
    expect(await searchAddress("12 Main St, Erie, CO, USA", { fetch: fetchStub })).toEqual({ lat: 40.05, lng: -105.05 })
    const [url, init] = vi.mocked(fetchStub).mock.calls[0]!
    const u = new URL(String(url))
    expect(u.origin + u.pathname).toBe("https://nominatim.openstreetmap.org/search")
    expect(Object.fromEntries(u.searchParams)).toEqual({ format: "jsonv2", q: "12 Main St, Erie, CO, USA", limit: "1" })
    expect((init!.headers as Record<string, string>)["user-agent"]).toBe("trailheadirrigation.com (hello@example.com)")
  })
  it("waits so two lookups are at least a second apart", async () => {
    const sleeps: number[] = []
    let now = 10_000
    const deps = { fetch: answer([]), sleep: async (ms: number) => { sleeps.push(ms); now += ms }, clock: () => now }
    await searchAddress("a", deps)
    now += 300
    await searchAddress("b", deps)
    expect(sleeps).toEqual([700])
  })
  it("returns null for no match and throws on an error so the queue retries", async () => {
    expect(await searchAddress("nowhere", { fetch: answer([]) })).toBeNull()
    await expect(searchAddress("x", { fetch: answer([], 429) })).rejects.toThrow("429")
  })
})

describe("geocodeProperty", () => {
  it("stores the point once and never asks again", async () => {
    const fetchStub = answer([{ lat: "40.01", lon: "-105.1" }])
    const [id] = ids
    expect(await geocodeProperty(db, id!, { fetch: fetchStub })).toEqual({ lat: 40.01, lng: -105.1 })
    const row = await prop(id!)
    expect(row.lat).toBeCloseTo(40.01)
    expect(row.geocodedAt).toBeInstanceOf(Date)
    expect(await geocodeProperty(db, id!, { fetch: fetchStub })).toEqual({ lat: row.lat, lng: row.lng })
    expect(fetchStub).toHaveBeenCalledTimes(1)
  })
  it("caches a miss as a null pair with geocoded_at set", async () => {
    const fetchStub = answer([])
    expect(await geocodeProperty(db, ids[1]!, { fetch: fetchStub })).toBeNull()
    expect(await prop(ids[1]!)).toMatchObject({ lat: null, lng: null })
    expect((await prop(ids[1]!)).geocodedAt).not.toBeNull()
    await geocodeProperty(db, ids[1]!, { fetch: fetchStub })
    expect(fetchStub).toHaveBeenCalledTimes(1)
  })
  it("puts the address, town, state and country in the query", async () => {
    const p = await prop(ids[2]!)
    const fetchStub = answer([])
    await geocodeProperty(db, ids[2]!, { fetch: fetchStub })
    expect(new URL(String(vi.mocked(fetchStub).mock.calls[0]![0])).searchParams.get("q")).toBe(`${p.address}, ${p.town}, CO, USA`)
  })
})

describe("the geocode queue", () => {
  it("spaces queued lookups a second apart and skips a property that has a point", async () => {
    const free = (await db.select({ id: s.property.id }).from(s.property).where(eq(s.property.organizationId, ORG))).map((r) => r.id).filter((id) => !ids.includes(id)).slice(0, 2)
    const now = new Date("2027-04-20T15:00:00Z")
    expect(await enqueueGeocode(db, ORG, free[0]!, now)).toBe(true)
    expect(await enqueueGeocode(db, ORG, free[1]!, now)).toBe(true)
    expect(await enqueueGeocode(db, ORG, ids[0]!, now)).toBe(false)
    const rows = await db.select().from(s.queueItem).where(and(eq(s.queueItem.kind, "geocode"), eq(s.queueItem.status, "pending")))
    expect(rows.map((r) => r.runAfter.getTime()).sort()).toEqual([now.getTime(), now.getTime() + 1000])
  })
  it("the handler geocodes the property in the payload", async () => {
    vi.stubGlobal("fetch", answer([{ lat: "39.9", lon: "-105.0" }]))
    const done = await drain(db, handlers, () => new Date("2030-01-01T00:00:00Z"))
    vi.unstubAllGlobals()
    expect(done.done).toBe(2)
  })
})

describe("mapPoint", () => {
  it("falls back to the town centre, flagged inexact, when there is no point", () => {
    expect(mapPoint({ lat: 40.1, lng: -105.2, town: "Erie" })).toEqual({ lat: 40.1, lng: -105.2, exact: true })
    expect(mapPoint({ lat: null, lng: null, town: "Erie" })).toEqual({ lat: 40.05, lng: -105.05, exact: false })
  })
})
